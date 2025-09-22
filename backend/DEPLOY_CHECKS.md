# Comandos de verificación - PayQuetzal (NO EJECUTAR)

# 1. Verificar que Docker y Docker Compose estén instalados
which docker && docker --version
which docker-compose && docker-compose --version

# 2. Verificar variables de entorno (.env)
# Revisar que existen DB_ROOT_PASSWORD, DB_NAME, DB_USER, DB_PASSWORD, etc.
cat .env | grep -E "DB_|MYSQL|JWT_SECRET|EMAIL_"

# 3. Construcción (local)
# docker-compose -f docker-compose.payquetzal.yml build

# 4. Levantar servicios (local)
# docker-compose -f docker-compose.payquetzal.yml up -d --build

# 5. Verificar contenedores
# docker ps | grep payquetzal

# 6. Verificar conexiones
# From host: mysql client
# mysql -h 127.0.0.1 -P 3306 -u ${DB_USER} -p

# 7. Verificar API
# curl -I http://127.0.0.1:5001/health
# curl -I http://127.0.0.1:5001/api/

# 8. Verificar logs
# docker logs payquetzal_api --tail 50
# docker logs payquetzal_db --tail 50

# 9. Verificar Apache
# sudo apache2ctl configtest
# sudo systemctl reload apache2
# Verify site
# curl -I https://hubsistema.com/

# 10. Verificar permisos uploads
# ls -la /var/www/html/payquetzal/uploads
# sudo chown -R www-data:www-data /var/www/html/payquetzal/uploads
