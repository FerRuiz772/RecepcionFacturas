/**
 * Servicio de notificaciones por WhatsApp para facturas en PayQuetzal
 * 
 * Gestiona el envío automatizado de notificaciones durante el ciclo de vida de las facturas
 * Proporciona mensajes de texto formateados y manejo de múltiples destinatarios según el evento
 * 
 * Tipos de notificaciones:
 * - Factura subida: Confirma recepción al proveedor + notifica a contaduría
 * - Factura asignada: Notifica al contador asignado
 * - Cambio de estado: Informa a todos los involucrados sobre cambios
 * - Rechazo: Explica motivos de rechazo al proveedor
 * - Aprobación: Confirma aprobación para pago
 * - Pago completado: Notifica finalización del proceso
 * - Contraseña generada: Envía contraseña de descarga
 * - Documentos: Notifica subida o reemplazo de documentos
 * 
 * Características:
 * - Mensajes de texto con emojis y formato estructurado
 * - Información contextual específica por tipo de evento
 * - Links directos al sistema para acciones rápidas
 * - Manejo de errores robusto con logging detallado
 * - Soporte para múltiples destinatarios simultáneos con delay anti-spam
 */

const whatsappService = require('./whatsappService');
const { User, Supplier } = require('../models');
const { delay } = require('@whiskeysockets/baileys');

/**
 * Clase principal del servicio de notificaciones de facturas por WhatsApp
 * Centraliza toda la lógica de comunicación por WhatsApp relacionada con facturas
 */
