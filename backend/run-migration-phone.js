/**
 * Script para ejecutar migración: Añadir campo phone a tabla users
 * Ejecutar: node run-migration-phone.js
 */

const sequelize = require('./src/config/database');

async function runMigration() {
    try {
        console.log('🔧 Iniciando migración: Añadir campo phone a users...');
        
        // Conectar a la base de datos
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida');

        // Verificar si el campo ya existe
        const [results] = await sequelize.query(`
            SELECT COUNT(*) as count 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'recepcion_facturas'}'
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'phone'
        `);

        if (results[0].count > 0) {
            console.log('⚠️  El campo phone ya existe en la tabla users');
            console.log('✅ Migración no necesaria');
            process.exit(0);
        }

        // Ejecutar migración: Añadir campo phone
        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN phone VARCHAR(20) NULL 
            COMMENT 'Número de teléfono para notificaciones por WhatsApp (sin código de país, ej: 12345678)'
        `);
        console.log('✅ Campo phone añadido exitosamente');

        // Crear índice
        await sequelize.query(`
            CREATE INDEX idx_users_phone ON users(phone)
        `);
        console.log('✅ Índice idx_users_phone creado exitosamente');

        // Mostrar resumen
        const [users] = await sequelize.query(`
            SELECT 
                id, 
                name, 
                email, 
                phone, 
                role,
                is_active
            FROM users
            LIMIT 5
        `);

        console.log('\n📊 Primeros 5 usuarios (verificación):');
        console.table(users);

        // Estadísticas
        const [stats] = await sequelize.query(`
            SELECT 
                role,
                COUNT(*) as total_users,
                SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as users_with_phone,
                CONCAT(
                    ROUND(
                        (SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
                        2
                    ),
                    '%'
                ) as percentage_with_phone
            FROM users
            WHERE is_active = 1
            GROUP BY role
        `);

        console.log('\n📈 Estadísticas por rol:');
        console.table(stats);

        console.log('\n✅ Migración completada exitosamente');
        console.log('\n📝 Próximo paso: Añadir números de teléfono a los usuarios');
        console.log('   Ejemplo: UPDATE users SET phone = "12345678" WHERE email = "usuario@example.com";');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

runMigration();
