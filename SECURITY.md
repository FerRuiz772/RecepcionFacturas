# 🔐 Guía de Seguridad - PayQuetzal

## ⚠️ Configuración de Seguridad Crítica

### 1. Variables de Entorno (.env)
```bash
# NUNCA commitear este archivo al repositorio
# Crear .env en la raíz del proyecto backend/

# Base de datos
DB_HOST=localhost
DB_USER=admin
DB_PASSWORD=TU_PASSWORD_SEGURA_AQUI
DB_NAME=recepcion_facturas

# JWT
JWT_SECRET=tu_jwt_secret_muy_largo_y_aleatorio_aqui
JWT_REFRESH_SECRET=otro_secret_diferente_para_refresh_tokens

# Entorno
NODE_ENV=development  # cambiar a 'production' en producción
```

### 2. Script de Inicialización de Usuarios

⚠️ **El script `init-users.js` ha sido actualizado para ser más seguro:**

- ✅ Genera contraseñas aleatorias fuertes
- ✅ Usa variables de entorno para DB
- ✅ Bloqueado en producción
- ✅ Documentación completa

### 3. Instrucciones de Seguridad

#### Para Desarrollo:
```bash
# 1. Crear archivo .env con credenciales seguras
# 2. Ejecutar script de inicialización
cd backend/src/scripts
node init-users.js
```

#### Para Producción:
- ❌ **NUNCA** ejecutar `init-users.js` en producción
- ✅ Crear usuarios manualmente con contraseñas únicas
- ✅ Usar variables de entorno reales
- ✅ Configurar NODE_ENV=production

### 4. Contraseñas por Defecto (SOLO DESARROLLO)

Las contraseñas anteriores (`admin123`, `contaduria123`, etc.) eran **extremadamente inseguras**.

**Nuevo comportamiento:**
- Contraseñas aleatorias de 16-20 caracteres
- Incluyen mayúsculas, minúsculas, números y símbolos
- Se muestran UNA SOLA VEZ al ejecutar el script
- Deben cambiarse en el primer login

### 5. Checklist de Seguridad

- [ ] Archivo .env configurado y NO commiteado
- [ ] Contraseñas por defecto cambiadas
- [ ] NODE_ENV=production en servidor
- [ ] Base de datos con usuario específico (no root)
- [ ] JWT secrets únicos y largos
- [ ] HTTPS configurado en producción
- [ ] Firewall configurado
- [ ] Backups automáticos configurados

### 6. Contacto de Seguridad

Si encuentras vulnerabilidades de seguridad:
1. NO las publiques públicamente
2. Reporta al equipo de desarrollo
3. Espera confirmación antes de divulgar

---
**Última actualización:** 21 de Septiembre, 2025