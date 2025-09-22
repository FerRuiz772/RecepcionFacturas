-- Datos iniciales para la aplicación - VERSIÓN LIMPIA
USE recepcion_facturas;

-- ==================== LIMPIAR DATOS EXISTENTES ====================
-- Desactivar verificaciones de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Limpiar todas las tablas
TRUNCATE TABLE system_logs;
TRUNCATE TABLE payments;
TRUNCATE TABLE invoice_states;
TRUNCATE TABLE invoices;
TRUNCATE TABLE users;
TRUNCATE TABLE suppliers;

-- Reactivar verificaciones de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- ==================== USUARIO ÚNICO ====================
-- Solo usuario fruiz@clubpremierfs.com con contraseña admin123
INSERT INTO users (id, email, password_hash, name, role, supplier_id, profile_data, is_active, permissions) VALUES
(1, 'fruiz@clubpremierfs.com', '$2b$12$eKOXHL0loqmNLjeym5DRrOfcH00BFY/YgC728Y4rU8.fPtyMk/Z92', 'Fernando Ruiz', 'super_admin', NULL, JSON_OBJECT('phone', '2234-0000', 'department', 'Administración', 'created_by', 'personalizado'), TRUE, JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', true),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'approve', true, 'reject', true, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'export', true),
    'users', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'manage_permissions', true, 'reset_passwords', true),
    'accounting_documents', JSON_OBJECT('view', true, 'upload', true, 'download', true, 'delete', true, 'manage', true),
    'reports', JSON_OBJECT('view', true, 'generate', true, 'export', true, 'schedule', true),
    'system', JSON_OBJECT('view_logs', true, 'manage_settings', true, 'backup', true, 'restore', true, 'maintenance', true)
));

-- ==================== VERIFICACIÓN ====================
SELECT 'Base de datos limpia - Solo usuario Fernando Ruiz' as Estado;
SELECT 'Usuarios en sistema:' as Info, COUNT(*) as Total FROM users;

-- ==================== CREDENCIALES ====================
-- ÚNICO USUARIO DISPONIBLE:
-- fruiz@clubpremierfs.com / admin123 (Super Admin - Fernando Ruiz)