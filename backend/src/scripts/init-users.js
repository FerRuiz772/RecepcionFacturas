/**
 * @fileoverview Script de inicialización segura de usuarios del sistema
 * Crea usuarios por defecto con contraseñas aleatorias generadas dinámicamente
 * Utiliza variables de entorno para configuración de base de datos
 * 
 * IMPORTANTE: Este script debe ejecutarse SOLO en entornos de desarrollo/testing
 * Para producción, los usuarios deben crearse manualmente con contraseñas seguras
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config({ path: '../../.env' });

/**
 * Genera una contraseña aleatoria segura
 * @param {number} length - Longitud de la contraseña (mínimo 12)
 * @returns {string} Contraseña aleatoria segura
 */
function generateSecurePassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Asegurar al menos un carácter de cada tipo
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Mayúscula
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Minúscula  
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Número
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Símbolo
    
    // Completar con caracteres aleatorios
    for (let i = 4; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Inicializa usuarios del sistema con contraseñas seguras
 * @async
 * @function initializeUsers
 */
async function initializeUsers() {
    try {
        // Verificar que estamos en entorno de desarrollo
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ Este script NO debe ejecutarse en producción');
            console.error('❌ En producción, crea usuarios manualmente con contraseñas seguras');
            process.exit(1);
        }

        // Usar configuración de base de datos desde variables de entorno
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'admin',
            password: process.env.DB_PASSWORD || 'admin123',
            database: process.env.DB_NAME || 'recepcion_facturas'
        };

        console.log('🔐 Conectando a la base de datos para inicializar usuarios...');
        const connection = await mysql.createConnection(dbConfig);

        // Generar contraseñas seguras aleatorias
        const passwords = {
            admin: generateSecurePassword(20),
            contaduria: generateSecurePassword(18),
            trabajador: generateSecurePassword(16),
            proveedor: generateSecurePassword(16)
        };

        // Crear contraseñas hasheadas
        const adminPassword = await bcrypt.hash(passwords.admin, 12);
        const contaduriaPassword = await bcrypt.hash(passwords.contaduria, 12);
        const trabajadorPassword = await bcrypt.hash(passwords.trabajador, 12);
        const proveedorPassword = await bcrypt.hash(passwords.proveedor, 12);

        // Actualizar usuarios con contraseñas hasheadas
        const users = [
            { id: 1, password: adminPassword },
            { id: 2, password: contaduriaPassword },
            { id: 3, password: trabajadorPassword },
            { id: 4, password: proveedorPassword }
        ];

        for (const user of users) {
            await connection.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                [user.password, user.id]
            );
        }

        console.log('✅ Usuarios inicializados correctamente con contraseñas seguras:');
        console.log('🔑 GUARDA ESTAS CONTRASEÑAS EN UN LUGAR SEGURO:');
        console.log('👤 Super Admin (admin@recepcionfacturas.com):', passwords.admin);
        console.log('👤 Admin Contaduría (contaduria@recepcionfacturas.com):', passwords.contaduria);
        console.log('👤 Trabajador (trabajador@recepcionfacturas.com):', passwords.trabajador);
        console.log('👤 Proveedor (proveedor@recepcionfacturas.com):', passwords.proveedor);
        console.log('');
        console.log('⚠️  IMPORTANTE: Cambia estas contraseñas después del primer login');
        console.log('⚠️  IMPORTANTE: No compartas estas contraseñas por canales inseguros');

        await connection.end();
        
    } catch (error) {
        console.error('❌ Error inicializando usuarios:', error);
        console.error('💡 Verifica que:');
        console.error('   - La base de datos esté funcionando');
        console.error('   - Las credenciales en .env sean correctas');
        console.error('   - La tabla users exista');
        process.exit(1);
    }
}

// Solo ejecutar si no estamos en producción
if (process.env.NODE_ENV !== 'production') {
    initializeUsers();
} else {
    console.error('❌ BLOQUEADO: No se puede ejecutar en producción');
    console.error('📋 En producción usa el panel de administración para crear usuarios');
    process.exit(1);
}