# 🚀 Manual de Instalación - Recepción de Facturas
## Despliegue en Servidor con Apache

### 📋 Prerrequisitos del Servidor

Antes de instalar, asegúrate de que el servidor tenga:

#### Sistema Operativo
- Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- Mínimo 4GB RAM, 20GB espacio en disco
- Acceso root o sudo

#### Software Requerido
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y apache2 docker.io docker-compose curl git

# CentOS/RHEL
sudo yum install -y httpd docker docker-compose curl git
sudo systemctl enable docker
sudo systemctl start docker
```

#### Módulos de Apache Necesarios
```bash
# Ubuntu/Debian
sudo a2enmod rewrite proxy proxy_http headers ssl expires
sudo systemctl restart apache2

# CentOS/RHEL
# Los módulos suelen estar habilitados por defecto
sudo systemctl restart httpd
```

---

### 🔧 Configuración Inicial

#### 1. Clonar el Repositorio
```bash
cd /var/www/html
sudo git clone https://github.com/TuUsuario/RecepcionFacturas.git recepcion-facturas
sudo chown -R $USER:$USER recepcion-facturas
cd recepcion-facturas
```

#### 2. Configurar Variables de Entorno
```bash
# Copiar y editar el archivo de configuración
cp .env.production .env.production.local
nano .env.production.local
```

**Configurar estos valores obligatorios:**
```bash
# Base de datos - CAMBIAR POR VALORES SEGUROS
DB_ROOT_PASSWORD=tu_password_mysql_root_super_seguro
DB_NAME=recepcion_facturas
DB_USER=facturas_user
DB_PASSWORD=tu_password_db_super_seguro

# JWT - GENERAR UNO ÚNICO
JWT_SECRET=tu_jwt_secret_muy_largo_y_aleatorio_de_al_menos_64_caracteres

# Email - CONFIGURAR CON TU PROVEEDOR
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_app_password_de_gmail
EMAIL_FROM=noreply@tudominio.com

# URLs - CAMBIAR POR TU DOMINIO REAL
FRONTEND_URL=https://tudominio.com
VITE_API_URL=https://tudominio.com/api
```

#### 3. Configurar Apache
```bash
# Copiar configuración de Apache
sudo cp apache-config/recepcion-facturas.conf /etc/apache2/sites-available/
# O en CentOS/RHEL:
# sudo cp apache-config/recepcion-facturas.conf /etc/httpd/conf.d/

# Editar el archivo para tu dominio
sudo nano /etc/apache2/sites-available/recepcion-facturas.conf
```

**Cambiar en la configuración:**
- `ServerName recepcionfacturas.com` → Tu dominio real
- `ServerAlias www.recepcionfacturas.com` → Tu dominio real
- Rutas de certificados SSL si los tienes

#### 4. Habilitar el Sitio
```bash
# Ubuntu/Debian
sudo a2ensite recepcion-facturas.conf
sudo a2dissite 000-default.conf  # Opcional: deshabilitar sitio por defecto
sudo systemctl reload apache2

# CentOS/RHEL
sudo systemctl reload httpd
```

---

### 🚀 Despliegue Automático

#### Ejecutar Script de Despliegue
```bash
# Hacer el script ejecutable
chmod +x deploy.sh

# Ejecutar despliegue
./deploy.sh
```

El script automáticamente:
- ✅ Verifica prerrequisitos
- ✅ Crea respaldo de datos existentes
- ✅ Construye las imágenes Docker
- ✅ Inicia los servicios
- ✅ Configura Apache
- ✅ Verifica que todo funcione

---

### 🔍 Verificación Post-Instalación

#### 1. Verificar Servicios
```bash
# Verificar estado general
./check-status.sh

# Verificar logs
docker-compose -f docker-compose.prod.yml --env-file .env.production logs
```

#### 2. Verificar URLs
- **Frontend:** `http://tudominio.com`
- **API Health:** `http://tudominio.com/api/health`
- **Login:** `http://tudominio.com` (usar `fruiz@clubpremierfs.com` / `admin123`)

