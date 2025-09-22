#!/bin/bash

# Script para verificar el estado del sistema en producción
# Recepción de Facturas

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificando estado del sistema Recepción de Facturas...${NC}"
echo ""

# Función para verificar servicio
check_service() {
    local service_name="$1"
    local check_command="$2"
    local expected_output="$3"
    
    echo -n "Verificando $service_name... "
    
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Funcionando${NC}"
        return 0
    else
        echo -e "${RED}❌ Con problemas${NC}"
        return 1
    fi
}

# Verificar Docker
echo -e "${YELLOW}📦 Servicios Docker:${NC}"
check_service "Base de datos" "docker ps | grep recepcion_facturas_db_prod"
check_service "Backend" "docker ps | grep recepcion_facturas_backend_prod"

echo ""

# Verificar conectividad
echo -e "${YELLOW}🌐 Conectividad:${NC}"
check_service "Backend API Health" "curl -f http://localhost:5000/api/health"
check_service "Frontend Apache" "curl -f http://localhost/"

echo ""

# Verificar Apache
echo -e "${YELLOW}🌍 Apache:${NC}"
if systemctl is-active --quiet apache2 2>/dev/null || systemctl is-active --quiet httpd 2>/dev/null; then
    echo -e "Apache: ${GREEN}✅ Activo${NC}"
else
    echo -e "Apache: ${RED}❌ Inactivo${NC}"
fi

# Verificar puertos
echo ""
echo -e "${YELLOW}🔌 Puertos:${NC}"
ss -tlnp | grep -E ":80|:443|:3306|:5000" | while read line; do
    port=$(echo $line | awk '{print $4}' | cut -d':' -f2)
    echo -e "Puerto $port: ${GREEN}✅ Abierto${NC}"
done

# Verificar logs recientes
echo ""
echo -e "${YELLOW}📋 Logs recientes del backend:${NC}"
docker logs --tail=5 recepcion_facturas_backend_prod 2>/dev/null || echo "No se pudieron obtener los logs"

echo ""
echo -e "${YELLOW}📊 Uso de recursos:${NC}"
echo "Memoria:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep recepcion_facturas || echo "No hay contenedores ejecutándose"

echo ""
echo -e "${BLUE}🔍 Verificación completada.${NC}"