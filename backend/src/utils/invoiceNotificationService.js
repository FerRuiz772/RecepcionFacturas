
/**
 * Servicio de notificaciones por email para facturas en PayQuetzal
 * 
 * Gestiona el envío automatizado de notificaciones durante el ciclo de vida de las facturas
 * Proporciona templates personalizados y manejo de múltiples destinatarios según el evento
 * 
 * Tipos de notificaciones:
 * - Factura subida: Confirma recepción al proveedor + notifica a contaduría
 * - Factura asignada: Notifica al contador asignado
 * - Cambio de estado: Informa a todos los involucrados sobre cambios
 * - Rechazo: Explica motivos de rechazo al proveedor
 * - Aprobación: Confirma aprobación para pago
 * - Pago completado: Notifica finalización del proceso
 * 
 * Características:
 * - Templates HTML responsivos con branding PayQuetzal
 * - Información contextual específica por tipo de evento
 * - Links directos al sistema para acciones rápidas
 * - Manejo de errores robusto con logging detallado
 * - Soporte para múltiples destinatarios simultáneos
 */

const emailService = require('./emailService');
const { User, Supplier } = require('../models');

/**
 * Clase principal del servicio de notificaciones de facturas
 * Centraliza toda la lógica de comunicación por email relacionada con facturas
 */
class InvoiceNotificationService {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    console.log('🔧 InvoiceNotificationService initialized with base URL:', this.baseUrl);
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
      console.log(`🔍 notifyInvoiceUploaded iniciado para factura: ${invoice.number}`);
      console.log(`🔍 Datos del supplier:`, supplier);
      console.log(`🔍 Datos del assignedUser:`, assignedUser);
      
      // Buscar al usuario proveedor que subió la factura
      const { User } = require('../models');
      const proveedorUser = await User.findOne({
        where: { supplier_id: supplier.id, role: 'proveedor' }
      });

      console.log(`🔍 Usuario proveedor encontrado:`, proveedorUser ? proveedorUser.email : 'No encontrado');

      // Buscar TODOS los admin de contaduría para notificación
      const adminsContaduria = await User.findAll({
        where: { role: 'admin_contaduria', is_active: true }
      });

