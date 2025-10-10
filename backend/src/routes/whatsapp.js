const express = require('express');
const router = express.Router();
const whatsappService = require('../utils/whatsappService');

/**
 * @route GET /api/whatsapp/status
 * @desc Obtener el estado de la conexión de WhatsApp
 */
router.get('/status', async (req, res) => {
  try {
    const status = whatsappService.getConnectionStatus();
    res.json({
      success: true,
      status,
      enabled: process.env.WHATSAPP_ENABLED === 'true'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el estado de WhatsApp',
      error: error.message
    });
  }
});

/**
 * @route GET /api/whatsapp/qr
 * @desc Obtener el código QR de WhatsApp en formato de imagen o texto
 */
router.get('/qr', async (req, res) => {
  try {
    const qrData = whatsappService.getQRCode();
    
    if (!qrData) {
      return res.status(404).json({
        success: false,
        message: 'No hay código QR disponible. WhatsApp puede estar ya conectado o deshabilitado.'
      });
    }

    // Si se solicita en formato HTML
    if (req.query.format === 'html') {
      const html = `
<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR Code</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 90%;
    }
    h1 {
      color: #25D366;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .qr-container {
      background: white;
      padding: 1rem;
      border-radius: 0.5rem;
      display: inline-block;
      margin: 1rem 0;
    }
    pre {
      font-family: monospace;
      font-size: 0.5rem;
      line-height: 0.5rem;
      margin: 0;
      white-space: pre;
      text-align: left;
    }
    .instructions {
      margin-top: 1rem;
      color: #666;
      font-size: 0.9rem;
    }
    .step {
      background: #f5f5f5;
      padding: 0.5rem 1rem;
      margin: 0.5rem 0;
      border-radius: 0.5rem;
      text-align: left;
    }
    @media (max-width: 600px) {
      pre {
        font-size: 0.3rem;
        line-height: 0.3rem;
      }
    }
  </style>
  <script>
    // Auto-refresh cada 5 segundos
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  </script>
</head>
<body>
  <div class="container">
    <h1>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#25D366">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      Escanea el Código QR
    </h1>
    <div class="qr-container">
      <pre>${qrData}</pre>
    </div>
    <div class="instructions">
      <div class="step">
        <strong>1.</strong> Abre WhatsApp en tu teléfono
      </div>
      <div class="step">
        <strong>2.</strong> Ve a <strong>Configuración</strong> → <strong>Dispositivos vinculados</strong>
      </div>
      <div class="step">
        <strong>3.</strong> Toca <strong>"Vincular un dispositivo"</strong>
      </div>
      <div class="step">
        <strong>4.</strong> Escanea este código QR
      </div>
    </div>
    <p style="color: #999; font-size: 0.8rem; margin-top: 1rem;">
      Esta página se recargará automáticamente cada 5 segundos
    </p>
  </div>
</body>
</html>
      `;
      return res.send(html);
    }

    // Formato JSON por defecto
    res.json({
      success: true,
      qr: qrData,
      message: 'Escanea este código QR con WhatsApp'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el código QR',
      error: error.message
    });
  }
});

/**
 * @route POST /api/whatsapp/disconnect
 * @desc Desconectar WhatsApp
 */
router.post('/disconnect', async (req, res) => {
  try {
    await whatsappService.disconnect();
    res.json({
      success: true,
      message: 'WhatsApp desconectado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al desconectar WhatsApp',
      error: error.message
    });
  }
});

module.exports = router;
