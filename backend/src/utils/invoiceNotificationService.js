
const emailService = require('./emailService');
const { User, Supplier } = require('../models');

class InvoiceNotificationService {
  constructor() {
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  }

  /**
   * Envía notificación cuando se sube una nueva factura
   */
  async notifyInvoiceUploaded(invoice, supplier, assignedUser) {
    try {
      console.log(`🔍 notifyInvoiceUploaded iniciado para factura: ${invoice.number}`);
      console.log(`🔍 Datos del supplier:`, supplier);
      console.log(`🔍 Datos del assignedUser:`, assignedUser);
      
      // Notificar al proveedor que su factura fue recibida
      if (supplier?.contact_email) {
        console.log(`📧 Enviando notificación al proveedor: ${supplier.contact_email}`);
        await this.sendInvoiceReceivedNotification(supplier, invoice);
        console.log(`✅ Notificación al proveedor enviada exitosamente`);
      } else {
        console.log(`⚠️ Proveedor no tiene contact_email configurado:`, supplier);
      }

      // Notificar al usuario asignado que tiene una nueva factura pendiente
      if (assignedUser?.email) {
        console.log(`📧 Enviando notificación al usuario asignado: ${assignedUser.email}`);
        await this.sendNewInvoiceAssignedNotification(assignedUser, invoice, supplier);
        console.log(`✅ Notificación al usuario asignado enviada exitosamente`);
      } else {
        console.log(`⚠️ Usuario asignado no tiene email configurado:`, assignedUser);
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
  async notifyStatusChange(invoice, fromStatus, toStatus, changedBy, supplier) {
    try {
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
      if (message && supplier?.contact_email) {
        await this.sendStatusChangeNotification(supplier, invoice, toStatus, message, changedBy);
      }

      console.log(`📧 Notificación de cambio de estado enviada para factura ${invoice.number}: ${fromStatus} → ${toStatus}`);
    } catch (error) {
      console.error('❌ Error enviando notificación de cambio de estado:', error);
    }
  }

  /**
   * Notifica al proveedor que su factura fue recibida
   */
  async sendInvoiceReceivedNotification(supplier, invoice) {
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
            <p style="color: #166534; margin: 0;">Tu factura ha sido recibida exitosamente y está en proceso de revisión.</p>
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
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Estado:</td>
                <td style="padding: 8px 0;">
                  <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ${invoice.status.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Fecha de subida:</td>
                <td style="padding: 8px 0; color: #0f172a;">${new Date(invoice.created_at).toLocaleDateString('es-GT')}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">⏱️ Próximos Pasos</h4>
            <p style="color: #92400e; margin: 0; line-height: 1.5;">
              Tu factura será revisada por nuestro equipo de contaduría. Te mantendremos informado sobre cualquier cambio en el estado de procesamiento.
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
      console.log(`📧 Enviando notificación de factura recibida a proveedor: ${supplier.contact_email}`);
      const result = await emailService.sendEmail(supplier.contact_email, subject, htmlContent);
      console.log(`✅ Notificación enviada exitosamente al proveedor ${supplier.business_name}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación al proveedor ${supplier.business_name}:`, error);
      throw error;
    }
  }

  /**
   * Notifica al usuario asignado sobre nueva factura
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
  async sendStatusChangeNotification(supplier, invoice, newStatus, message, changedBy) {
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
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
            <div style="width: 60px; height: 3px; background-color: ${statusColors[newStatus] || '#64748b'}; margin: 10px auto;"></div>
          </div>
          
          <div style="background-color: #f8fafc; border-left: 4px solid ${statusColors[newStatus] || '#64748b'}; padding: 20px; margin-bottom: 25px;">
            <h2 style="color: ${statusColors[newStatus] || '#64748b'}; margin: 0 0 10px 0;">${statusIcons[newStatus] || '📄'} Actualización de Estado</h2>
            <p style="color: #0f172a; margin: 0; font-size: 16px;">${message}</p>
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

          <div style="text-align: center; margin-top: 30px;">
            <a href="${this.baseUrl}/invoices/${invoice.id}" 
               style="background-color: ${statusColors[newStatus] || '#64748b'}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Ver Detalles de la Factura
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
      console.log(`📧 Enviando notificación de cambio de estado al proveedor: ${supplier.contact_email}`);
      const result = await emailService.sendEmail(supplier.contact_email, subject, htmlContent);
      console.log(`✅ Notificación de cambio de estado enviada exitosamente al proveedor ${supplier.business_name}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Error enviando notificación de cambio de estado al proveedor ${supplier.business_name}:`, error);
      throw error;
    }
  }
}

module.exports = new InvoiceNotificationService();
