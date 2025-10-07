/**
 * Servicio de notificaciones por email para comentarios en facturas
 * 
 * Envía notificaciones automáticas cuando:
 * - Un proveedor deja un comentario (notifica a trabajadores asignados)
 * - Un trabajador deja un comentario (notifica al proveedor)
 */

const nodemailer = require('nodemailer');
const { User, Invoice, Supplier } = require('../models');
const logger = require('./logger');

/**
 * Crea transportador de email usando la misma configuración que emailService
 */
const createTransporter = () => {
  const password = process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWD || '';
  const user = process.env.EMAIL_USER || '';
  const host = process.env.EMAIL_HOST || '';
  const port = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : undefined;
  const secureEnv = (process.env.EMAIL_SECURE || '').toLowerCase();
  const secure = secureEnv === 'true' || port === 465;

  if (password && password.startsWith('SG.')) {
    return nodemailer.createTransport({
      host: host || 'smtp.sendgrid.net',
      port: port || 587,
      secure: secure || false,
      auth: {
        user: 'apikey',
        pass: password
      }
    });
  }

  if (host) {
    return nodemailer.createTransport({
      host: host,
      port: port || 587,
      secure: secure || false,
      auth: {
        user: user,
        pass: password
      }
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: password
    }
  });
};

/**
 * Genera HTML para email de notificación de comentario
 */
const generateCommentEmailHTML = (recipientName, senderName, senderRole, invoiceNumber, comment, invoiceUrl) => {
  const roleLabel = senderRole === 'proveedor' ? 'Proveedor' : 'Personal de Contaduría';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo Comentario en Factura</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background-color: #f8f9fa;
          border-radius: 10px;
          padding: 30px;
          margin: 20px 0;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #1976d2;
          margin-bottom: 10px;
        }
        .content {
          background-color: white;
          padding: 25px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .invoice-info {
          background-color: #e3f2fd;
          padding: 15px;
          border-radius: 6px;
          margin: 15px 0;
        }
        .comment-box {
          background-color: #f5f5f5;
          padding: 15px;
          border-left: 4px solid #1976d2;
          margin: 15px 0;
          font-style: italic;
        }
        .sender-info {
          color: #666;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .button {
          display: inline-block;
          background-color: #1976d2;
          color: white;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: 500;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">💬 PayQuetzal</div>
          <h2 style="color: #1976d2; margin: 10px 0;">Nuevo Comentario en Factura</h2>
        </div>
        
        <div class="content">
          <p>Hola <strong>${recipientName}</strong>,</p>
          
          <p>Has recibido un nuevo comentario en la factura:</p>
          
          <div class="invoice-info">
            <strong>📄 Factura #${invoiceNumber}</strong>
          </div>
          
          <div class="sender-info">
            <strong>De:</strong> ${senderName} (${roleLabel})
          </div>
          
          <div class="comment-box">
            "${comment}"
          </div>
          
          <p>Puedes ver y responder este comentario accediendo a la factura:</p>
          
          <div style="text-align: center;">
            <a href="${invoiceUrl}" class="button">Ver Factura y Comentarios</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Este es un mensaje automático del sistema PayQuetzal.</p>
          <p>Por favor, no respondas a este correo.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Envía notificación de comentario nuevo
 * @param {Object} comment - Comentario creado
 * @param {Object} invoice - Factura relacionada
 * @param {Object} sender - Usuario que creó el comentario
 */
const sendCommentNotification = async (comment, invoice, sender) => {
  try {
    const transporter = createTransporter();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const invoiceUrl = `${frontendUrl}/invoices/${invoice.id}`;
    
    const fromAddress = (process.env.EMAIL_FROM && process.env.EMAIL_FROM.includes('@'))
      ? process.env.EMAIL_FROM
      : (process.env.EMAIL_USER ? `${process.env.EMAIL_FROM || 'PayQuetzal'} <${process.env.EMAIL_USER}>` : (process.env.EMAIL_FROM || 'no-reply@payquetzal.com'));

    // Determinar destinatarios según el rol del que comenta
    let recipients = [];
    
    if (sender.role === 'proveedor') {
      // Si es proveedor, notificar a trabajadores de contaduría
      
      // 1. Notificar al usuario asignado si existe
      if (invoice.assigned_to) {
        const assignedUser = await User.findByPk(invoice.assigned_to);
        if (assignedUser && assignedUser.email) {
          recipients.push({
            email: assignedUser.email,
            name: assignedUser.name,
            role: assignedUser.role
          });
        }
      }
      
      // 2. Notificar a todos los administradores y contadores
      const adminUsers = await User.findAll({
        where: {
          role: ['super_admin', 'admin', 'contador'],
          is_active: true
        },
        attributes: ['email', 'name', 'role']
      });
      
      for (const admin of adminUsers) {
        if (admin.email && !recipients.find(r => r.email === admin.email)) {
          recipients.push({
            email: admin.email,
            name: admin.name,
            role: admin.role
          });
        }
      }
      
    } else {
      // Si es trabajador de contaduría, notificar al proveedor
      const supplier = await Supplier.findByPk(invoice.supplier_id, {
        include: [{
          model: User,
          as: 'users',
          where: { is_active: true },
          required: false
        }]
      });
      
      if (supplier && supplier.users) {
        for (const proveedorUser of supplier.users) {
          if (proveedorUser.email) {
            recipients.push({
              email: proveedorUser.email,
              name: proveedorUser.name,
              role: 'proveedor'
            });
          }
        }
      }
    }
    
    // Eliminar duplicados y el propio sender
    recipients = recipients.filter((recipient, index, self) => 
      recipient.email !== sender.email && 
      index === self.findIndex(r => r.email === recipient.email)
    );
    
    // Enviar emails a todos los destinatarios
    const emailPromises = recipients.map(async (recipient) => {
      const htmlContent = generateCommentEmailHTML(
        recipient.name,
        sender.name,
        sender.role,
        invoice.number,
        comment.comment,
        invoiceUrl
      );
      
      const mailOptions = {
        from: fromAddress,
        to: recipient.email,
        subject: `💬 Nuevo comentario en factura #${invoice.number}`,
        html: htmlContent
      };
      
      try {
        await transporter.sendMail(mailOptions);
        logger.info(`✅ Notificación de comentario enviada a ${recipient.email}`, {
          commentId: comment.id,
          invoiceId: invoice.id,
          recipientEmail: recipient.email
        });
        return { success: true, email: recipient.email };
      } catch (error) {
        logger.error(`❌ Error al enviar notificación a ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error: error.message };
      }
    });
    
    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    logger.info(`📧 Notificaciones de comentario enviadas: ${successCount} exitosas, ${failCount} fallidas`, {
      commentId: comment.id,
      invoiceId: invoice.id,
      totalRecipients: recipients.length
    });
    
    return {
      sent: successCount,
      failed: failCount,
      total: recipients.length
    };
    
  } catch (error) {
    logger.error('❌ Error al enviar notificaciones de comentario:', error);
    throw error;
  }
};

/**
 * Inicializa el servicio de notificaciones de comentarios
 */
const initializeCommentNotificationService = () => {
  logger.info('🔧 CommentNotificationService initialized');
};

module.exports = {
  sendCommentNotification,
  initializeCommentNotificationService
};
