/**
 * Servicio de envío de emails para PayQuetzal
 * 
 * Proporciona funcionalidades de envío de correos electrónicos usando Nodemailer
 * Soporta múltiples proveedores de SMTP (Gmail, SendGrid)
 * 
 * Funcionalidades principales:
 * - Envío de emails de recuperación de contraseña
 * - Notificaciones de cambios de estado de facturas
 * - Templates HTML responsivos para emails
 * - Detección automática de proveedor SMTP basado en configuración
 * 
 * Configuración por variables de entorno:
 * - EMAIL_USER: Usuario del servicio de email
 * - EMAIL_PASSWORD: Contraseña o API key (SendGrid: empieza con 'SG.')
 * - EMAIL_FROM: Email remitente para los mensajes
 * - FRONTEND_URL: URL base del frontend para links en emails
 * 
 * Proveedores soportados:
 * - Gmail: Configuración por service con credenciales
 * - SendGrid: SMTP con API key como contraseña
 */

const nodemailer = require('nodemailer');

/**
 * Crea y configura el transportador de email según el proveedor
 * Detecta automáticamente si usar SendGrid o Gmail basado en la contraseña
 * 
 * @returns {nodemailer.Transporter} Transportador configurado para envío
 */
const createTransporter = () => {
  // Detectar si usamos SendGrid (API key empieza con 'SG.')
  if (process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.startsWith('SG.')) {
    console.log('🔧 Using SendGrid SMTP configuration');
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false, // TLS en puerto 587
      auth: {
        user: 'apikey', // Usuario fijo para SendGrid
        pass: process.env.EMAIL_PASSWORD // API key de SendGrid
      }
    });
  } else {
    console.log('🔧 Using Gmail service configuration');
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // App password de Gmail
      }
    });
  }
};

/**
 * Envía email de recuperación de contraseña con token seguro
 * Genera un email HTML con branding de PayQuetzal y link de reset
 * 
 * @param {string} userEmail - Email destino del usuario
 * @param {string} userName - Nombre del usuario para personalización
 * @param {string} resetToken - Token único para resetear contraseña
 * @returns {Promise<boolean>} true si el email se envió exitosamente
 */
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    console.log('🔧 Creating transporter...');
    const transporter = createTransporter();
    console.log('📧 Transporter created successfully');
    
    // Construir URL de reset usando la URL del frontend
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password/${resetToken}`;
    console.log('🔗 Reset URL:', resetUrl);

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Recuperación de Contraseña - Sistema de Recepción de Facturas',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .email-container {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .header {
              background-color: #2c3e50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .button {
              display: inline-block;
              background-color: #3498db;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h1>PayQuetzal</h1>
              <p>Sistema de Gestión de Facturas</p>
            </div>
            <div class="content">
              <h2>Recuperación de Contraseña</h2>
              <p>Hola <strong>${userName}</strong>,</p>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el sistema PayQuetzal.</p>
              <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este enlace es válido por 1 hora únicamente</li>
                  <li>Solo puede ser usado una vez</li>
                  <li>Si no solicitaste este cambio, ignora este email</li>
                </ul>
              </div>
              
              <p>Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
              <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
              
              <p>Si no solicitaste el restablecimiento de contraseña, puedes ignorar este correo electrónico.</p>
              
              <p>Saludos,<br>
              <strong>Equipo PayQuetzal</strong></p>
            </div>
            <div class="footer">
              <p>Este es un correo automático, por favor no responder.</p>
              <p>© 2024 PayQuetzal - Sistema de Gestión de Facturas</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Enviando email...');
    console.log('📧 From:', mailOptions.from);
    console.log('📧 To:', mailOptions.to);

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de recuperación enviado exitosamente:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email de recuperación:', error);
    throw error;
  }
};

/**
 * Clase principal del servicio de email
 * Mantiene compatibilidad con el código existente y proporciona métodos adicionales
 */
class EmailService {
  constructor() {
    this.initialized = true;
    console.log('🔧 EmailService initialized with automatic SMTP detection');
  }

  /**
   * Envía email de recuperación de contraseña
   * Wrapper para mantener compatibilidad con la interfaz existente
   * 
   * @param {string} userEmail - Email destino del usuario
   * @param {string} userName - Nombre del usuario
   * @param {string} resetToken - Token de reset único
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    console.log('🔧 Iniciando envío de email de recuperación...');
    console.log('📧 Email destino:', userEmail);
    console.log('👤 Nombre usuario:', userName);
    console.log('🔑 Token:', resetToken);
    
    try {
      await sendPasswordResetEmail(userEmail, userName, resetToken);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Método genérico para enviar emails personalizados
   * Útil para notificaciones y comunicaciones del sistema
   * 
   * @param {string} to - Email destino
   * @param {string} subject - Asunto del email
   * @param {string} htmlContent - Contenido HTML del email
   * @returns {Promise<Object>} Resultado del envío con messageId
   */
  async sendEmail(to, subject, htmlContent) {
    try {
      console.log('🔧 Iniciando envío de email genérico...');
      console.log('📧 Email destino:', to);
      console.log('📧 Subject:', subject);
      
      const transporter = createTransporter();
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: to,
        subject: subject,
        html: htmlContent
      };

      console.log('📤 Enviando email...');
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', info.messageId);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error enviando email desde emailService.js:', error);
      throw error;
    }
  }

  /**
   * Verifica la configuración del servicio de email
   * Útil para debugging y verificación de conectividad
   * 
   * @returns {Promise<boolean>} true si la configuración es válida
   */
  async verifyConfiguration() {
    try {
      const transporter = createTransporter();
      await transporter.verify();
      console.log('✅ Configuración de email verificada exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error en configuración de email:', error);
      return false;
    }
  }
}

// Exportar instancia única del servicio
module.exports = new EmailService();