---

### 🔒 Configuración SSL (HTTPS)

#### 1. Obtener Certificados SSL
```bash
# Opción 1: Let's Encrypt (Gratuito)
sudo apt install certbot python3-certbot-apache
sudo certbot --apache -d tudominio.com -d www.tudominio.com

# Opción 2: Certificado Comercial
# Coloca tus archivos .crt y .key en:
# /etc/ssl/certs/recepcionfacturas.crt
# /etc/ssl/private/recepcionfacturas.key
```

#### 2. Configurar Renovación Automática (Let's Encrypt)
```bash
sudo crontab -e
# Agregar línea:
0 12 * * * /usr/bin/certbot renew --quiet
```

---

### 🛠️ Mantenimiento

#### Comandos Útiles

```bash
# Ver estado de servicios
./check-status.sh

# Reiniciar todos los servicios
docker-compose -f docker-compose.prod.yml --env-file .env.production restart

# Ver logs en tiempo real
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Respaldar base de datos
docker exec recepcion_facturas_db_prod mysqldump -u root -p[PASSWORD] recepcion_facturas > backup_$(date +%Y%m%d).sql

# Actualizar aplicación
git pull origin main
./deploy.sh
```

#### Monitoreo

```bash
# Espacio en disco
df -h

# Memoria RAM
free -h

# Procesos Docker
docker stats

# Logs de Apache
sudo tail -f /var/log/apache2/recepcion-facturas-error.log
sudo tail -f /var/log/apache2/recepcion-facturas-access.log
```

---

### 🔧 Resolución de Problemas

#### Problema: Apache no inicia
```bash
# Verificar configuración
sudo apache2ctl configtest
# O en CentOS/RHEL:
sudo httpd -t

# Ver errores
sudo journalctl -u apache2 -f
```

#### Problema: Backend no responde
```bash
# Ver logs del backend
docker logs recepcion_facturas_backend_prod

# Reiniciar solo el backend
docker-compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

#### Problema: Base de datos no conecta
```bash
# Verificar que MySQL esté corriendo
docker ps | grep mysql

# Probar conexión directa
docker exec -it recepcion_facturas_db_prod mysql -u root -p
```

#### Problema: Archivos no se suben
```bash
# Verificar permisos del directorio uploads
ls -la uploads/
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

---

### 📞 Soporte

#### Logs Importantes
- Apache: `/var/log/apache2/recepcion-facturas-*.log`
- Backend: `docker logs recepcion_facturas_backend_prod`
- Base de datos: `docker logs recepcion_facturas_db_prod`

#### Archivos de Configuración
- Apache: `/etc/apache2/sites-available/recepcion-facturas.conf`
- Variables: `.env.production`
- Docker: `docker-compose.prod.yml`

#### Usuario por Defecto
- **Email:** `fruiz@clubpremierfs.com`
- **Contraseña:** `admin123`
- **Rol:** Super Admin

---

### ✅ Checklist de Despliegue

- [ ] Servidor con Ubuntu/CentOS configurado
- [ ] Docker y Docker Compose instalados
- [ ] Apache instalado y módulos habilitados
- [ ] Repositorio clonado en `/var/www/html/recepcion-facturas`
- [ ] Variables de entorno configuradas en `.env.production`
- [ ] Configuración de Apache editada con tu dominio
- [ ] Script `deploy.sh` ejecutado exitosamente
- [ ] Verificación con `check-status.sh` exitosa
- [ ] SSL/HTTPS configurado (recomendado)
- [ ] DNS apuntando a tu servidor
- [ ] Login funcionando con usuario por defecto
- [ ] Uploads de PDFs funcionando correctamente
- [ ] Emails de notificación configurados y funcionando

🎉 **¡Aplicación lista para producción!**