const nodemailer = require('nodemailer');

const createTransporter = () => {
  // Detectar si usamos SendGrid (si el password empieza con 'SG.')
  if (process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.startsWith('SG.')) {
    console.log('🔧 Using SendGrid SMTP configuration');
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } else {
    console.log('🔧 Using Gmail service configuration');
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
};

const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    console.log('🔧 Creating transporter...');
    const transporter = createTransporter();
    console.log('📧 Transporter created successfully');
    
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
              background-color: #f8f5ed;
            }
            .email-header {
              text-align: center;
              background-color: #667eea;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .email-body {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .reset-button {
              display: inline-block;
              background-color: #667eea;
              color: white !important;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
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
            <div class="email-header">
              <h1>📋 Sistema de Recepción de Facturas</h1>
              <h2>Recuperación de Contraseña</h2>
            </div>
            <div class="email-body">
              <p>Hola <strong>${userName}</strong>,</p>
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en el Sistema de Recepción de Facturas.</p>
              <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="reset-button">🔑 Restablecer Contraseña</a>
              </div>
              <p><strong>Este enlace expirará en 1 hora por seguridad.</strong></p>
              <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu contraseña no será cambiada.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p><small>Si el botón no funciona, copia y pega este enlace en tu navegador:</small></p>
              <p><small><a href="${resetUrl}">${resetUrl}</a></small></p>
            </div>
            <div class="footer">
              <p>Este es un mensaje automático, por favor no responder a este correo.</p>
              <p>&copy; ${new Date().getFullYear()} Sistema de Recepción de Facturas. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    console.log('📤 Sending email...');
    console.log('📧 From:', mailOptions.from);
    console.log('📧 To:', mailOptions.to);
    console.log('📧 Subject:', mailOptions.subject);

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado exitosamente:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email desde emailService.js:', error);
    throw error;
  }
};

// Crear una instancia del servicio para mantener compatibilidad
class EmailService {
  constructor() {
    this.initialized = true;
    console.log('🔧 EmailService initialized with automatic SMTP detection');
  }

  async sendPasswordResetEmail(userEmail, userName, resetToken) {
    console.log('🔧 Iniciando envío de email de recuperación...');
    console.log('📧 Email destino:', userEmail);
    console.log('👤 Nombre usuario:', userName);
    console.log('🔑 Token:', resetToken);
    return await sendPasswordResetEmail(userEmail, userName, resetToken);
  }

  // Método genérico para enviar emails
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

      console.log('📤 Sending email...');
      console.log('📧 From:', mailOptions.from);
      console.log('📧 To:', mailOptions.to);
      console.log('📧 Subject:', mailOptions.subject);

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email enviado exitosamente:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error enviando email desde emailService.js:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();