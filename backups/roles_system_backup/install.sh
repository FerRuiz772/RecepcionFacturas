#!/bin/bash

# Script de Instalación del Sistema de Roles y Permisos
# Fecha: $(date)

echo "🚀 Iniciando instalación del Sistema de Roles y Permisos..."

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Ejecutar desde el directorio raíz del proyecto"
    exit 1
fi

# Crear backup del estado actual
echo "📦 Creando backup del estado actual..."
timestamp=$(date +%Y%m%d_%H%M%S)
mkdir -p backups/pre_install_$timestamp

# Backup de archivos que serán modificados
echo "💾 Respaldando archivos existentes..."
cp backend/src/middleware/auth.js backups/pre_install_$timestamp/ 2>/dev/null || echo "⚠️  auth.js no encontrado"
cp backend/src/models/User.js backups/pre_install_$timestamp/ 2>/dev/null || echo "⚠️  User.js no encontrado"
cp backend/src/controllers/userController.js backups/pre_install_$timestamp/ 2>/dev/null || echo "⚠️  userController.js no encontrado"
cp frontend/src/views/UsersView.vue backups/pre_install_$timestamp/ 2>/dev/null || echo "⚠️  UsersView.vue no encontrado"

# Instalar archivos del backend
echo "🔧 Instalando archivos del backend..."
cp backups/roles_system_backup/backend/permissions.js backend/src/middleware/
cp backups/roles_system_backup/backend/User.js backend/src/models/
cp backups/roles_system_backup/backend/userController.js backend/src/controllers/
cp backups/roles_system_backup/backend/authController.js backend/src/controllers/
cp backups/roles_system_backup/backend/users.js backend/src/routes/

# Instalar archivos del frontend
echo "🎨 Instalando archivos del frontend..."
cp backups/roles_system_backup/frontend/UsersView.vue frontend/src/views/
cp backups/roles_system_backup/frontend/users.js frontend/src/scripts/
cp backups/roles_system_backup/frontend/auth.js frontend/src/stores/
cp backups/roles_system_backup/frontend/PasswordRecoveryView.vue frontend/src/views/
cp backups/roles_system_backup/frontend/password-recovery.js frontend/src/scripts/
cp backups/roles_system_backup/frontend/index.js frontend/src/router/
cp backups/roles_system_backup/frontend/App.vue frontend/src/

# Verificar si los contenedores están ejecutándose
echo "🐳 Verificando contenedores..."
if ! docker ps | grep -q "recepcion_facturas_db"; then
    echo "🔄 Iniciando contenedores..."
    docker-compose up -d
    echo "⏳ Esperando que la base de datos esté lista..."
    sleep 30
fi

# Restaurar base de datos
echo "🗃️  Restaurando estructura de base de datos..."
latest_backup=$(ls -t backups/roles_system_backup/database_backup_*.sql 2>/dev/null | head -1)
if [ -n "$latest_backup" ]; then
    docker exec -i recepcion_facturas_db mysql -u root -proot123 recepcion_facturas < "$latest_backup"
    echo "✅ Base de datos restaurada desde: $latest_backup"
else
    echo "⚠️  No se encontró backup de base de datos, aplicando datos de usuarios..."
    if [ -f "backups/roles_system_backup/users_data_restore.sql" ]; then
        docker exec -i recepcion_facturas_db mysql -u root -proot123 recepcion_facturas < backups/roles_system_backup/users_data_restore.sql
    fi
fi

# Reiniciar servicios
echo "🔄 Reiniciando servicios..."
docker-compose restart api frontend

# Verificar instalación
echo "🔍 Verificando instalación..."
sleep 10

# Probar endpoint de usuarios
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users)
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo "✅ API respondiendo correctamente (requiere autenticación)"
else
    echo "⚠️  Respuesta inesperada de la API: $response"
fi

# Mostrar información de usuarios
echo "👥 Usuarios disponibles:"
docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SELECT id, name, email, role FROM users;" 2>/dev/null || echo "⚠️  No se pudo obtener lista de usuarios"

echo ""
echo "🎉 ¡Instalación completada!"
echo ""
echo "📋 Pasos siguientes:"
echo "1. Acceder a http://localhost:8080"
echo "2. Usar credenciales de admin para probar"
echo "3. Verificar permisos en la sección de usuarios"
echo ""
echo "👤 Usuarios de prueba:"
echo "   - admin@recepcionfacturas.com / admin123 (super_admin)"
echo "   - aquiles14troya@gmail.com / admin123 (super_admin)"
echo ""
echo "📚 Documentación completa en: backups/roles_system_backup/README_SISTEMA_ROLES.md"
