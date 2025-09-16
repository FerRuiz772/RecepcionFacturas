const { Sequelize } = require('sequelize');

// Configurar la conexión con charset UTF-8
const sequelize = new Sequelize(
    'recepcion_facturas',
    'admin',
    'admin123',
    {
        host: 'localhost',
        port: 3306,
        dialect: 'mysql',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        dialectOptions: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            multipleStatements: false,
            supportBigNumbers: true,
            bigNumberStrings: true,
            initSqlCommands: [
                'SET NAMES utf8mb4',
                'SET character_set_client = utf8mb4',
                'SET character_set_connection = utf8mb4',
                'SET character_set_results = utf8mb4'
            ]
        }
    }
);

async function testCharset() {
    try {
        console.log('🔍 Testando conexión y charset...');
        
        // Probar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos exitosa');
        
        // Probar query con caracteres especiales
        const [results] = await sequelize.query('SELECT id, business_name FROM suppliers LIMIT 3');
        
        console.log('\n📋 Datos de proveedores:');
        results.forEach(supplier => {
            console.log(`  ID: ${supplier.id}, Nombre: ${supplier.business_name}`);
        });
        
        // Probar usuarios también
        const [users] = await sequelize.query('SELECT id, name FROM users LIMIT 3');
        
        console.log('\n👥 Datos de usuarios:');
        users.forEach(user => {
            console.log(`  ID: ${user.id}, Nombre: ${user.name}`);
        });
        
        console.log('\n✅ Test completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await sequelize.close();
    }
}

testCharset();
