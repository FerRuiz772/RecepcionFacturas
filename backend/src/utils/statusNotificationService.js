const emailService = require('./emailService');
const invoiceNotificationService = require('./invoiceNotificationService');
const invoiceWhatsAppNotificationService = require('./invoiceWhatsAppNotificationService');
const logger = require('./logger');

/**
 * Servicio para manejar notificaciones de cambios de estado
 * Se integra con los servicios existentes sin modificarlos
 */
class StatusNotificationService {
  constructor() {
    this.initialized = true;
    console.log('🔧 StatusNotificationService initialized');
  }

  /**
   * Maneja notificaciones cuando se crea una nueva factura
   */
  async handleInvoiceCreated(invoice, supplier, assignedUser) {
    try {
      console.log('📧 Procesando notificaciones para factura creada:', invoice.number);
      console.log('📧 Datos del proveedor:', supplier ? supplier.business_name : 'No encontrado');
      console.log('📧 Usuario asignado:', assignedUser ? assignedUser.name : 'No asignado');
      
      // Usar el servicio existente de email
      await invoiceNotificationService.notifyInvoiceUploaded(invoice, supplier, assignedUser);
      
      console.log('✅ invoiceNotificationService.notifyInvoiceUploaded completado exitosamente');
      
      // AÑADIDO: Enviar notificación por WhatsApp
      await invoiceWhatsAppNotificationService.notifyInvoiceUploaded(invoice, supplier, assignedUser);
      console.log('✅ invoiceWhatsAppNotificationService.notifyInvoiceUploaded completado exitosamente');
      
      logger.info(`Notificaciones enviadas para factura creada: ${invoice.number}`);
    } catch (error) {
      console.error('❌ Error específico en handleInvoiceCreated:', error);
      console.error('❌ Stack trace:', error.stack);
      logger.error('Error enviando notificaciones de factura creada:', error);
      // No fallar el proceso principal
    }
  }

  /**
   * Maneja notificaciones cuando cambia el estado de una factura
   */
  async handleStatusChange(invoice, fromStatus, toStatus, changedBy, supplier, notes = null) {
    try {
      console.log(`📧 Procesando notificación de cambio de estado: ${fromStatus} → ${toStatus}`);
      
      // Usar el servicio existente de email
      await invoiceNotificationService.notifyStatusChange(invoice, fromStatus, toStatus, changedBy, supplier, notes);
      
      // AÑADIDO: Enviar notificación por WhatsApp
      await invoiceWhatsAppNotificationService.notifyStatusChange(invoice, fromStatus, toStatus, changedBy, supplier, notes);
      
      logger.info(`Notificación de cambio de estado enviada para factura ${invoice.number}: ${fromStatus} → ${toStatus}`);
    } catch (error) {
      logger.error('Error enviando notificación de cambio de estado:', error);
      // No fallar el proceso principal
    }
  }

  /**
   * Maneja notificaciones cuando se asigna una factura
   */
  async handleInvoiceAssigned(invoice, supplier, assignedUser, previousUser = null) {
    try {
      console.log('📧 Procesando notificación de asignación de factura:', invoice.number);
      
      if (assignedUser?.email) {
        // Usar el método existente del invoiceNotificationService
        await invoiceNotificationService.sendNewInvoiceAssignedNotification(assignedUser, invoice, supplier);
        
        logger.info(`Notificación de asignación enviada a: ${assignedUser.email}`);
      }
      
      // AÑADIDO: Enviar notificación por WhatsApp
      if (assignedUser?.phone) {
        await invoiceWhatsAppNotificationService.sendNewInvoiceAssignedNotification(assignedUser, invoice, supplier);
        logger.info(`Notificación de asignación por WhatsApp enviada a: ${assignedUser.phone}`);
      }
      
      if (previousUser && previousUser.id !== assignedUser?.id) {
        // Notificar al usuario anterior que ya no tiene la factura asignada
        await this.sendInvoiceUnassignedNotification(previousUser, invoice, supplier);
      }
      
    } catch (error) {
      logger.error('Error enviando notificación de asignación:', error);
    }
  }

  /**
   * Notifica cuando se quita la asignación de una factura
   */
  async sendInvoiceUnassignedNotification(user, invoice, supplier) {
    try {
      const subject = `📋 Factura ${invoice.number} reasignada`;
      
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #0f172a; margin: 0;">🧾 Recepción de Facturas</h1>
              <div style="width: 60px; height: 3px; background-color: #f59e0b; margin: 10px auto;"></div>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px;">
              <h2 style="color: #92400e; margin: 0 0 10px 0;">📋 Factura Reasignada</h2>
              <p style="color: #92400e; margin: 0;">Hola ${user.name}, la factura ${invoice.number} ha sido reasignada a otro usuario.</p>
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
              </table>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 12px;">
              <p>© ${new Date().getFullYear()} Sistema de Recepción de Facturas. Todos los derechos reservados.</p>
              <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
            </div>
          </div>
        </div>
      `;

      await emailService.sendEmail(user.email, subject, htmlContent);
      logger.info(`Notificación de reasignación enviada a: ${user.email}`);
      
    } catch (error) {
      logger.error('Error enviando notificación de reasignación:', error);
    }
  }

  /**
   * Maneja notificaciones de recordatorios (facturas vencidas, etc.)
   */
  async handleReminders() {
    try {
      console.log('📧 Procesando recordatorios automáticos...');
      // TODO: Implementar lógica de recordatorios
      logger.info('Recordatorios procesados');
    } catch (error) {
      logger.error('Error procesando recordatorios:', error);
    }
  }

  /**
   * Método central para manejar cualquier tipo de notificación
   */
  async processNotification(type, data) {
    try {
      console.log(`🔔 StatusNotificationService.processNotification iniciado - Tipo: ${type}`);
      console.log(`🔔 Timestamp: ${new Date().toISOString()}`);
      console.log(`🔔 Datos recibidos:`, JSON.stringify(data, null, 2));
      
      switch (type) {
        case 'invoice_created':
          console.log('🔔 Procesando invoice_created...');
          await this.handleInvoiceCreated(data.invoice, data.supplier, data.assignedUser);
          console.log('✅ invoice_created procesado exitosamente');
          break;
          
        case 'status_change':
          console.log('🔔 Procesando status_change...');
          // Pasar notes si vienen en el payload (ej. motivo de rechazo)
          await this.handleStatusChange(data.invoice, data.fromStatus, data.toStatus, data.changedBy, data.supplier, data.notes || null);
          console.log('✅ status_change procesado exitosamente');
          break;
          
        case 'invoice_assigned':
          console.log('🔔 Procesando invoice_assigned...');
          await this.handleInvoiceAssigned(data.invoice, data.supplier, data.assignedUser, data.previousUser);
          console.log('✅ invoice_assigned procesado exitosamente');
          break;
          
        case 'reminders':
          console.log('🔔 Procesando reminders...');
          await this.handleReminders();
          console.log('✅ reminders procesado exitosamente');
          break;
          
        default:
          console.log(`⚠️ Tipo de notificación no reconocido: ${type}`);
          logger.warn(`Tipo de notificación no reconocido: ${type}`);
      }
      
      console.log(`✅ StatusNotificationService.processNotification completado - Tipo: ${type}`);
    } catch (error) {
      console.error(`❌ Error en StatusNotificationService.processNotification - Tipo: ${type}:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      logger.error(`Error procesando notificación tipo ${type}:`, error);
    }
  }
}

module.exports = new StatusNotificationService();