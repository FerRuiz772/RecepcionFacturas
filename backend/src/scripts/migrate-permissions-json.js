const { User } = require('../models');

/**
 * Script para migrar usuarios al sistema de permisos JSON
 * Asigna permisos por defecto basados en el rol del usuario
 */
async function migrateUserPermissionsToJSON() {
    console.log('🔄 Iniciando migración de permisos a JSON...');
    
    try {
        // Mapa de permisos por rol - formato JSON
        const defaultPermissions = {
            super_admin: {
                invoices: { view: true, create: true, edit: true, delete: true },
                documents: { view: true, upload: true, delete: true, validate: true },
                users: { view: true, create: true, edit: true, delete: true },
                suppliers: { view: true, create: true, edit: true, delete: true },
                dashboard: { view: true },
                payments: { view: true, edit: true }
            },
            admin_contaduria: {
                invoices: { view: true, create: true, edit: true, delete: true },
                documents: { view: true, upload: true, delete: true, validate: true },
                users: { view: true, create: true },
                suppliers: { view: true, create: true, edit: true },
                dashboard: { view: true },
                payments: { view: true, edit: true }
            },
            trabajador_contaduria: {
                invoices: { view: true, create: true },
                documents: { view: true, upload: true },
                suppliers: { view: true },
                dashboard: { view: true },
                payments: { view: true }
            },
            proveedor: {
                invoices: { view: true, create: true },
                documents: { view: true, upload: true },
                suppliers: { view: true, edit: true },
                dashboard: { view: true }
            }
        };

        // Obtener todos los usuarios
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'permissions']
        });

        console.log(`📊 Encontrados ${users.length} usuarios para migrar`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            // Verificar si el usuario ya tiene permisos JSON asignados
            if (user.permissions && Object.keys(user.permissions).length > 0) {
                console.log(`⏭️  Usuario ${user.name} (${user.email}) ya tiene permisos JSON - saltando`);
                skippedCount++;
                continue;
            }

            // Obtener permisos por defecto según el rol
            const permissions = defaultPermissions[user.role];
            
            if (!permissions) {
                console.log(`⚠️  Rol desconocido para usuario ${user.name} (${user.email}): ${user.role} - saltando`);
                skippedCount++;
                continue;
            }

            // Asignar permisos JSON
            await user.update({ permissions: permissions });
            
            const permissionCount = Object.keys(permissions).length;
            console.log(`✅ Usuario ${user.name} (${user.email}) - ${user.role}: ${permissionCount} módulos de permisos asignados`);
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
 * Función para verificar la migración JSON
 * Muestra el estado de los permisos por usuario
 */
async function verifyJSONMigration() {
    console.log('\n🔍 Verificando migración JSON...');
    
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role', 'permissions']
        });

        console.log('\n📋 Estado de permisos JSON por usuario:');
        for (const user of users) {
            console.log(`\n👤 ${user.name} (${user.email}) - Rol: ${user.role}`);
            
            if (!user.permissions || Object.keys(user.permissions).length === 0) {
                console.log('      ⚠️  Sin permisos JSON asignados');
            } else {
                console.log(`   🔑 Permisos JSON (${Object.keys(user.permissions).length} módulos):`);
                for (const [module, actions] of Object.entries(user.permissions)) {
                    const enabledActions = Object.entries(actions).filter(([action, enabled]) => enabled).map(([action]) => action);
                    console.log(`      ✓ ${module}: [${enabledActions.join(', ')}]`);
                }
            }
        }

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        throw error;
    }
}

/**
 * Función para forzar permisos a un usuario específico
 */
async function forceUserPermissions(userId, role = null) {
    console.log(`🔧 Forzando permisos para usuario ID: ${userId}`);
    
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            throw new Error(`Usuario con ID ${userId} no encontrado`);
        }

        const targetRole = role || user.role;
        console.log(`👤 Usuario: ${user.name} (${user.email}) - Rol: ${targetRole}`);

        const defaultPermissions = {
            super_admin: {
                invoices: { view: true, create: true, edit: true, delete: true },
                documents: { view: true, upload: true, delete: true, validate: true },
                users: { view: true, create: true, edit: true, delete: true },
                suppliers: { view: true, create: true, edit: true, delete: true },
                dashboard: { view: true },
                payments: { view: true, edit: true }
            },
            admin_contaduria: {
                invoices: { view: true, create: true, edit: true, delete: true },
                documents: { view: true, upload: true, delete: true, validate: true },
                users: { view: true, create: true },
                suppliers: { view: true, create: true, edit: true },
                dashboard: { view: true },
                payments: { view: true, edit: true }
            },
            trabajador_contaduria: {
                invoices: { view: true, create: true },
                documents: { view: true, upload: true },
                suppliers: { view: true },
                dashboard: { view: true },
                payments: { view: true }
            },
            proveedor: {
                invoices: { view: true, create: true },
                documents: { view: true, upload: true },
                suppliers: { view: true, edit: true },
                dashboard: { view: true }
            }
        };

        const permissions = defaultPermissions[targetRole];
        if (!permissions) {
            throw new Error(`Rol ${targetRole} no reconocido`);
        }

        await user.update({ permissions: permissions });
        
        console.log(`✅ Permisos actualizados para ${user.name}`);
        console.log('🔑 Permisos asignados:');
        for (const [module, actions] of Object.entries(permissions)) {
            const enabledActions = Object.entries(actions).filter(([action, enabled]) => enabled).map(([action]) => action);
            console.log(`   ✓ ${module}: [${enabledActions.join(', ')}]`);
        }

        return user;

    } catch (error) {
        console.error('❌ Error forzando permisos:', error);
        throw error;
    }
}

// Función principal para ejecutar desde línea de comandos
async function main() {
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'migrate':
                await migrateUserPermissionsToJSON();
                break;
            case 'verify':
                await verifyJSONMigration();
                break;
            case 'migrate-and-verify':
                await migrateUserPermissionsToJSON();
                await verifyJSONMigration();
                break;
            case 'force':
                const userId = process.argv[3];
                const role = process.argv[4];
                if (!userId) {
                    console.log('❌ Falta el ID del usuario');
                    console.log('   Uso: node migrate-permissions-json.js force <user_id> [role]');
                    process.exit(1);
                }
                await forceUserPermissions(parseInt(userId), role);
                break;
            default:
                console.log('📖 Uso del script:');
                console.log('   node migrate-permissions-json.js migrate              - Migrar permisos a JSON');
                console.log('   node migrate-permissions-json.js verify               - Verificar migración');
                console.log('   node migrate-permissions-json.js migrate-and-verify   - Migrar y verificar');
                console.log('   node migrate-permissions-json.js force <user_id> [role] - Forzar permisos a usuario');
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
    migrateUserPermissionsToJSON,
    verifyJSONMigration,
    forceUserPermissions
};