      console.log(`🔍 Admins contaduría encontrados: ${adminsContaduria.length} usuarios`);
      adminsContaduria.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.name})`);
      });

      // Notificar al proveedor que su factura fue recibida
      if (proveedorUser?.email) {
        console.log(`📧 Enviando notificación al proveedor: ${proveedorUser.email}`);
        await this.sendInvoiceReceivedNotification(supplier, invoice, proveedorUser);
        console.log(`✅ Notificación al proveedor enviada exitosamente`);
      } else {
        console.log(`⚠️ No se encontró usuario proveedor para supplier_id: ${supplier.id}`);
      }

      // Notificar al usuario asignado que tiene una nueva factura pendiente
      if (assignedUser?.email) {
        console.log(`📧 Enviando notificación al usuario asignado: ${assignedUser.email}`);
        await this.sendNewInvoiceAssignedNotification(assignedUser, invoice, supplier);
        console.log(`✅ Notificación al usuario asignado enviada exitosamente`);
      } else {
        console.log(`⚠️ Usuario asignado no tiene email configurado:`, assignedUser);
      }

      // Notificar a TODOS los admin de contaduría para que estén al tanto de todas las facturas
      if (adminsContaduria.length > 0) {
        console.log(`📧 Enviando notificaciones a ${adminsContaduria.length} admins de contaduría...`);
        
        for (const adminContaduria of adminsContaduria) {
          try {
            console.log(`📧 Enviando notificación al admin contaduría: ${adminContaduria.email}`);
            await this.sendAdminNotificationInvoiceUploaded(adminContaduria, invoice, supplier, assignedUser);
            console.log(`✅ Notificación al admin contaduría ${adminContaduria.email} enviada exitosamente`);
          } catch (emailError) {
            console.error(`❌ Error enviando notificación a ${adminContaduria.email}:`, emailError);
            // Continuar con los otros admins aunque uno falle
          }
        }
      } else {
        console.log(`⚠️ No se encontraron admins de contaduría activos`);
      }

      console.log(`📧 Notificaciones enviadas para factura ${invoice.number}`);
    } catch (error) {
      console.error('❌ Error enviando notificaciones de factura subida:', error);
      console.error('❌ Stack trace completo:', error.stack);
    }
  }

  /**
   * Envía notificación cuando cambia el estado de una factura
   */
  /**
   * Notifica cambios de estado en el workflow de facturas
   * Informa a proveedor y equipo de contaduría sobre transiciones de estado
   * 
   * @param {Object} invoice - Datos de la factura que cambió
   * @param {string} fromStatus - Estado anterior de la factura  
   * @param {string} toStatus - Nuevo estado de la factura
   * @param {Object} changedBy - Usuario que realizó el cambio
   * @param {Object} supplier - Datos del proveedor emisor
   */
  async notifyStatusChange(invoice, fromStatus, toStatus, changedBy, supplier, notes = null) {
    try {
      console.log(`📧 notifyStatusChange iniciado para factura: ${invoice.number}`);
      console.log(`📧 Cambio de estado: ${fromStatus} → ${toStatus}`);
      console.log(`📧 Cambiado por: ${changedBy.name}`);
      console.log(`📧 Supplier:`, supplier);

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
        // Buscar al usuario proveedor que debe recibir la notificación
        const { User } = require('../models');
        const proveedorUser = await User.findOne({
          where: { supplier_id: supplier.id, role: 'proveedor' }
        });

        console.log(`🔍 Usuario proveedor para notificación:`, proveedorUser ? proveedorUser.email : 'No encontrado');

        if (proveedorUser?.email) {
          console.log(`📧 Enviando notificación de cambio de estado a: ${proveedorUser.email}`);
          await this.sendStatusChangeNotification(supplier, invoice, toStatus, message, changedBy, proveedorUser, notes);
          console.log(`✅ Notificación de cambio de estado enviada exitosamente`);
        } else {
          console.log(`⚠️ No se encontró usuario proveedor para supplier_id: ${supplier.id}`);
        }
      } else {
        console.log(`⚠️ No hay mensaje definido para el estado: ${toStatus}`);
      }

      console.log(`📧 Notificación de cambio de estado completada para factura ${invoice.number}: ${fromStatus} → ${toStatus}`);
    } catch (error) {
      console.error('❌ Error enviando notificación de cambio de estado:', error);
      console.error('❌ Stack trace:', error.stack);
    }
  }

  /**
   * Notifica al proveedor que su factura fue recibida
   */
  /**
   * Envía confirmación de recepción de factura al proveedor
   * Email con detalles de la factura recibida y próximos pasos
   * 
   * @param {Object} supplier - Datos del proveedor emisor
   * @param {Object} invoice - Información de la factura recibida
   * @param {Object} proveedorUser - Usuario del proveedor para personalización
   */
  async sendInvoiceReceivedNotification(supplier, invoice, proveedorUser) {
    const subject = `✅ Factura ${invoice.number} recibida correctamente`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
            <div style="width: 60px; height: 3px; background-color: #10b981; margin: 10px auto;"></div>
          </div>
          
          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #15803d; margin: 0 0 10px 0;">✅ Factura Recibida</h2>
            <p style="color: #166534; margin: 0;">Hola ${proveedorUser.name}, tu factura ha sido recibida exitosamente y está en proceso de revisión.</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #0f172a; margin: 0 0 15px 0;">📋 Detalles de la Factura</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Número:</td>
                <td style="padding: 8px 0; color: #0f172a;">${invoice.number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Proveedor:</td>
                <td style="padding: 8px 0; color: #0f172a;">${supplier.business_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Monto:</td>
                <td style="padding: 8px 0; color: #0f172a;">Q${parseFloat(invoice.amount || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Estado:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    RECIBIDA
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha de subida:</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleDateString('es-GT')}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">⏱️ Próximos Pasos</h4>
            <p style="color: #92400e; margin: 0; line-height: 1.5;">
              Tu factura será revisada por nuestro equipo de contaduría. Te mantendremos informado sobre cualquier cambio en el estado de procesamiento a través de notificaciones por correo electrónico.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.baseUrl}/invoices/${invoice.id}" 
               style="background-color: #0f172a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Ver Estado de la Factura
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Sistema de Recepción de Facturas. Todos los derechos reservados.</p>
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </div>
    `;

    try {
      console.log(`📧 Enviando notificación de factura recibida a proveedor: ${proveedorUser.email}`);
      const result = await emailService.sendEmail(proveedorUser.email, subject, htmlContent);
      console.log(`✅ Notificación enviada exitosamente al proveedor ${supplier.business_name} (${proveedorUser.email}):`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación al proveedor ${supplier.business_name} (${proveedorUser.email}):`, error);
      throw error;
    }
  }

  /**
   * Notifica al usuario asignado sobre nueva factura
   */
  /**
   * Notifica asignación de factura a contador específico
   * Alerta al contador que tiene una nueva factura para procesar
   * 
   * @param {Object} user - Usuario de contaduría asignado
   * @param {Object} invoice - Datos de la factura asignada
   * @param {Object} supplier - Información del proveedor emisor
   */
  async sendNewInvoiceAssignedNotification(user, invoice, supplier) {
    const subject = `🔔 Nueva factura asignada: ${invoice.number}`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
            <div style="width: 60px; height: 3px; background-color: #3b82f6; margin: 10px auto;"></div>
          </div>
          
          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: #1e40af; margin: 0 0 10px 0;">🔔 Nueva Factura Asignada</h2>
            <p style="color: #1e40af; margin: 0;">Hola ${user.name}, se te ha asignado una nueva factura para procesar.</p>
          </div>

          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h3 style="color: #0f172a; margin: 0 0 15px 0;">📋 Detalles de la Factura</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Número:</td>
                <td style="padding: 8px 0; color: #0f172a;">${invoice.number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Proveedor:</td>
                <td style="padding: 8px 0; color: #0f172a;">${supplier.business_name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Monto:</td>
                <td style="padding: 8px 0; color: #0f172a;">Q${parseFloat(invoice.amount).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Prioridad:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: ${invoice.priority === 'urgente' ? '#fecaca' : invoice.priority === 'alta' ? '#fed7aa' : '#dbeafe'}; 
                               color: ${invoice.priority === 'urgente' ? '#dc2626' : invoice.priority === 'alta' ? '#ea580c' : '#1e40af'}; 
                               padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ${invoice.priority.toUpperCase()}
                  </span>
                </td>
              </tr>
              ${invoice.due_date ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha límite:</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date(invoice.due_date).toLocaleDateString('es-GT')}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.baseUrl}/invoices/${invoice.id}" 
               style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Procesar Factura
            </a>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Sistema de Recepción de Facturas. Todos los derechos reservados.</p>
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </div>
    `;

    try {
      console.log(`📧 Enviando notificación de nueva asignación al usuario: ${user.email}`);
      const result = await emailService.sendEmail(user.email, subject, htmlContent);
      console.log(`✅ Notificación de asignación enviada exitosamente al usuario ${user.username}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de asignación al usuario ${user.username}:`, error);
      throw error;
    }
  }

  /**
   * Notifica cambio de estado al proveedor
   */
  /**
   * Envía notificación detallada de cambio de estado
   * Incluye contexto del cambio y acciones requeridas según el nuevo estado
   * 
   * @param {Object} supplier - Datos del proveedor emisor
   * @param {Object} invoice - Información de la factura afectada
   * @param {string} newStatus - Nuevo estado de la factura
   * @param {string} message - Mensaje adicional sobre el cambio
   * @param {Object} changedBy - Usuario que realizó el cambio
   * @param {Object} proveedorUser - Usuario del proveedor para envío
   */
  async sendStatusChangeNotification(supplier, invoice, newStatus, message, changedBy, proveedorUser, notes = null) {
    const subject = `📄 Actualización de factura ${invoice.number}`;
    
    const statusColors = {
      'asignada_contaduria': '#3b82f6',
      'en_proceso': '#f59e0b',
      'contrasena_generada': '#8b5cf6',
      'retencion_isr_generada': '#06b6d4',
      'retencion_iva_generada': '#06b6d4',
      'pago_realizado': '#10b981',
      'proceso_completado': '#10b981',
      'rechazada': '#ef4444'
    };

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
    
    const rejectionHtml = notes ? `
        <div style="background-color:#fff1f2;padding:15px;border-radius:6px;margin-bottom:16px;">
          <h4 style="color:#b91c1c;margin:0 0 8px 0;">Motivo del rechazo</h4>
          <p style="color:#7f1d1d;margin:0;">${notes}</p>
        </div>
      ` : '';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
            <div style="width: 60px; height: 3px; background-color: ${statusColors[newStatus] || '#64748b'}; margin: 10px auto;"></div>
          </div>

          <!-- Rejection-specific layout -->
          ${newStatus === 'rechazada' ? `
            <div style="background-color:#fff1f2;padding:18px;border-radius:8px;margin-bottom:18px;border:1px solid #fecaca;">
              <h2 style="color:#7f1d1d;margin:0 0 6px 0;font-size:20px;">❌ Tu factura ha sido rechazada</h2>
              <p style="color:#7f1d1d;margin:0 0 8px 0;">Hola ${proveedorUser.name}, lamentamos informarte que tu factura fue rechazada por el siguiente motivo:</p>
              <div style="background:#fff5f5;border-left:4px solid #ef4444;padding:12px;border-radius:6px;margin-top:8px;margin-bottom:8px;">
                <p style="color:#7f1d1d;margin:0;">${notes || 'No se proporcionó un motivo'}</p>
              </div>
            </div>
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 18px;">
              <h3 style="color: #0f172a; margin: 0 0 8px 0;">📋 Detalles de la Factura</h3>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:6px 0;color:#64748b;font-weight:bold;width:40%">Número:</td><td style="padding:6px 0;color:#0f172a">${invoice.number}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-weight:bold">Proveedor:</td><td style="padding:6px 0;color:#0f172a">${supplier.business_name}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-weight:bold">Actualizado por:</td><td style="padding:6px 0;color:#0f172a">${changedBy?.name || 'Sistema'}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;font-weight:bold">Fecha:</td><td style="padding:6px 0;color:#0f172a">${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT')}</td></tr>
              </table>
            </div>
            <div style="text-align:center;margin-top:18px;">
              <a href="${this.baseUrl}/invoices/${invoice.id}" style="background-color:#ef4444;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Ver Detalles de la Factura</a>
            </div>
          ` : `
            <div style="background-color: #f8fafc; border-left: 4px solid ${statusColors[newStatus] || '#64748b'}; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: ${statusColors[newStatus] || '#64748b'}; margin: 0 0 10px 0;">${statusIcons[newStatus] || '📄'} Actualización de Estado</h2>
              <p style="color: #0f172a; margin: 0; font-size: 16px;">Hola ${proveedorUser.name}, ${message}</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #0f172a; margin: 0 0 15px 0;">📋 Detalles de la Factura</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Número:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${invoice.number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Proveedor:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${supplier.business_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Nuevo Estado:</td>
                  <td style="padding: 8px 0;">
                    <span style="background-color: ${statusColors[newStatus] || '#64748b'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                      ${newStatus.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Actualizado por:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${changedBy?.name || 'Sistema'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleDateString('es-GT')} ${new Date().toLocaleTimeString('es-GT')}</td>
                </tr>
              </table>
            </div>

            ${rejectionHtml}

            <div style="text-align: center; margin-top: 30px;">
              <a href="${this.baseUrl}/invoices/${invoice.id}" 
                 style="background-color: ${statusColors[newStatus] || '#64748b'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Ver Detalles de la Factura
              </a>
            </div>
          `}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Sistema de Recepción de Facturas. Todos los derechos reservados.</p>
            <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          </div>
        </div>
      </div>
    `;

    try {
      console.log(`📧 Enviando notificación de cambio de estado a proveedor: ${proveedorUser.email}`);
      const result = await emailService.sendEmail(proveedorUser.email, subject, htmlContent);
      console.log(`✅ Notificación de cambio de estado enviada exitosamente al proveedor ${supplier.business_name} (${proveedorUser.email}):`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de cambio de estado al proveedor ${supplier.business_name} (${proveedorUser.email}):`, error);
      throw error;
    }
  }

  /**
   * Envía notificación cuando se sube un documento para una factura
   */
  /**
   * Notifica cuando se sube un documento adicional a una factura
   * Informa sobre nuevos documentos de soporte o corrección
   * 
   * @param {Object} invoice - Datos de la factura que recibe el documento
   * @param {Object} proveedorUser - Usuario del proveedor para notificación
   * @param {Object} uploaderUser - Usuario que subió el documento
   * @param {string} documentType - Tipo de documento subido
   * @param {string} documentTypeName - Nombre descriptivo del tipo de documento
   */
  async notifyDocumentUploaded(invoice, proveedorUser, uploaderUser, documentType, documentTypeName) {
    try {
      console.log(`📧 notifyDocumentUploaded iniciado para factura: ${invoice.number}`);
      console.log(`📧 Tipo de documento: ${documentType} (${documentTypeName})`);
      console.log(`📧 Proveedor: ${proveedorUser.email}`);
      console.log(`📧 Usuario que subió: ${uploaderUser.name}`);

      if (!proveedorUser?.email) {
        console.log('⚠️ Proveedor no tiene email configurado');
        return { success: false, message: 'No email address' };
      }

      const subject = `📄 Nuevo documento subido para tu factura ${invoice.number}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
              <div style="width: 60px; height: 3px; background-color: #3b82f6; margin: 10px auto;"></div>
            </div>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #1d4ed8; margin: 0 0 10px 0;">📄 Documento Subido</h2>
              <p style="color: #1e40af; margin: 0;">Se ha subido un nuevo documento para tu factura. Te mantendremos informado sobre el progreso del procesamiento.</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #0f172a; margin: 0 0 15px 0;">📋 Detalles del Documento</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Factura:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${invoice.number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Documento:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${documentTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Subido por:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${uploaderUser.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleDateString('es-ES')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Estado:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${this.getStatusText(invoice.status)}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 15px; margin-bottom: 25px;">
              <p style="color: #a16207; margin: 0; font-size: 14px;">
                <strong>ℹ️ Información:</strong> Este documento es parte del proceso de gestión de tu factura. 
                Te notificaremos cuando haya actualizaciones adicionales.
              </p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${this.baseUrl}/invoices/${invoice.id}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📊 Ver Estado de la Factura
              </a>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2025 Sistema de Recepción de Facturas. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      `;

      const result = await emailService.sendEmail(proveedorUser.email, subject, htmlContent);
      console.log(`✅ Notificación de documento subido enviada exitosamente al proveedor ${proveedorUser.email}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de documento subido al proveedor:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación cuando se reemplaza un documento de una factura
   */
  /**
   * Notifica cuando se reemplaza un documento existente
   * Informa sobre actualizaciones de documentos ya enviados
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
      console.log(`📧 notifyDocumentReplaced iniciado para factura: ${invoice.number}`);
      console.log(`📧 Tipo de documento: ${documentType} (${documentTypeName})`);
      console.log(`📧 Proveedor: ${proveedorUser.email}`);
      console.log(`📧 Usuario que reemplazó: ${uploaderUser.name}`);
      console.log(`📧 Archivo anterior: ${oldFileName}`);
      console.log(`📧 Archivo nuevo: ${newFileName}`);

      if (!proveedorUser?.email) {
        console.log('⚠️ Proveedor no tiene email configurado');
        return { success: false, message: 'No email address' };
      }

      const subject = `🔄 Documento reemplazado para tu factura ${invoice.number}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
              <div style="width: 60px; height: 3px; background-color: #f59e0b; margin: 10px auto;"></div>
            </div>
            
            <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #c2410c; margin: 0 0 10px 0;">🔄 Documento Reemplazado</h2>
              <p style="color: #ea580c; margin: 0;">Hola ${proveedorUser.name}, se ha actualizado un documento de tu factura. El documento anterior ha sido reemplazado con una nueva versión.</p>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
              <h3 style="color: #0f172a; margin: 0 0 15px 0;">📋 Detalles del Reemplazo</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Factura:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${invoice.number}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Documento:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${documentTypeName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Reemplazado por:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${uploaderUser.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha del reemplazo:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${new Date().toLocaleDateString('es-ES')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Estado actual:</td>
                  <td style="padding: 8px 0; color: #0f172a;">${this.getStatusText(invoice.status)}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                <strong>ℹ️ Información importante:</strong> El documento anterior ha sido reemplazado. 
                Te mantendremos informado sobre el progreso de la revisión de la nueva versión.
              </p>
            </div>

            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
              <h4 style="color: #475569; margin: 0 0 10px 0;">📄 Archivos</h4>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="color: #64748b; font-size: 14px;">
                  <span style="font-weight: bold;">Archivo anterior:</span> ${oldFileName}
                </div>
                <div style="color: #059669; font-size: 14px;">
                  <span style="font-weight: bold;">Archivo nuevo:</span> ${newFileName}
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${this.baseUrl}/invoices/${invoice.id}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                📊 Ver Estado de la Factura
              </a>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © 2025 Sistema de Recepción de Facturas. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      `;

      const result = await emailService.sendEmail(proveedorUser.email, subject, htmlContent);
      console.log(`✅ Notificación de documento reemplazado enviada exitosamente al proveedor ${proveedorUser.email}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de documento reemplazado al proveedor:`, error);
      throw error;
    }
  }

  /**
   * Envía notificación al admin de contaduría cuando se sube una nueva factura
   */
  /**
   * Envía notificación a administradores sobre nueva factura subida
   * Mantiene a la administración informada sobre el flujo de facturas
   * 
   * @param {Object} adminUser - Usuario administrador de contaduría
   * @param {Object} invoice - Datos de la nueva factura
   * @param {Object} supplier - Información del proveedor emisor
   * @param {Object} assignedUser - Usuario asignado para procesamiento
   */
  async sendAdminNotificationInvoiceUploaded(adminUser, invoice, supplier, assignedUser) {
    try {
      console.log(`📧 Preparando notificación de supervisión para admin: ${adminUser.email}`);
      
      const subject = `[SUPERVISIÓN] Nueva Factura Subida - ${invoice.number}`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 300;">🔍 Supervisión de Facturas</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Nueva factura requiere supervisión</p>
          </div>
          
          <div style="padding: 30px; background-color: white; margin: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
              <h3 style="color: #92400e; margin: 0 0 5px 0; font-size: 16px;">
                📋 Notificación de Supervisión
              </h3>
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                Se ha subido una nueva factura que requiere su supervisión para generación de contraseñas.
              </p>
            </div>

            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Nueva Factura: ${invoice.number}</h2>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569; width: 40%;">
                    Número de Factura:
                  </td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                    ${invoice.number}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">
                    Proveedor:
                  </td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                    ${supplier.business_name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">
                    Monto:
                  </td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                    Q${parseFloat(invoice.amount).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">
                    Asignado a:
                  </td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                    ${assignedUser ? assignedUser.name : 'Sin asignar'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #475569;">
                    Descripción:
                  </td>
                  <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">
                    ${invoice.description || 'Sin descripción'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569;">
                    Estado Actual:
                  </td>
                  <td style="padding: 8px 12px; color: #1e293b;">
                    <span style="background-color: #fbbf24; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                      ${this.getStatusText(invoice.status)}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <div style="background-color: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
              <h4 style="color: #0369a1; margin: 0 0 8px 0; font-size: 16px;">🔧 Acciones Requeridas:</h4>
              <ul style="color: #0369a1; margin: 5px 0; padding-left: 20px; font-size: 14px;">
                <li>Revisar la factura y su documentación</li>
                <li>Generar contraseña cuando corresponda</li>
                <li>Supervisar el progreso del proceso</li>
                <li>Coordinar con el equipo de contaduría si es necesario</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/invoices/${invoice.id}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🔍 Ver Factura en Sistema
              </a>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #64748b; text-align: center;">
              <p style="margin: 0;">
                Este es un correo automático de supervisión. Como administrador de contaduría, recibirás notificaciones de todas las facturas subidas al sistema.
              </p>
              <p style="margin: 10px 0 0 0;">
                © 2025 Sistema de Recepción de Facturas. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      `;

      const result = await emailService.sendEmail(adminUser.email, subject, htmlContent);
      console.log(`✅ Notificación de supervisión enviada exitosamente al admin ${adminUser.email}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de supervisión al admin:`, error);
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

module.exports = new InvoiceNotificationService();
