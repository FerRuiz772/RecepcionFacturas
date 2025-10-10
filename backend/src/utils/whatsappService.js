/**
 * Servicio de WhatsApp para PayQuetzal
 * 
 * Proporciona funcionalidades de envío de mensajes usando Baileys
 * Maneja conexión, autenticación, envío y reconexiones automáticas
 * 
 * Funcionalidades principales:
 * - Conexión persistente con WhatsApp usando Baileys
 * - Envío de mensajes de texto
 * - Envío de mensajes con imagen (opcional)
 * - Reconexión automática en caso de desconexión
 * - Validación y formateo de números telefónicos
 * - Cola de mensajes para envíos simultáneos
 * 
 * Configuración por variables de entorno:
 * - WHATSAPP_ENABLED: true/false (habilitar/deshabilitar servicio)
 * - WHATSAPP_SESSION_PATH: ruta para guardar sesión (default: ./whatsapp_session)
 * - WHATSAPP_COUNTRY_CODE: código de país por defecto (default: 502 para Guatemala)
 * - WHATSAPP_MAX_RETRIES: número máximo de reintentos (default: 3)
 * - WHATSAPP_RETRY_DELAY: delay entre reintentos en ms (default: 5000)
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, delay } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

/**
 * Clase principal del servicio de WhatsApp
 * Mantiene la conexión con WhatsApp y proporciona métodos para enviar mensajes
 */
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.messageQueue = [];
    this.processingQueue = false;
    this.currentQR = null; // Guardar el QR actual
    this.enabled = process.env.WHATSAPP_ENABLED === 'true';
    this.sessionPath = process.env.WHATSAPP_SESSION_PATH || './whatsapp_session';
    this.countryCode = process.env.WHATSAPP_COUNTRY_CODE || '502';
    this.maxRetries = parseInt(process.env.WHATSAPP_MAX_RETRIES || '3', 10);
    this.retryDelay = parseInt(process.env.WHATSAPP_RETRY_DELAY || '5000', 10);
    
    console.log('🔧 WhatsAppService initialized');
    console.log(`📱 WhatsApp ${this.enabled ? 'ENABLED' : 'DISABLED'}`);
    if (!this.enabled) {
      console.log('⚠️ WhatsApp está deshabilitado. Configura WHATSAPP_ENABLED=true para habilitarlo.');
    }
  }

  /**
   * Inicializa la conexión con WhatsApp
   * Carga el estado de autenticación y establece la conexión
   * Maneja el QR code para autenticación inicial
   */
  async initialize() {
    if (!this.enabled) {
      console.log('⚠️ WhatsApp deshabilitado. No se inicializará la conexión.');
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ Ya hay una conexión en proceso...');
      return;
    }

    try {
      this.isConnecting = true;
      console.log('🔧 Inicializando conexión WhatsApp...');
      console.log(`📁 Ruta de sesión: ${this.sessionPath}`);

      // Cargar estado de autenticación
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);

      // Crear socket de WhatsApp
      this.sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }), // Desactivar logs de Baileys
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        getMessage: async () => undefined
      });

      // Listener para cambios de conexión
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Mostrar QR code si está disponible
        if (qr) {
          this.currentQR = qr; // Guardar el QR
          console.log('\n📱 ══════════════════════════════════════════════════════');
          console.log('📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP');
          console.log('📱 ══════════════════════════════════════════════════════\n');
          qrcode.generate(qr, { small: true });
          console.log('\n📱 ══════════════════════════════════════════════════════');
          console.log('📱 Abre WhatsApp > Configuración > Dispositivos vinculados');
          console.log('📱 O visita: http://localhost:3000/api/whatsapp/qr?format=html');
          console.log('📱 ══════════════════════════════════════════════════════\n');
        }

        // Conexión establecida
        if (connection === 'open') {
          this.isConnected = true;
          this.isConnecting = false;
          this.currentQR = null; // Limpiar el QR al conectar
          console.log('✅ WhatsApp conectado exitosamente');
          console.log('📱 WhatsApp listo para enviar mensajes');
          
          // Procesar cola de mensajes pendientes
          if (this.messageQueue.length > 0) {
            console.log(`📤 Procesando ${this.messageQueue.length} mensajes en cola...`);
            this.processQueue();
          }
        }

        // Conexión cerrada
        if (connection === 'close') {
          this.isConnected = false;
          this.isConnecting = false;
          
          const shouldReconnect = (lastDisconnect?.error instanceof Boom) 
            && lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
          
          const reason = lastDisconnect?.error?.output?.statusCode || 'desconocida';
          console.log(`❌ Conexión WhatsApp cerrada: ${reason}`);
          
          if (shouldReconnect) {
            console.log(`🔄 Reconectando en ${this.retryDelay / 1000} segundos...`);
            setTimeout(() => this.initialize(), this.retryDelay);
          } else {
            console.log('⚠️ Sesión de WhatsApp cerrada. Necesitas volver a autenticar.');
            console.log('💡 Elimina la carpeta whatsapp_session y reinicia el servidor.');
          }
        }
      });

      // Guardar credenciales cuando cambien
      this.sock.ev.on('creds.update', saveCreds);

    } catch (error) {
      this.isConnecting = false;
      console.error('❌ Error inicializando WhatsApp:', error.message);
      
      // Reintentar después de un delay
      console.log(`🔄 Reintentando en ${this.retryDelay / 1000} segundos...`);
      setTimeout(() => this.initialize(), this.retryDelay);
    }
  }

  /**
   * Formatea un número de teléfono al formato requerido por Baileys
   * Añade código de país si no está presente y formato @s.whatsapp.net
   * 
   * @param {string} phone - Número de teléfono (puede tener o no código de país)
   * @returns {string} Número formateado para Baileys (ej: 50212345678@s.whatsapp.net)
   */
  formatPhoneNumber(phone) {
    if (!phone) {
      throw new Error('Número de teléfono no proporcionado');
    }

    // Eliminar todos los caracteres no numéricos
    const cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.length === 0) {
      throw new Error('Número de teléfono inválido');
    }

    // Añadir código de país si no está presente
    let withCountry = cleaned;
    if (!cleaned.startsWith(this.countryCode)) {
      withCountry = `${this.countryCode}${cleaned}`;
    }

    // Validar longitud (502 + 8 dígitos para Guatemala)
    if (this.countryCode === '502' && withCountry.length !== 11) {
      console.warn(`⚠️ Advertencia: número ${withCountry} no tiene formato esperado (502 + 8 dígitos)`);
    }

    // Formato Baileys
    return `${withCountry}@s.whatsapp.net`;
  }

  /**
   * Envía un mensaje de texto a un número de WhatsApp
   * Si no está conectado, añade a cola para envío posterior
   * 
   * @param {string} phoneNumber - Número de teléfono destino
   * @param {string} message - Mensaje de texto a enviar
   * @param {number} retryCount - Contador interno de reintentos
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMessage(phoneNumber, message, retryCount = 0) {
    if (!this.enabled) {
      console.log('⚠️ WhatsApp deshabilitado. Mensaje no enviado.');
      return { success: false, reason: 'WhatsApp deshabilitado' };
    }

    try {
      // Validar parámetros
      if (!phoneNumber || !message) {
        throw new Error('Número de teléfono y mensaje son requeridos');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      // Si no está conectado, añadir a cola
      if (!this.isConnected) {
        console.log(`📥 WhatsApp no conectado. Añadiendo mensaje a cola para ${phoneNumber}`);
        this.messageQueue.push({ phoneNumber, message, formattedNumber });
        
        // Intentar conectar si no está en proceso
        if (!this.isConnecting) {
          this.initialize();
        }
        
        return { success: false, queued: true, reason: 'No conectado, mensaje en cola' };
      }

      // Enviar mensaje
      console.log(`📤 Enviando WhatsApp a ${formattedNumber}...`);
      await this.sock.sendMessage(formattedNumber, { text: message });
      console.log(`✅ WhatsApp enviado exitosamente a ${phoneNumber}`);
      
      return { success: true, phoneNumber, formattedNumber };

    } catch (error) {
      console.error(`❌ Error enviando WhatsApp a ${phoneNumber}:`, error.message);
      
      // Reintentar si no se alcanzó el máximo
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Reintento ${retryCount + 1}/${this.maxRetries} en ${this.retryDelay / 1000}s...`);
        await delay(this.retryDelay);
        return this.sendMessage(phoneNumber, message, retryCount + 1);
      }
      
      return { success: false, phoneNumber, error: error.message };
    }
  }

  /**
   * Envía un mensaje con imagen
   * 
   * @param {string} phoneNumber - Número de teléfono destino
   * @param {string} message - Mensaje de texto (caption)
   * @param {string} imageUrl - URL o path de la imagen
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMessageWithImage(phoneNumber, message, imageUrl) {
    if (!this.enabled) {
      console.log('⚠️ WhatsApp deshabilitado. Mensaje no enviado.');
      return { success: false, reason: 'WhatsApp deshabilitado' };
    }

    try {
      if (!this.isConnected) {
        return { success: false, reason: 'WhatsApp no conectado' };
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      await this.sock.sendMessage(formattedNumber, {
        image: { url: imageUrl },
        caption: message
      });
      
      console.log(`✅ WhatsApp con imagen enviado a ${phoneNumber}`);
      return { success: true, phoneNumber, formattedNumber };

    } catch (error) {
      console.error(`❌ Error enviando WhatsApp con imagen a ${phoneNumber}:`, error.message);
      return { success: false, phoneNumber, error: error.message };
    }
  }

  /**
   * Verifica si WhatsApp está conectado y listo
   * 
   * @returns {Promise<boolean>}
   */
  async verifyConnection() {
    if (!this.enabled) {
      return false;
    }
    
    if (!this.isConnected) {
      console.log('⚠️ WhatsApp no está conectado');
      return false;
    }
    
    return true;
  }

  /**
   * Obtiene el código QR actual (si está disponible)
   * 
   * @returns {string|null} El código QR en formato texto o null si no está disponible
   */
  getQRCode() {
    if (!this.currentQR) {
      return null;
    }
    
    // Generar el QR en formato ASCII para mostrar en HTML
    const qrcode = require('qrcode');
    let qrText = '';
    
    // Generar QR en formato ASCII (síncronamente)
    const qr = require('qrcode-terminal');
    const stream = {
      write: (text) => { qrText += text; }
    };
    
    qr.generate(this.currentQR, { small: false }, (qrCode) => {
      qrText = qrCode;
    });
    
    return qrText || this.currentQR;
  }

  /**
   * Obtiene el estado de la conexión
   * 
   * @returns {Object} Estado detallado
   */
  getConnectionStatus() {
    return {
      enabled: this.enabled,
      connected: this.isConnected,
      connecting: this.isConnecting,
      queueLength: this.messageQueue.length,
      hasQR: !!this.currentQR
    };
  }

  /**
   * Procesa la cola de mensajes pendientes
   * Envía los mensajes uno por uno con delay para evitar spam
   */
  async processQueue() {
    if (this.processingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    while (this.messageQueue.length > 0 && this.isConnected) {
      const { phoneNumber, message } = this.messageQueue.shift();
      
      try {
        await this.sendMessage(phoneNumber, message);
        // Delay entre mensajes para evitar ser marcado como spam
        await delay(3000);
      } catch (error) {
        console.error(`Error procesando mensaje de cola para ${phoneNumber}:`, error.message);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Desconecta el servicio de WhatsApp
   */
  async disconnect() {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
      this.isConnected = false;
      console.log('👋 WhatsApp desconectado');
    }
  }
}

module.exports = new WhatsAppService();
