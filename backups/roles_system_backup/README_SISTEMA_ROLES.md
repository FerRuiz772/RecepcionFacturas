# Backup del Sistema de Roles y Permisos Granulares

**Fecha de Backup:** $(date)
**Versión:** 1.0.0

## Descripción General

Este backup contiene todos los archivos y datos del sistema de roles y permisos granulares implementado para la aplicación de Recepción de Facturas. El sistema permite un control detallado de acceso a diferentes módulos y acciones específicas dentro de la aplicación.

## Estructura del Sistema de Roles

### Roles Disponibles
1. **super_admin**: Acceso completo a todo el sistema
2. **admin_contaduria**: Administrador de contaduría con acceso a gestión de usuarios y reportes
3. **trabajador_contaduria**: Trabajador de contaduría con acceso limitado
4. **proveedor**: Acceso solo a sus propias facturas

### Módulos y Permisos
- **dashboard**: view, export
- **invoices**: view, create, edit, delete, approve, reject, export
- **suppliers**: view, create, edit, delete, export
- **users**: view, create, edit, delete, export
- **reports**: view, export
- **system**: settings, logs, backup

## Archivos del Backup

### Base de Datos
- `database_backup_YYYYMMDD_HHMMSS.sql`: Backup completo de la base de datos
- `users_table_backup.sql`: Backup específico de la tabla users con permisos

### Backend
- `permissions.js`: Middleware para validación de permisos granulares
- `User.js`: Modelo de usuario con métodos `hasPermission()` y `hasAnyPermission()`
- `userController.js`: Controlador con gestión completa de usuarios y permisos
- `authController.js`: Controlador de autenticación con forgot password
- `users.js`: Rutas con validaciones de permisos

### Frontend
- `UsersView.vue`: Vista de gestión de usuarios con grid de permisos interactivo
- `users.js`: Script con lógica de manejo de permisos en el frontend
- `auth.js`: Store de autenticación con manejo de permisos
- `PasswordRecoveryView.vue`: Vista de recuperación de contraseña
- `password-recovery.js`: Script de recuperación de contraseña
- `index.js` (router): Router con guardas de autenticación y roles
- `App.vue`: Configuración de layout para rutas de autenticación

## Características Implementadas

### 1. Sistema de Permisos Granulares
- Permisos almacenados como JSON en la base de datos
- Validación tanto en backend como frontend
- Grid visual para asignación de permisos
- Feedback visual (checkboxes verdes) cuando se asignan permisos

### 2. Gestión de Usuarios
- CRUD completo de usuarios
- Asignación de roles y permisos específicos
- Interfaz con pestañas para organización
- Filtros y búsqueda avanzada

### 3. Autenticación Mejorada
- Sistema de login con JWT
- Recuperación de contraseña por email
- Rutas protegidas con validación de roles
- Manejo de sesiones y tokens de refresh

### 4. Interfaz de Usuario
- Grid de permisos con pestañas por módulo
- Feedback visual inmediato
- Diseño responsive
- Consistencia visual con el resto de la aplicación

## Configuración de Permisos por Defecto

### Super Admin
```json
{
  "dashboard": ["view", "export"],
  "invoices": ["view", "create", "edit", "delete", "approve", "reject", "export"],
  "suppliers": ["view", "create", "edit", "delete", "export"],
  "users": ["view", "create", "edit", "delete", "export"],
  "reports": ["view", "export"],
  "system": ["settings", "logs", "backup"]
}
```

### Admin Contaduría
```json
{
  "dashboard": ["view", "export"],
  "invoices": ["view", "create", "edit", "approve", "reject", "export"],
  "suppliers": ["view", "create", "edit", "export"],
  "users": ["view", "create", "edit", "export"],
  "reports": ["view", "export"]
}
```

### Trabajador Contaduría
```json
{
  "dashboard": ["view"],
  "invoices": ["view", "edit", "export"],
  "suppliers": ["view"],
  "reports": ["view"]
}
```

### Proveedor
```json
{
  "dashboard": ["view"],
  "invoices": ["view", "create"]
}
```

## Instalación y Restauración

### 1. Restaurar Base de Datos
```bash
# Restaurar backup completo
mysql -u root -p recepcion_facturas < database_backup_YYYYMMDD_HHMMSS.sql

# O solo la tabla de usuarios
mysql -u root -p recepcion_facturas < users_table_backup.sql
```

### 2. Restaurar Archivos de Backend
Copiar todos los archivos de la carpeta `backend/` a sus ubicaciones correspondientes:
- `backend/src/middleware/permissions.js`
- `backend/src/models/User.js`
- `backend/src/controllers/userController.js`
- `backend/src/controllers/authController.js`
- `backend/src/routes/users.js`

### 3. Restaurar Archivos de Frontend
Copiar todos los archivos de la carpeta `frontend/` a sus ubicaciones correspondientes:
- `frontend/src/views/UsersView.vue`
- `frontend/src/scripts/users.js`
- `frontend/src/stores/auth.js`
- `frontend/src/views/PasswordRecoveryView.vue`
- `frontend/src/scripts/password-recovery.js`
- `frontend/src/router/index.js`
- `frontend/src/App.vue`

## Validación del Sistema

### 1. Verificar Usuarios
```sql
SELECT id, name, email, role, permissions FROM users;
```

### 2. Probar Endpoints
```bash
# Listar usuarios (requiere permisos)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/users

# Crear usuario (requiere permisos de admin)
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","role":"trabajador_contaduria"}' \
  http://localhost:3000/api/users
```

### 3. Verificar Interfaz
- Acceder a `/users` con diferentes roles
- Verificar que el grid de permisos muestre correctamente
- Probar asignación/desasignación de permisos
- Verificar feedback visual (checkboxes verdes)

## Notas Técnicas

- El sistema usa bcrypt con 12 rounds para hash de contraseñas
- Los permisos se almacenan como JSON en MySQL
- El middleware de permisos valida tanto módulo como acción específica
- El frontend sincroniza automáticamente con el backend
- Todas las rutas están protegidas con validación de roles

## Usuarios de Prueba

### Administrador Principal
- **Email:** admin@recepcionfacturas.com
- **Contraseña:** admin123
- **Rol:** super_admin

### Administrador Nuevo
- **Email:** aquiles14troya@gmail.com
- **Contraseña:** admin123
- **Rol:** super_admin

## Contacto y Soporte

Para cualquier consulta sobre este sistema de roles:
- Revisar la documentación en este archivo
- Verificar los logs del sistema
- Consultar el código fuente de los archivos incluidos

---

**Importante:** Este backup incluye todas las funcionalidades implementadas hasta la fecha de creación. Asegúrese de probar completamente en un entorno de desarrollo antes de aplicar en producción.
