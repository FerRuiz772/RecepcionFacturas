const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function initializeUsers() {
    try {
        // Conectar a la base de datos
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'admin',
            password: 'admin123',
            database: 'recepcion_facturas'
        });

        console.log('Conectado a la base de datos para inicializar usuarios...');

        // Crear contraseñas hasheadas
        const adminPassword = await bcrypt.hash('admin123', 12);
        const contaduriaPassword = await bcrypt.hash('contaduria123', 12);
        const trabajadorPassword = await bcrypt.hash('trabajador123', 12);
        const proveedorPassword = await bcrypt.hash('proveedor123', 12);

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

        console.log('✅ Usuarios inicializados correctamente:');
        console.log('👤 Super Admin: admin@recepcionfacturas.com / admin123');
        console.log('👤 Admin Contaduría: contaduria@recepcionfacturas.com / contaduria123');
        console.log('👤 Trabajador: trabajador@recepcionfacturas.com / trabajador123');
        console.log('👤 Proveedor: proveedor@recepcionfacturas.com / proveedor123');

        await connection.end();
    } catch (error) {
        console.error('❌ Error inicializando usuarios:', error);
        process.exit(1);
    }
}

initializeUsers();