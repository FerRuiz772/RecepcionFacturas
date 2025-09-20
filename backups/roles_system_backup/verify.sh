#!/bin/bash

# Script de Verificación del Sistema de Roles
# Ejecutar después de la instalación para verificar que todo funciona

echo "🔍 Verificando Sistema de Roles y Permisos..."
echo "================================================"

# Verificar contenedores
echo "1. Verificando contenedores Docker..."
if docker ps | grep -q "recepcion_facturas_api"; then
    echo "   ✅ API ejecutándose"
else
    echo "   ❌ API no ejecutándose"
fi

if docker ps | grep -q "recepcion_facturas_frontend"; then
    echo "   ✅ Frontend ejecutándose"
else
    echo "   ❌ Frontend no ejecutándose"
fi

if docker ps | grep -q "recepcion_facturas_db"; then
    echo "   ✅ Base de datos ejecutándose"
else
    echo "   ❌ Base de datos no ejecutándose"
fi

echo ""

# Verificar estructura de base de datos
echo "2. Verificando estructura de base de datos..."
users_table=$(docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SHOW TABLES LIKE 'users';" 2>/dev/null | grep -c "users")
if [ "$users_table" -eq 1 ]; then
    echo "   ✅ Tabla users existe"
else
    echo "   ❌ Tabla users no encontrada"
fi

permissions_column=$(docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SHOW COLUMNS FROM users LIKE 'permissions';" 2>/dev/null | grep -c "permissions")
if [ "$permissions_column" -eq 1 ]; then
    echo "   ✅ Columna permissions existe"
else
    echo "   ❌ Columna permissions no encontrada"
fi

echo ""

# Verificar usuarios
echo "3. Verificando usuarios..."
user_count=$(docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SELECT COUNT(*) FROM users;" 2>/dev/null | tail -1)
echo "   📊 Total de usuarios: $user_count"

admin_count=$(docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SELECT COUNT(*) FROM users WHERE role = 'super_admin';" 2>/dev/null | tail -1)
echo "   👑 Super admins: $admin_count"

echo "   📋 Lista de usuarios:"
docker exec recepcion_facturas_db mysql -u root -proot123 recepcion_facturas -e "SELECT id, name, email, role FROM users;" 2>/dev/null

echo ""

# Verificar archivos del backend
echo "4. Verificando archivos del backend..."
files_backend=(
    "backend/src/middleware/permissions.js"
    "backend/src/models/User.js"
    "backend/src/controllers/userController.js"
    "backend/src/controllers/authController.js"
    "backend/src/routes/users.js"
)

for file in "${files_backend[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (faltante)"
    fi
done

echo ""

# Verificar archivos del frontend
echo "5. Verificando archivos del frontend..."
files_frontend=(
    "frontend/src/views/UsersView.vue"
    "frontend/src/scripts/users.js"
    "frontend/src/stores/auth.js"
    "frontend/src/views/PasswordRecoveryView.vue"
    "frontend/src/scripts/password-recovery.js"
    "frontend/src/router/index.js"
    "frontend/src/App.vue"
)

for file in "${files_frontend[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (faltante)"
    fi
done

echo ""

# Probar endpoints
echo "6. Probando endpoints de la API..."

# Test endpoint de salud
health_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/users 2>/dev/null)
if [ "$health_response" = "401" ] || [ "$health_response" = "403" ]; then
    echo "   ✅ Endpoint /api/users protegido correctamente"
elif [ "$health_response" = "000" ]; then
    echo "   ❌ API no responde - verificar que esté ejecutándose"
else
    echo "   ⚠️  Respuesta inesperada: $health_response"
fi

# Test login
login_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' http://localhost:3000/api/auth/login 2>/dev/null)
if [ "$login_response" = "401" ] || [ "$login_response" = "400" ]; then
    echo "   ✅ Endpoint /api/auth/login respondiendo"
elif [ "$login_response" = "000" ]; then
    echo "   ❌ API no responde en /auth/login"
else
    echo "   ⚠️  Login respuesta: $login_response"
fi

echo ""

# Test frontend
echo "7. Verificando frontend..."
frontend_response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)
if [ "$frontend_response" = "200" ]; then
    echo "   ✅ Frontend respondiendo en http://localhost:8080"
elif [ "$frontend_response" = "000" ]; then
    echo "   ❌ Frontend no responde - verificar que esté ejecutándose"
else
    echo "   ⚠️  Frontend respuesta: $frontend_response"
fi

echo ""

# Resumen
echo "================================================"
echo "🎯 RESUMEN DE VERIFICACIÓN"
echo "================================================"

if [ "$user_count" -gt 0 ] && [ "$admin_count" -gt 0 ] && [ "$health_response" = "401" ] && [ "$frontend_response" = "200" ]; then
    echo "✅ Sistema funcionando correctamente"
    echo ""
    echo "🚀 Puedes acceder a:"
    echo "   - Frontend: http://localhost:8080"
    echo "   - Credenciales de prueba disponibles en README_SISTEMA_ROLES.md"
else
    echo "⚠️  Algunos componentes necesitan atención"
    echo ""
    echo "📋 Pasos de resolución:"
    echo "   1. Verificar que todos los contenedores estén ejecutándose"
    echo "   2. Revisar logs: docker-compose logs"
    echo "   3. Consultar documentación en README_SISTEMA_ROLES.md"
fi

echo ""
echo "📚 Para más información, consultar:"
echo "   - backups/roles_system_backup/README_SISTEMA_ROLES.md"
echo "   - Logs del sistema: docker-compose logs"
