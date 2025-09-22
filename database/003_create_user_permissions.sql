-- Migración para sistema de permisos granulares
-- Cambio de autorización basada en roles a permisos específicos

USE recepcion_facturas;

-- ==================== CREAR TABLA USER_PERMISSIONS ====================
CREATE TABLE IF NOT EXISTS user_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    permission_key VARCHAR(100) NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Claves foráneas
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Índices únicos para evitar permisos duplicados
    UNIQUE KEY unique_user_permission (user_id, permission_key),
    
    -- Índices para rendimiento
    INDEX idx_user_permissions_user_id (user_id),
    INDEX idx_user_permissions_permission_key (permission_key)
);

-- ==================== DEFINIR PERMISOS DISPONIBLES ====================
-- Tabla auxiliar para documentar permisos disponibles en el sistema
CREATE TABLE IF NOT EXISTS available_permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar permisos disponibles para el sistema de facturas
INSERT IGNORE INTO available_permissions (permission_key, category, description) VALUES
-- Permisos de Facturas
('facturas.ver', 'facturas', 'Ver listado y detalles de facturas'),
('facturas.crear', 'facturas', 'Subir nuevas facturas (principalmente proveedores)'),
('facturas.editar', 'facturas', 'Modificar información de facturas existentes'),

-- Permisos de Documentos
('documentos.ver', 'documentos', 'Visualizar archivos y documentos del sistema'),
('documentos.subir', 'documentos', 'Cargar documentos (retenciones, comprobantes)'),
('documentos.descargar', 'documentos', 'Descargar documentos del sistema'),

-- Permisos de Usuarios
('usuarios.ver', 'usuarios', 'Ver lista de usuarios'),
('usuarios.crear', 'usuarios', 'Crear nuevos usuarios'),
('usuarios.editar', 'usuarios', 'Modificar usuarios existentes'),
('usuarios.eliminar', 'usuarios', 'Desactivar/eliminar usuarios'),

-- Permisos de Proveedores
('proveedores.ver', 'proveedores', 'Ver empresas proveedoras'),
('proveedores.crear', 'proveedores', 'Registrar nuevos proveedores'),
('proveedores.editar', 'proveedores', 'Modificar información de proveedores'),
('proveedores.eliminar', 'proveedores', 'Desactivar/eliminar proveedores');

-- ==================== MIGRAR USUARIOS EXISTENTES ====================
-- Asignar permisos por defecto según el rol actual de cada usuario

-- Super Admin: TODOS los permisos
INSERT IGNORE INTO user_permissions (user_id, permission_key, granted)
SELECT u.id, ap.permission_key, TRUE
FROM users u
CROSS JOIN available_permissions ap
WHERE u.role = 'super_admin';

-- Admin Contaduría: 10 permisos específicos
INSERT IGNORE INTO user_permissions (user_id, permission_key, granted)
SELECT u.id, ap.permission_key, TRUE
FROM users u
CROSS JOIN available_permissions ap
WHERE u.role = 'admin_contaduria'
AND ap.permission_key IN (
    'facturas.ver', 'facturas.editar',
    'documentos.ver', 'documentos.subir', 'documentos.descargar',
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.eliminar'
);

-- Trabajador Contaduría: 5 permisos específicos
INSERT IGNORE INTO user_permissions (user_id, permission_key, granted)
SELECT u.id, ap.permission_key, TRUE
FROM users u
CROSS JOIN available_permissions ap
WHERE u.role = 'trabajador_contaduria'
AND ap.permission_key IN (
    'facturas.ver', 'facturas.editar',
    'documentos.ver', 'documentos.subir', 'documentos.descargar'
);

-- Proveedor: 4 permisos específicos
INSERT IGNORE INTO user_permissions (user_id, permission_key, granted)
SELECT u.id, ap.permission_key, TRUE
FROM users u
CROSS JOIN available_permissions ap
WHERE u.role = 'proveedor'
AND ap.permission_key IN (
    'facturas.ver', 'facturas.crear',
    'documentos.ver', 'documentos.subir'
);

-- ==================== VERIFICACIÓN ====================
-- Ver resumen de permisos asignados por rol
SELECT 
    'Permisos por rol' as Info,
    u.role,
    COUNT(up.permission_key) as total_permisos
FROM users u
LEFT JOIN user_permissions up ON u.id = up.user_id
WHERE up.granted = TRUE
GROUP BY u.role
ORDER BY total_permisos DESC;

-- Ver detalle de un usuario específico (ejemplo: super_admin)
SELECT 
    'Ejemplo permisos super_admin' as Info,
    u.name,
    u.email,
    u.role,
    up.permission_key
FROM users u
JOIN user_permissions up ON u.id = up.user_id
WHERE u.role = 'super_admin' 
AND up.granted = TRUE
LIMIT 5;

-- ==================== COMENTARIOS ====================
-- Esta migración mantiene el campo 'role' en la tabla users por compatibilidad
-- y para poder hacer rollback si es necesario.
-- El nuevo sistema utilizará user_permissions como fuente principal de autorización.