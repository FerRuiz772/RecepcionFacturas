const bcrypt = require('bcrypt');

async function testPassword() {
    const storedHash = '$2b$12$.kFLqvjwIyzI8xQnlLMNuu.pa7Mp1nN2VK9IHL918Lmx5yj4mhVzm';
    
    const testPasswords = [
        'admin123',        // Contraseña original común
        'password',        // Otra común
        '123456',          // Otra común
        'test123',         // Otra común
        'nuevapassword',   // Si cambió a algo así
        'aquiles123'       // Basado en el username
    ];
    
    console.log('🔐 Probando contraseñas contra el hash almacenado...');
    
    for (const password of testPasswords) {
        try {
            const isValid = await bcrypt.compare(password, storedHash);
            console.log(`${password}: ${isValid ? '✅ VÁLIDA' : '❌ Inválida'}`);
        } catch (error) {
            console.log(`${password}: ❌ Error: ${error.message}`);
        }
    }
}

testPassword().catch(console.error);