class InvoiceWhatsAppNotificationService {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    // Mensaje estándar para todas las notificaciones
    this.AUTO_RESPONSE_DISCLAIMER = '\n\n⚠️ *Nota importante:* Por favor responde dentro de la página PayQuetzal, no por WhatsApp. Este es un mensaje automático.';
    console.log(`🔧 InvoiceWhatsAppNotificationService initialized with base URL: ${baseUrl}`);
  }

  /**
   * Extrae el teléfono del usuario desde profile_data
   * @param {Object} user - Usuario con profile_data
   * @returns {string|null} Número de teléfono o null
   */
  getUserPhone(user) {
    if (!user) return null;
    
    try {
      // Si profile_data ya es un objeto
      if (typeof user.profile_data === 'object' && user.profile_data?.phone) {
        return user.profile_data.phone;
      }
      
      // Si profile_data es string JSON
      if (typeof user.profile_data === 'string') {
        const profileData = JSON.parse(user.profile_data);
        return profileData?.phone || null;
      }
      
      // Si el teléfono está directamente en el usuario (compatibilidad)
      if (user.phone) {
        return user.phone;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error extrayendo teléfono del usuario:`, error);
      return null;
    }
  }

  // Formatea fechas usando la zona horaria de Guatemala
  formatGuatemalaDateTime(date = new Date(), opts = {}) {
    const options = Object.assign({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }, opts);
    try {
      return new Intl.DateTimeFormat('es-GT', Object.assign({ timeZone: 'America/Guatemala' }, options)).format(new Date(date));
    } catch (e) {
      return new Date(date).toLocaleString();
    }
  }

  /**
   * Notifica cuando se sube una nueva factura al sistema
   * Envía confirmación al proveedor y alerta a la contaduría asignada
   * 
   * @param {Object} invoice - Datos de la factura subida
   * @param {Object} supplier - Información del proveedor emisor
   * @param {Object} assignedUser - Usuario de contaduría asignado para procesamiento
   */
  async notifyInvoiceUploaded(invoice, supplier, assignedUser) {
    try {
      console.log(`🔍 [WhatsApp] notifyInvoiceUploaded iniciado para factura: ${invoice.number}`);
      
      // Buscar TODOS los usuarios proveedores ACTIVOS de este supplier
      const proveedorUsers = await User.findAll({
        where: { 
          supplier_id: supplier.id, 
          role: 'proveedor',
          is_active: true
        }
      });

      console.log(`🔍 [WhatsApp] Usuarios proveedores activos encontrados: ${proveedorUsers.length}`);

      // Buscar TODOS los admin de contaduría
      const adminsContaduria = await User.findAll({
        where: { role: 'admin_contaduria', is_active: true }
      });

      console.log(`🔍 [WhatsApp] Admins contaduría encontrados: ${adminsContaduria.length}`);

      // Notificar a TODOS los usuarios proveedores activos
      if (proveedorUsers.length > 0) {
        console.log(`📱 [WhatsApp] Enviando notificaciones a ${proveedorUsers.length} usuarios proveedores activos...`);
        for (const proveedorUser of proveedorUsers) {
          const phone = this.getUserPhone(proveedorUser);
          try {
            await this.sendInvoiceReceivedNotification(supplier, invoice, proveedorUser);
            await delay(3000); // Delay anti-spam entre mensajes
          } catch (error) {
            console.error(`❌ [WhatsApp] Error al enviar a proveedor ${phone}:`, error.message);
          }
        }
      }

      // Notificar al usuario asignado
      const assignedPhone = this.getUserPhone(assignedUser);
      if (assignedPhone) {
        console.log(`📱 [WhatsApp] Enviando notificación al usuario asignado: ${assignedPhone}`);
        try {
          await this.sendNewInvoiceAssignedNotification(assignedUser, invoice, supplier);
          await delay(3000);
        } catch (error) {
          console.error(`❌ [WhatsApp] Error al enviar a usuario asignado:`, error.message);
        }
      }

      // Notificar a TODOS los admin de contaduría
      if (adminsContaduria.length > 0) {
        console.log(`📱 [WhatsApp] Enviando notificaciones a ${adminsContaduria.length} admins de contaduría...`);
        for (const adminContaduria of adminsContaduria) {
          const adminPhone = this.getUserPhone(adminContaduria);
          try {
            await this.sendAdminNotificationInvoiceUploaded(adminContaduria, invoice, supplier, assignedUser);
            await delay(3000);
          } catch (error) {
            console.error(`❌ [WhatsApp] Error al enviar a admin ${adminPhone}:`, error.message);
          }
        }
      }

      console.log(`✅ [WhatsApp] Notificaciones enviadas para factura ${invoice.number}`);
    } catch (error) {
      console.error('❌ [WhatsApp] Error enviando notificaciones de factura subida:', error);
    }
  }

  /**
   * Notifica cambios de estado en el workflow de facturas
   * 
   * @param {Object} invoice - Datos de la factura que cambió
   * @param {string} fromStatus - Estado anterior de la factura  
   * @param {string} toStatus - Nuevo estado de la factura
   * @param {Object} changedBy - Usuario que realizó el cambio
   * @param {Object} supplier - Datos del proveedor emisor
   * @param {string} notes - Notas adicionales (ej. motivo de rechazo)
   */
  async notifyStatusChange(invoice, fromStatus, toStatus, changedBy, supplier, notes = null) {
    try {
      console.log(`📱 [WhatsApp] notifyStatusChange iniciado para factura: ${invoice.number}`);
      console.log(`📱 [WhatsApp] Cambio de estado: ${fromStatus} → ${toStatus}`);

      const statusMessages = {
        'asignada_contaduria': 'Tu factura ha sido asignada al departamento de contaduría',
        'en_proceso': 'Tu factura está siendo procesada',
        'contrasena_generada': 'Se ha generado la contraseña para tu factura',
        'retencion_isr_generada': 'Se ha generado la retención de ISR',
        'retencion_iva_generada': 'Se ha generado la retención de IVA',
        'pago_realizado': 'El pago de tu factura ha sido realizado',
        'proceso_completado': 'Tu factura ha sido completamente procesada',
        'rechazada': 'Tu factura ha sido rechazada'
      };

      const message = statusMessages[toStatus];
      
      if (message) {
        // Buscar usuarios proveedores activos
        const proveedorUsers = await User.findAll({
          where: { 
            supplier_id: supplier.id, 
            role: 'proveedor',
            is_active: true
          }
        });

        console.log(`🔍 [WhatsApp] Usuarios proveedores activos para notificación: ${proveedorUsers.length}`);

        // Notificar a TODOS los usuarios proveedores activos
        if (proveedorUsers.length > 0) {
          for (const proveedorUser of proveedorUsers) {
            try {
              await this.sendStatusChangeNotification(supplier, invoice, toStatus, message, changedBy, proveedorUser, notes);
              await delay(3000);
            } catch (error) {
              console.error(`❌ [WhatsApp] Error al enviar a ${proveedorUser.phone}:`, error.message);
            }
          }
        }
      }

      console.log(`✅ [WhatsApp] Notificación de cambio de estado completada`);
    } catch (error) {
      console.error('❌ [WhatsApp] Error enviando notificación de cambio de estado:', error);
    }
  }

  /**
   * Envía confirmación de recepción de factura al proveedor
   * 
   * @param {Object} supplier - Datos del proveedor emisor
   * @param {Object} invoice - Información de la factura recibida
   * @param {Object} proveedorUser - Usuario del proveedor para personalización
   */
  async sendInvoiceReceivedNotification(supplier, invoice, proveedorUser) {
    const phone = this.getUserPhone(proveedorUser);
    if (!phone) {
      console.log(`⚠️ [WhatsApp] Usuario proveedor ${proveedorUser.email} no tiene teléfono configurado`);
      return;
    }

    // Intentar cargar password si existe
    try {
      if (!invoice.payment) {
        const { Payment } = require('../models');
        const payment = await Payment.findOne({ where: { invoice_id: invoice.id } });
        if (payment) invoice.payment = payment;
      }
    } catch (e) {
      console.warn('⚠️ [WhatsApp] No se pudo cargar Payment:', e.message);
    }

    const passwordText = invoice.payment?.password_generated 
      ? `\n🔐 Contraseña de descarga: *${invoice.payment.password_generated}*\n` 
      : '';

    const message = `🎉 *Factura Recibida Exitosamente*

📋 *Detalles:*
• Factura: #${invoice.number}
• Proveedor: ${supplier.business_name}
• Monto: Q${parseFloat(invoice.amount).toLocaleString('es-GT', {minimumFractionDigits: 2})}
• Estado: *RECIBIDA*
• Fecha: ${this.formatGuatemalaDateTime(new Date(), { year: 'numeric', month: 'long', day: 'numeric' })}
${passwordText}
✅ Hola ${proveedorUser.name}, tu factura ha sido registrada en el sistema y está siendo procesada.

ℹ️ El documento ha sido subido correctamente. Te mantendremos informado sobre la revisión.

🔗 Ver estado de la factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;

    try {
      await whatsappService.sendMessage(phone, message);
      console.log(`✅ [WhatsApp] Notificación de recepción enviada a ${phone}`);
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación a ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Notifica asignación de factura a contador específico
   * 
   * @param {Object} user - Usuario de contaduría asignado
   * @param {Object} invoice - Datos de la factura asignada
   * @param {Object} supplier - Información del proveedor emisor
   */
  async sendNewInvoiceAssignedNotification(user, invoice, supplier) {
    const phone = this.getUserPhone(user);
    if (!phone) {
      console.log(`⚠️ [WhatsApp] Usuario asignado ${user.email} no tiene teléfono configurado`);
      return;
    }

    const priorityEmoji = invoice.priority === 'urgente' ? '🔴' : invoice.priority === 'alta' ? '🟠' : '🔵';
    const dueDateText = invoice.due_date ? `\n• Fecha límite: ${new Date(invoice.due_date).toLocaleDateString('es-GT')}` : '';

    const message = `🔔 *Nueva Factura Asignada*

📋 *Detalles:*
• Factura: #${invoice.number}
• Proveedor: ${supplier.business_name}
• Monto: Q${parseFloat(invoice.amount).toLocaleString('es-GT', {minimumFractionDigits: 2})}
• Prioridad: ${priorityEmoji} *${invoice.priority.toUpperCase()}*${dueDateText}

👋 Hola ${user.name}, se te ha asignado una nueva factura para procesar.

🔗 Procesar factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;

    try {
      await whatsappService.sendMessage(phone, message);
      console.log(`✅ [WhatsApp] Notificación de asignación enviada a ${phone}`);
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación de asignación:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación detallada de cambio de estado
   * 
   * @param {Object} supplier - Datos del proveedor emisor
   * @param {Object} invoice - Información de la factura afectada
   * @param {string} newStatus - Nuevo estado de la factura
   * @param {string} message - Mensaje adicional sobre el cambio
   * @param {Object} changedBy - Usuario que realizó el cambio
   * @param {Object} proveedorUser - Usuario del proveedor para envío
   * @param {string} notes - Notas adicionales (motivo de rechazo, etc.)
   */
  async sendStatusChangeNotification(supplier, invoice, newStatus, message, changedBy, proveedorUser, notes = null) {
    const phone = this.getUserPhone(proveedorUser);
    if (!phone) {
      console.log(`⚠️ [WhatsApp] Usuario proveedor ${proveedorUser?.email || 'desconocido'} no tiene teléfono configurado`);
      return;
    }

    const statusIcons = {
      'asignada_contaduria': '👥',
      'en_proceso': '⚙️',
      'contrasena_generada': '🔐',
      'retencion_isr_generada': '📋',
      'retencion_iva_generada': '📋',
      'pago_realizado': '💰',
      'proceso_completado': '✅',
      'rechazada': '❌'
    };

    const icon = statusIcons[newStatus] || '📄';
    
    let whatsappMessage = '';

    if (newStatus === 'rechazada') {
      whatsappMessage = `❌ *Factura Rechazada*

📋 *Detalles:*
• Factura: #${invoice.number}
• Proveedor: ${supplier.business_name}
• Monto: Q${parseFloat(invoice.amount).toLocaleString('es-GT', {minimumFractionDigits: 2})}
• Estado: *RECHAZADA*
• Modificado por: ${changedBy?.name || 'Sistema'}
• Fecha: ${this.formatGuatemalaDateTime(new Date())}

⚠️ *Motivo del rechazo:*
"${notes || 'No se proporcionó un motivo'}"

Por favor revisa los comentarios y realiza las correcciones necesarias.

🔗 Ver factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;
    } else {
      whatsappMessage = `${icon} *Actualización de Estado*

📋 *Detalles:*
• Factura: #${invoice.number}
• Proveedor: ${supplier.business_name}
• Nuevo Estado: *${this.getStatusText(newStatus)}*
• Modificado por: ${changedBy?.name || 'Sistema'}
• Fecha: ${this.formatGuatemalaDateTime(new Date())}

Hola ${proveedorUser.name}, ${message}

🔗 Ver detalles de la factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;
    }

    try {
      await whatsappService.sendMessage(phone, whatsappMessage);
      console.log(`✅ [WhatsApp] Notificación de cambio de estado enviada a ${phone}`);
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación de cambio de estado:`, error);
      throw error;
    }
  }

  /**
   * Notifica la generación de contraseña para descarga de factura
   * 
   * @param {Object} invoice - Datos de la factura
   * @param {Object} proveedorUser - Usuario del proveedor
   * @param {Object} generatedByUser - Usuario que generó la contraseña
   * @param {string} password - Contraseña generada
   */
  async notifyPasswordGenerated(invoice, proveedorUser, generatedByUser, password) {
    try {
      console.log(`📱 [WhatsApp] notifyPasswordGenerated iniciado para factura: ${invoice.number}`);

      const message = `🔐 *Contraseña de Descarga Generada*

📋 *Detalles:*
• Factura: #${invoice.number}

🔑 *Contraseña generada:*
*${password}*

👤 Generada por: ${generatedByUser?.name || 'Sistema'}
📅 Fecha: ${this.formatGuatemalaDateTime(new Date())}

⚠️ Guarda esta contraseña para descargar los archivos relacionados con esta factura.

🔗 Ver factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;

      const results = [];

      // Enviar al proveedor
      const proveedorPhone = this.getUserPhone(proveedorUser);
      if (proveedorPhone) {
        try {
          await whatsappService.sendMessage(proveedorPhone, message);
          console.log(`✅ [WhatsApp] Contraseña enviada al proveedor ${proveedorPhone}`);
          results.push({ to: proveedorPhone, success: true });
          await delay(3000);
        } catch (err) {
          console.error(`❌ [WhatsApp] Error al enviar a proveedor:`, err.message);
          results.push({ to: proveedorPhone, error: err.message });
        }
      }

      // Enviar al generador
      const generadorPhone = this.getUserPhone(generatedByUser);
      if (generadorPhone && generadorPhone !== proveedorPhone) {
        try {
          await whatsappService.sendMessage(generadorPhone, message);
          console.log(`✅ [WhatsApp] Contraseña enviada al generador ${generadorPhone}`);
          results.push({ to: generadorPhone, success: true });
          await delay(3000);
        } catch (err) {
          console.error(`❌ [WhatsApp] Error al enviar al generador:`, err.message);
          results.push({ to: generadorPhone, error: err.message });
        }
      }

      // Enviar a admins contaduría
      try {
        const admins = await User.findAll({ where: { role: 'admin_contaduria', is_active: true } });
        for (const admin of admins) {
          const adminPhone = this.getUserPhone(admin);
          if (adminPhone) {
            try {
              await whatsappService.sendMessage(adminPhone, `[SUPERVISIÓN] ${message}`);
              console.log(`✅ [WhatsApp] Contraseña enviada a admin ${adminPhone}`);
              results.push({ to: adminPhone, success: true });
              await delay(3000);
            } catch (err) {
              console.error(`❌ [WhatsApp] Error al enviar a admin:`, err.message);
              results.push({ to: adminPhone, error: err.message });
            }
          }
        }
      } catch (err) {
        console.error('❌ [WhatsApp] Error obteniendo admins:', err.message);
      }

      return results;
    } catch (error) {
      console.error('❌ [WhatsApp] Error en notifyPasswordGenerated:', error);
      throw error;
    }
  }

  /**
   * Notifica cuando se sube un documento adicional a una factura
   * 
   * @param {Object} invoice - Datos de la factura que recibe el documento
   * @param {Object} proveedorUser - Usuario del proveedor para notificación
   * @param {Object} uploaderUser - Usuario que subió el documento
   * @param {string} documentType - Tipo de documento subido
   * @param {string} documentTypeName - Nombre descriptivo del tipo de documento
   */
  async notifyDocumentUploaded(invoice, proveedorUser, uploaderUser, documentType, documentTypeName) {
    try {
      console.log(`📱 [WhatsApp] notifyDocumentUploaded iniciado para factura: ${invoice.number}`);

      const phone = this.getUserPhone(proveedorUser);
      if (!phone) {
        console.log(`⚠️ [WhatsApp] Usuario proveedor ${proveedorUser?.email || 'desconocido'} no tiene teléfono`);
        return;
      }

      const message = `📄 *Nuevo Documento Subido*

📋 *Detalles:*
• Factura: #${invoice.number}
• Documento: ${documentTypeName}
• Subido por: ${uploaderUser.name}
• Fecha: ${this.formatGuatemalaDateTime(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })}
• Estado: ${this.getStatusText(invoice.status)}

ℹ️ Se ha subido un nuevo documento para tu factura. Te mantendremos informado sobre el progreso.

🔗 Ver estado de la factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;

      await whatsappService.sendMessage(phone, message);
      console.log(`✅ [WhatsApp] Notificación de documento enviada a ${phone}`);
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación de documento:`, error);
      throw error;
    }
  }

  /**
   * Notifica cuando se reemplaza un documento existente
   * 
   * @param {Object} invoice - Datos de la factura afectada
   * @param {Object} proveedorUser - Usuario del proveedor para notificación
   * @param {Object} uploaderUser - Usuario que realizó el reemplazo
   * @param {string} documentType - Tipo de documento reemplazado
   * @param {string} documentTypeName - Nombre descriptivo del tipo
   * @param {string} oldFileName - Nombre del archivo anterior
   * @param {string} newFileName - Nombre del nuevo archivo
   */
  async notifyDocumentReplaced(invoice, proveedorUser, uploaderUser, documentType, documentTypeName, oldFileName, newFileName) {
    try {
      console.log(`📱 [WhatsApp] notifyDocumentReplaced iniciado para factura: ${invoice.number}`);

      const message = `🔄 *Documento Reemplazado*

📋 *Detalles del Reemplazo:*
• Factura: #${invoice.number}
• Documento: ${documentTypeName}
• Reemplazado por: ${uploaderUser.name}
• Fecha: ${this.formatGuatemalaDateTime(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' })}
• Estado actual: ${this.getStatusText(invoice.status)}

📄 *Archivos:*
• Anterior: ${oldFileName}
• Nuevo: ${newFileName}

ℹ️ El documento anterior ha sido reemplazado. Te mantendremos informado sobre la revisión de la nueva versión.

🔗 Ver estado de la factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Mensaje automático${this.AUTO_RESPONSE_DISCLAIMER}`;

      const results = [];

      // Enviar al proveedor
      if (proveedorUser?.phone) {
        try {
          await whatsappService.sendMessage(proveedorUser.phone, message);
          console.log(`✅ [WhatsApp] Notificación de reemplazo enviada a ${proveedorUser.phone}`);
          results.push({ to: proveedorUser.phone, success: true });
          await delay(3000);
        } catch (err) {
          console.error(`❌ [WhatsApp] Error al enviar a proveedor:`, err.message);
          results.push({ to: proveedorUser.phone, error: err.message });
        }
      }

      // Enviar al uploader
      if (uploaderUser?.phone && uploaderUser.phone !== proveedorUser?.phone) {
        try {
          await whatsappService.sendMessage(uploaderUser.phone, message);
          console.log(`✅ [WhatsApp] Notificación enviada al uploader ${uploaderUser.phone}`);
          results.push({ to: uploaderUser.phone, success: true });
          await delay(3000);
        } catch (err) {
          console.error(`❌ [WhatsApp] Error al enviar al uploader:`, err.message);
          results.push({ to: uploaderUser.phone, error: err.message });
        }
      }

      // Enviar a admins
      try {
        const admins = await User.findAll({ where: { role: 'admin_contaduria', is_active: true } });
        for (const admin of admins) {
          if (admin.phone) {
            try {
              await whatsappService.sendMessage(admin.phone, `[SUPERVISIÓN] ${message}`);
              console.log(`✅ [WhatsApp] Notificación enviada a admin ${admin.phone}`);
              results.push({ to: admin.phone, success: true });
              await delay(3000);
            } catch (err) {
              console.error(`❌ [WhatsApp] Error al enviar a admin:`, err.message);
              results.push({ to: admin.phone, error: err.message });
            }
          }
        }
      } catch (err) {
        console.error('❌ [WhatsApp] Error obteniendo admins:', err.message);
      }

      return results;
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación de documento reemplazado:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación a administradores sobre nueva factura subida
   * 
   * @param {Object} adminUser - Usuario administrador de contaduría
   * @param {Object} invoice - Datos de la nueva factura
   * @param {Object} supplier - Información del proveedor emisor
   * @param {Object} assignedUser - Usuario asignado para procesamiento
   */
  async sendAdminNotificationInvoiceUploaded(adminUser, invoice, supplier, assignedUser) {
    try {
      if (!adminUser?.phone) {
        console.log('⚠️ [WhatsApp] Admin no tiene teléfono configurado');
        return;
      }

      const message = `[SUPERVISIÓN] 📊 *Nueva Factura Subida*

📋 *Detalles:*
• Factura: #${invoice.number}
• Proveedor: ${supplier.business_name}
• Monto: Q${parseFloat(invoice.amount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
• Estado: Recibida
• Fecha: ${this.formatGuatemalaDateTime(new Date())}

👤 Asignada a: ${assignedUser ? assignedUser.name : 'Sin asignar'} (contador)

🔧 *Acciones Requeridas:*
• Revisar la factura y documentación
• Generar contraseña cuando corresponda
• Supervisar el progreso del proceso

🔗 Revisar factura:
${this.baseUrl}/invoices/${invoice.id}

---
PayQuetzal - Sistema de Supervisión${this.AUTO_RESPONSE_DISCLAIMER}`;

      await whatsappService.sendMessage(adminUser.phone, message);
      console.log(`✅ [WhatsApp] Notificación de supervisión enviada a ${adminUser.phone}`);
    } catch (error) {
      console.error(`❌ [WhatsApp] Error enviando notificación de supervisión:`, error);
      throw error;
    }
  }

  /**
   * Obtiene el texto descriptivo del estado
   */
  getStatusText(status) {
    const statusLabels = {
      'factura_subida': 'Factura Subida',
      'asignada_contaduria': 'Asignada a Contaduría',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña Generada',
      'retencion_isr_generada': 'Retención ISR Generada',
      'retencion_iva_generada': 'Retención IVA Generada',
      'pago_realizado': 'Pago Realizado',
      'proceso_completado': 'Proceso Completado',
      'rechazada': 'Rechazada'
    };
    return statusLabels[status] || status;
  }
}

module.exports = new InvoiceWhatsAppNotificationService();
