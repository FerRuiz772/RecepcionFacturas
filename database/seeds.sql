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
INSERT INTO users (id, email, password_hash, name, role, supplier_id, profile_data, is_active) VALUES
(1, 'fruiz@clubpremierfs.com', '$2b$12$xsV7QdZHvvofdnAZoeTbs.MO8t7aNNb7xB1PLLBootlaBan4UzkTu', 'Fernando Ruiz', 'super_admin', NULL, JSON_OBJECT('phone', '2234-0000', 'department', 'Administración', 'created_by', 'personalizado'), TRUE);

-- ==================== VERIFICACIÓN ====================
SELECT 'Base de datos limpia - Solo usuario Fernando Ruiz' as Estado;
SELECT 'Usuarios en sistema:' as Info, COUNT(*) as Total FROM users;

-- ==================== CREDENCIALES ====================
-- ÚNICO USUARIO DISPONIBLE:
-- fruiz@clubpremierfs.com / admin123 (Super Admin - Fernando Ruiz)