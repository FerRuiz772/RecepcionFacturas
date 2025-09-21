const bcrypt = require('bcrypt');

async function createNewPassword() {
    const newPassword = 'admin123'; // Contraseña temporal
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    
    console.log('🔐 Generando hash para contraseña temporal: admin123');
    const hashedPassword = await bcrypt.hash(newPassword, rounds);
    console.log('✅ Hash generado:', hashedPassword);
    
    // Verificar que el hash funciona
    const isValid = await bcrypt.compare(newPassword, hashedPassword);
    console.log('🔍 Verificación del hash:', isValid ? '✅ VÁLIDO' : '❌ INVÁLIDO');
    
    return hashedPassword;
}

createNewPassword().catch(console.error);