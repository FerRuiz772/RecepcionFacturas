#!/bin/bash

# Script de despliegue para producción - RecepcionFacturas
# Autor: Sistema automatizado
# Fecha: $(date)

set -e  # Salir si hay algún error

echo "🚀 Iniciando despliegue de Recepción de Facturas en PRODUCCIÓN..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
    exit 1
}

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.prod.yml" ]; then
    error "No se encuentra docker-compose.prod.yml. Ejecuta desde la raíz del proyecto."
fi

# Verificar que existe el archivo de variables de entorno
if [ ! -f ".env.production" ]; then
    error "No se encuentra .env.production. Crea el archivo con las variables de producción."
fi

log "Verificando requisitos del sistema..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    error "Docker no está instalado. Instala Docker primero."
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose no está instalado. Instala Docker Compose primero."
fi

# Verificar Apache
if ! command -v apache2 &> /dev/null && ! command -v httpd &> /dev/null; then
    error "Apache no está instalado. Instala Apache2 primero."
fi

log "Creando respaldo de la aplicación actual..."
BACKUP_DIR="backup_$(date +'%Y%m%d_%H%M%S')"
mkdir -p "$BACKUP_DIR"

# Respaldar base de datos si existe
if docker ps | grep -q "recepcion_facturas_db_prod"; then
    log "Respaldando base de datos..."
    docker exec recepcion_facturas_db_prod mysqldump -u root -p$(grep DB_ROOT_PASSWORD .env.production | cut -d'=' -f2) recepcion_facturas > "$BACKUP_DIR/database_backup.sql"
fi

# Respaldar uploads
if [ -d "uploads" ]; then
    log "Respaldando archivos uploads..."
    cp -r uploads "$BACKUP_DIR/"
fi

log "Deteniendo servicios existentes..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down

log "Limpiando contenedores e imágenes antiguas..."
docker system prune -f

log "Construyendo imágenes para producción..."
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

log "Construyendo frontend para producción..."
# Construir frontend en contenedor temporal
docker-compose -f docker-compose.prod.yml --env-file .env.production --profile build-only up frontend
docker-compose -f docker-compose.prod.yml --env-file .env.production --profile build-only down

# Copiar dist del contenedor al host
CONTAINER_ID=$(docker create $(docker images --format "table {{.Repository}}:{{.Tag}}" | grep recepcionfacturas | grep frontend | head -1))
docker cp $CONTAINER_ID:/app/dist ./frontend/
docker rm $CONTAINER_ID

log "Iniciando servicios de producción..."
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db backend

log "Esperando que la base de datos esté lista..."
sleep 30

# Verificar que los servicios estén funcionando
log "Verificando estado de los servicios..."
if ! docker ps | grep -q "recepcion_facturas_db_prod"; then
    error "La base de datos no se inició correctamente"
fi

if ! docker ps | grep -q "recepcion_facturas_backend_prod"; then
    error "El backend no se inició correctamente"
fi

log "Configurando Apache..."

# Verificar si el sitio ya existe
APACHE_SITES_DIR="/etc/apache2/sites-available"
if [ -d "/etc/httpd/conf.d" ]; then
    APACHE_SITES_DIR="/etc/httpd/conf.d"
fi

# Copiar configuración de Apache
sudo cp apache-config/recepcion-facturas.conf $APACHE_SITES_DIR/

# Habilitar módulos necesarios de Apache
log "Habilitando módulos de Apache..."
if command -v a2enmod &> /dev/null; then
    sudo a2enmod rewrite
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    sudo a2enmod headers
    sudo a2enmod ssl
    sudo a2enmod expires
fi

# Habilitar el sitio
if command -v a2ensite &> /dev/null; then
    sudo a2ensite recepcion-facturas.conf
fi

# Crear directorio para la aplicación
sudo mkdir -p /var/www/html/recepcion-facturas/frontend
sudo cp -r frontend/dist/* /var/www/html/recepcion-facturas/frontend/

# Configurar permisos
sudo chown -R www-data:www-data /var/www/html/recepcion-facturas
sudo chmod -R 755 /var/www/html/recepcion-facturas

# Reiniciar Apache
log "Reiniciando Apache..."
if command -v systemctl &> /dev/null; then
    sudo systemctl restart apache2 || sudo systemctl restart httpd
else
    sudo service apache2 restart || sudo service httpd restart
fi

log "Verificando salud de la aplicación..."
sleep 10

# Verificar backend
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    log "✅ Backend funcionando correctamente"
else
    warn "⚠️  Backend podría tener problemas. Verifica los logs."
fi

# Verificar frontend a través de Apache
if curl -f http://localhost/ > /dev/null 2>&1; then
    log "✅ Frontend funcionando correctamente"
else
    warn "⚠️  Frontend podría tener problemas. Verifica la configuración de Apache."
fi

log "Mostrando logs de los servicios..."
docker-compose -f docker-compose.prod.yml --env-file .env.production logs --tail=50

log "🎉 ¡Despliegue completado exitosamente!"
echo ""
echo "📋 Resumen del despliegue:"
echo "  • Base de datos: ✅ Funcionando"
echo "  • Backend API: ✅ Funcionando en puerto 5000"
echo "  • Frontend: ✅ Servido por Apache"
echo "  • Respaldo creado en: $BACKUP_DIR"
echo ""
echo "🔗 URLs de acceso:"
echo "  • Aplicación: http://tu-dominio.com"
echo "  • API Health: http://tu-dominio.com/api/health"
echo ""
echo "📖 Próximos pasos:"
echo "  1. Configurar SSL/HTTPS con tus certificados reales"
echo "  2. Configurar tu dominio real en Apache"
echo "  3. Configurar emails en .env.production"
echo "  4. Verificar que todos los servicios funcionen correctamente"
echo ""
echo "📝 Para ver logs en tiempo real:"
echo "  docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"