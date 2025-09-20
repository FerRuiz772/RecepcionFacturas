const { User, UserPermission } = require('../models');

/**
 * Script para migrar usuarios existentes del sistema de roles al sistema de permisos granulares
 * Asigna permisos por defecto basados en el rol del usuario
 */
async function migrateUserPermissions() {
    console.log('🔄 Iniciando migración de permisos de usuarios...');
    
    try {
        // Mapa de permisos por rol
        const defaultPermissions = {
            super_admin: [
                'facturas.ver_todas', 'facturas.crear', 'facturas.editar', 'facturas.eliminar',
                'documentos.ver_todos', 'documentos.subir', 'documentos.eliminar', 'documentos.validar',
                'usuarios.ver_todos', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
                'proveedores.ver_todos', 'proveedores.crear', 'proveedores.editar', 'proveedores.eliminar'
            ],
            admin_contaduria: [
                'facturas.ver_todas', 'facturas.crear', 'facturas.editar', 'facturas.eliminar',
                'documentos.ver_todos', 'documentos.subir', 'documentos.eliminar', 'documentos.validar',
                'usuarios.ver_todos', 'usuarios.crear',
                'proveedores.ver_todos', 'proveedores.crear'
            ],
            trabajador_contaduria: [
                'facturas.ver_propias', 'facturas.crear',
                'documentos.ver_propios', 'documentos.subir',
                'proveedores.ver_todos'
            ],
            proveedor: [
                'facturas.ver_propias',
                'documentos.ver_propios', 'documentos.subir',
                'proveedores.ver_propios', 'proveedores.editar'
            ]
        };

        // Obtener todos los usuarios
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role'],
            include: [{
                model: UserPermission,
                as: 'userPermissions',
                required: false,
                attributes: ['permission_key', 'granted']
            }]
        });

        console.log(`📊 Encontrados ${users.length} usuarios para migrar`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Verificar si el usuario ya tiene permisos asignados
            if (user.userPermissions && user.userPermissions.length > 0) {
                console.log(`⏭️  Usuario ${user.name} (${user.email}) ya tiene permisos asignados - saltando`);
                skippedCount++;
                continue;
            }

            // Obtener permisos por defecto según el rol
            const permissions = defaultPermissions[user.role] || [];
            
            if (permissions.length === 0) {
                console.log(`⚠️  Rol desconocido para usuario ${user.name} (${user.email}): ${user.role} - saltando`);
                skippedCount++;
                continue;
            }

            // Asignar permisos
            const permissionData = permissions.map(permission => ({
                user_id: user.id,
                permission_key: permission,
                granted: true
            }));

            await UserPermission.bulkCreate(permissionData);
            
            console.log(`✅ Usuario ${user.name} (${user.email}) - ${user.role}: ${permissions.length} permisos asignados`);
            migratedCount++;
        }

        console.log('\n📈 Resumen de migración:');
        console.log(`   ✅ Usuarios migrados: ${migratedCount}`);
        console.log(`   ⏭️  Usuarios saltados: ${skippedCount}`);
        console.log(`   📊 Total procesados: ${users.length}`);
        console.log('\n🎉 Migración completada exitosamente!');

        return { migratedCount, skippedCount, totalUsers: users.length };

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        throw error;
    }
}

/**
 * Función para verificar la migración
 * Muestra el estado de los permisos por usuario
 */
async function verifyMigration() {
    console.log('\n🔍 Verificando migración...');
    
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role'],
            include: [{
                model: UserPermission,
                as: 'userPermissions',
                where: { granted: true },
                required: false,
                attributes: ['permission_key']
            }]
        });

        console.log('\n📋 Estado de permisos por usuario:');
        for (const user of users) {
            const permissionKeys = user.userPermissions ? user.userPermissions.map(p => p.permission_key) : [];
            console.log(`\n👤 ${user.name} (${user.email}) - Rol: ${user.role}`);
            console.log(`   🔑 Permisos (${permissionKeys.length}):`);
            
            if (permissionKeys.length === 0) {
                console.log('      ⚠️  Sin permisos asignados');
            } else {
                permissionKeys.forEach(permission => {
                    console.log(`      ✓ ${permission}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        throw error;
    }
}

// Función principal para ejecutar desde línea de comandos
async function main() {
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'migrate':
                await migrateUserPermissions();
                break;
            case 'verify':
                await verifyMigration();
                break;
            case 'migrate-and-verify':
                await migrateUserPermissions();
                await verifyMigration();
                break;
            default:
                console.log('📖 Uso del script:');
                console.log('   node migrate-permissions.js migrate        - Migrar permisos');
                console.log('   node migrate-permissions.js verify         - Verificar migración');
                console.log('   node migrate-permissions.js migrate-and-verify - Migrar y verificar');
                process.exit(1);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('💥 Error:', error.message);
        process.exit(1);
    }
}

// Si se ejecuta directamente
if (require.main === module) {
    main();
}

module.exports = {
    migrateUserPermissions,
    verifyMigration
};