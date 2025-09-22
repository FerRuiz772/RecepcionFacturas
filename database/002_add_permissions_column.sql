-- Migración para añadir la columna de permisos granulares
-- Fecha: 2025-09-19

-- Añadir columna permissions a la tabla users
ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL;

-- Actualizar usuarios existentes con permisos por defecto según su rol

-- Super admin: todos los permisos
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', true),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'approve', true, 'reject', true, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'export', true),
    'users', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'manage_permissions', true, 'reset_passwords', true),
    'accounting_documents', JSON_OBJECT('view', true, 'upload', true, 'download', true, 'delete', true, 'manage', true),
    'reports', JSON_OBJECT('view', true, 'generate', true, 'export', true, 'schedule', true)
) WHERE role = 'super_admin';

-- Admin contaduría: permisos amplios excepto gestión de usuarios
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', true),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'approve', true, 'reject', true, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'export', true),
    'users', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false),
    'accounting_documents', JSON_OBJECT('view', true, 'upload', true, 'download', true, 'delete', true, 'manage', true),
    'reports', JSON_OBJECT('view', true, 'generate', true, 'export', true, 'schedule', true)
) WHERE role = 'admin_contaduria';

-- Trabajador contaduría: permisos limitados
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', false, 'export_data', false),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false, 'approve', false, 'reject', false, 'export', false, 'view_payments', true, 'manage_payments', false),
    'suppliers', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false, 'export', false),
    'users', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false),
    'accounting_documents', JSON_OBJECT('view', true, 'upload', true, 'download', true, 'delete', false, 'manage', false),
    'reports', JSON_OBJECT('view', true, 'generate', false, 'export', false, 'schedule', false)
) WHERE role = 'trabajador_contaduria';

-- Proveedor: permisos muy limitados
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', false, 'view_charts', false, 'export_data', false),
    'invoices', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false, 'approve', false, 'reject', false, 'export', false, 'view_payments', true, 'manage_payments', false),
    'suppliers', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'export', false),
    'users', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false),
    'accounting_documents', JSON_OBJECT('view', true, 'upload', false, 'download', true, 'delete', false, 'manage', false),
    'reports', JSON_OBJECT('view', false, 'generate', false, 'export', false, 'schedule', false)
) WHERE role = 'proveedor';
