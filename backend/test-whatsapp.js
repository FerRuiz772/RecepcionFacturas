/**
 * Script de prueba para WhatsApp
 * Ejecutar: node test-whatsapp.js
 */

require('dotenv').config();
const whatsappService = require('./src/utils/whatsappService');

console.log('\n🧪 Iniciando prueba de WhatsApp...\n');
console.log('Configuración:');
console.log('- WHATSAPP_ENABLED:', process.env.WHATSAPP_ENABLED);
console.log('- WHATSAPP_SESSION_PATH:', process.env.WHATSAPP_SESSION_PATH);
console.log('- WHATSAPP_COUNTRY_CODE:', process.env.WHATSAPP_COUNTRY_CODE);
console.log('\n');

async function test() {
    try {
        console.log('🔄 Llamando a whatsappService.initialize()...\n');
        await whatsappService.initialize();
        console.log('\n✅ WhatsApp inicializado correctamente');
        console.log('📱 Ahora puedes escanear el código QR con tu teléfono\n');
        console.log('Instrucciones:');
        console.log('1. Abre WhatsApp en tu celular');
        console.log('2. Ve a Configuración → Dispositivos vinculados');
        console.log('3. Toca "Vincular un dispositivo"');
        console.log('4. Escanea el código QR que aparece arriba\n');
        
        // Mantener el proceso vivo para que no se cierre
        console.log('⏳ Esperando conexión... (Presiona Ctrl+C para salir)\n');
    } catch (error) {
        console.error('\n❌ Error al inicializar WhatsApp:', error.message);
        console.error('\nStack trace:');
        console.error(error.stack);
        process.exit(1);
    }
}

test();
