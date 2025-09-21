-- Datos iniciales para la aplicación con IDs numéricos (Opción A)
USE recepcion_facturas;

-- ==================== PROVEEDORES ====================
INSERT IGNORE INTO suppliers (id, business_name, nit, contact_phone, address, bank_details, is_active) VALUES
(1, 'Tecnología Avanzada S.A.', '12345678-9', '2234-5678', 'Zona 10, Torre Empresarial, Oficina 501, Ciudad de Guatemala', JSON_OBJECT('banco', 'Banco Industrial', 'cuenta', '1234567890123', 'tipo', 'monetaria', 'nombre_cuenta', 'Tecnología Avanzada S.A.'), TRUE),
(2, 'Servicios Gráficos Guatemala', '98765432-1', '2345-6789', 'Zona 1, Avenida Central 15-20', JSON_OBJECT('banco', 'Banco G&T Continental', 'cuenta', '9876543210987', 'tipo', 'monetaria', 'nombre_cuenta', 'Servicios Gráficos Guatemala'), TRUE),
(3, 'Suministros de Oficina Central', '55443322-7', '2456-7890', 'Zona 4, Calzada Roosevelt 12-34', JSON_OBJECT('banco', 'Banco Promerica', 'cuenta', '5544332211445', 'tipo', 'monetaria', 'nombre_cuenta', 'Suministros de Oficina Central'), TRUE),
(4, 'Consultoría Legal Moderna', '11223344-5', '2567-8901', 'Zona 9, Edificio Murano Center, Nivel 8', JSON_OBJECT('banco', 'Banco Industrial', 'cuenta', '1122334455667', 'tipo', 'monetaria', 'nombre_cuenta', 'Consultoría Legal Moderna, S.A.'), TRUE),
(5, 'Sistema Interno Empresa', '00000000-0', '0000-0000', 'Oficinas Centrales', JSON_OBJECT('banco', 'N/A', 'cuenta', 'N/A', 'tipo', 'interno'), TRUE),
(6, 'Aquiles Tech Solutions S.A.', '87654321-0', '+502 2234-5678', 'Zona 10, Ciudad de Guatemala', JSON_OBJECT('banco', 'Banco BAM', 'cuenta', '8765432100001', 'tipo', 'monetaria', 'nombre_cuenta', 'Aquiles Tech Solutions S.A.'), TRUE);

-- ==================== USUARIOS ====================
-- Contraseñas: admin123 / contaduria123 / trabajador123 / proveedor123
INSERT IGNORE INTO users (id, email, password_hash, name, role, supplier_id, profile_data, is_active) VALUES
(1, 'admin@recepcionfacturas.com', '$2b$12$xsV7QdZHvvofdnAZoeTbs.MO8t7aNNb7xB1PLLBootlaBan4UzkTu', 'Mario Rodríguez', 'super_admin', NULL, JSON_OBJECT('phone', '2234-5678', 'department', 'Administración', 'created_by', 'sistema'), TRUE),
(2, 'contaduria@recepcionfacturas.com', '$2b$12$zgPrt9dqUnikz1D/2gwQW.4eCsPlvAMLp.yZbhtND8M4t4vmteQXe', 'Ana García', 'admin_contaduria', NULL, JSON_OBJECT('phone', '2345-6789', 'department', 'Contaduría', 'supervisor', TRUE), TRUE),
(3, 'maria.lopez@recepcionfacturas.com', '$2b$12$RiuEmqfjCfq4ZXgAZsmkwuOOWzkarUzqxxVS17iTKLKbsjw.t/Tq.', 'María López', 'trabajador_contaduria', NULL, JSON_OBJECT('phone', '2456-7890', 'department', 'Contaduría', 'area', 'Procesamiento'), TRUE),
(4, 'carlos.martinez@recepcionfacturas.com', '$2b$12$RiuEmqfjCfq4ZXgAZsmkwuOOWzkarUzqxxVS17iTKLKbsjw.t/Tq.', 'Carlos Martínez', 'trabajador_contaduria', NULL, JSON_OBJECT('phone', '2567-8901', 'department', 'Contaduría', 'area', 'Revisión'), TRUE),
(5, 'proveedor1@tecavanzada.com', '$2b$12$j5P9c2hH5aqahOKEe5i3iODAAzqronz5IBphYs4DY8ENeDMt/qIUG', 'Roberto Chen', 'proveedor', 1, JSON_OBJECT('phone', '2234-5678', 'position', 'Gerente Comercial'), TRUE),
(6, 'proveedor2@graficosguat.com', '$2b$12$j5P9c2hH5aqahOKEe5i3iODAAzqronz5IBphYs4DY8ENeDMt/qIUG', 'Patricia Morales', 'proveedor', 2, JSON_OBJECT('phone', '2345-6789', 'position', 'Coordinadora de Ventas'), TRUE),
(7, 'proveedor3@suministroscentral.com', '$2b$12$j5P9c2hH5aqahOKEe5i3iODAAzqronz5IBphYs4DY8ENeDMt/qIUG', 'Jorge Hernández', 'proveedor', 3, JSON_OBJECT('phone', '2456-7890', 'position', 'Ejecutivo de Cuentas'), TRUE),
(8, 'proveedor4@legalmoderna.com', '$2b$12$j5P9c2hH5aqahOKEe5i3iODAAzqronz5IBphYs4DY8ENeDMt/qIUG', 'Claudia Vásquez', 'proveedor', 4, JSON_OBJECT('phone', '2567-8901', 'position', 'Socia Directora'), TRUE),
-- Usuarios personalizados agregados
(9, 'fruiz@clubpremierfs.com', '$2b$12$ed6LQilBLnlW9tH0s6qNPekglVoYyqnKHv0k5FHfxpiDWisZYbQG6', 'Fernando Ruiz', 'super_admin', NULL, JSON_OBJECT('phone', '2234-0000', 'department', 'Administración', 'created_by', 'personalizado'), TRUE),
(10, 'aquiles14troya@gmail.com', '$2b$12$ed6LQilBLnlW9tH0s6qNPekglVoYyqnKHv0k5FHfxpiDWisZYbQG6', 'Aquiles González', 'proveedor', 6, JSON_OBJECT('phone', '2234-5678', 'position', 'Director Técnico'), TRUE),
(11, 'mmargen811@gmail.com', '$2b$12$ed6LQilBLnlW9tH0s6qNPekglVoYyqnKHv0k5FHfxpiDWisZYbQG6', 'Mario Margen', 'trabajador_contaduria', NULL, JSON_OBJECT('phone', '2567-0001', 'department', 'Contaduría', 'area', 'Análisis'), TRUE);

-- ==================== ASIGNACIÓN DE PERMISOS POR ROL ====================
-- Permisos para Super Admin: acceso completo a todo
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', true),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'approve', true, 'reject', true, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'export', true),
    'users', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'manage_permissions', true, 'reset_passwords', true)
) WHERE role = 'super_admin';

-- Permisos para Admin Contaduría: permisos amplios excepto gestión completa de usuarios
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', true),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'approve', true, 'reject', true, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true, 'export', true),
    'users', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false)
) WHERE role = 'admin_contaduria';

-- Permisos para Trabajador Contaduría: permisos limitados para operaciones diarias
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', true, 'view_charts', true, 'export_data', false),
    'invoices', JSON_OBJECT('view', true, 'create', false, 'edit', true, 'delete', false, 'approve', false, 'reject', false, 'export', true, 'view_payments', true, 'manage_payments', true),
    'suppliers', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false, 'export', false),
    'users', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false)
) WHERE role = 'trabajador_contaduria';

-- Permisos para Proveedor: acceso limitado solo a sus propias facturas
UPDATE users SET permissions = JSON_OBJECT(
    'dashboard', JSON_OBJECT('view', true, 'view_stats', false, 'view_charts', false, 'export_data', false),
    'invoices', JSON_OBJECT('view', true, 'create', true, 'edit', false, 'delete', false, 'approve', false, 'reject', false, 'export', false, 'view_payments', false, 'manage_payments', false),
    'suppliers', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'export', false),
    'users', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false, 'manage_permissions', false, 'reset_passwords', false)
) WHERE role = 'proveedor';

-- ==================== FACTURAS DE EJEMPLO ====================
INSERT IGNORE INTO invoices (id, number, supplier_id, assigned_to, amount, description, due_date, uploaded_files, status, priority, processing_data) VALUES
(1, 'FACT-2025-001', 1, 3, 2500.00, 'Desarrollo de módulo CRM personalizado', '2025-10-15', JSON_ARRAY(JSON_OBJECT('originalName', 'factura_001.pdf', 'filename', 'files-1757430510253-981292481.pdf', 'size', 222218)), 'en_proceso', 'alta', JSON_OBJECT('received_date', '2024-09-01', 'estimated_completion', '2024-09-15')),
(2, 'FACT-2025-002', 2, 4, 850.00, 'Diseño e impresión de material publicitario', '2025-10-20', JSON_ARRAY(JSON_OBJECT('originalName', 'factura_002.pdf', 'filename', 'files-1757442929176-700430416.pdf', 'size', 222218)), 'contrasena_generada', 'media', JSON_OBJECT('received_date', '2024-09-02', 'design_approved', TRUE)),
(3, 'FACT-2025-003', 3, 3, 1200.00, 'Suministros de oficina Q3 2024', '2025-10-25', JSON_ARRAY(JSON_OBJECT('originalName', 'factura_003.pdf', 'filename', 'files-1757698118201-141617703.pdf', 'size', 222218)), 'retencion_isr_generada', 'media', JSON_OBJECT('received_date', '2024-09-03', 'delivery_confirmed', TRUE)),
(4, 'FACT-2025-004', 4, 4, 4500.00, 'Consultoría legal - Revisión contratos', '2025-11-05', JSON_ARRAY(JSON_OBJECT('originalName', 'factura_004.pdf', 'filename', 'files-1757698195908-298635400.pdf', 'size', 222218)), 'proceso_completado', 'alta', JSON_OBJECT('received_date', '2024-09-01', 'legal_review_completed', TRUE, 'payment_completed', '2024-09-10')),
(5, 'FACT-2025-005', 1, NULL, 1800.00, 'Mantenimiento sistema ERP - Septiembre', '2025-10-30', JSON_ARRAY(JSON_OBJECT('originalName', 'factura_005.pdf', 'filename', 'files-1757430510253-981292481.pdf', 'size', 222218)), 'factura_subida', 'media', JSON_OBJECT('received_date', '2024-09-05', 'maintenance_type', 'preventivo'));

-- ==================== ESTADOS DE FACTURAS ====================
INSERT IGNORE INTO invoice_states (id, invoice_id, from_state, to_state, user_id, timestamp, notes) VALUES
(1, 1, NULL, 'factura_subida', 5, '2024-09-01 08:30:00', 'Factura inicial subida por proveedor'),
(2, 1, 'factura_subida', 'asignada_contaduria', 2, '2024-09-01 09:15:00', 'Auto-asignado a María López'),
(3, 1, 'asignada_contaduria', 'en_proceso', 3, '2024-09-01 10:45:00', 'Factura aceptada y en proceso de revisión'),

(4, 2, NULL, 'factura_subida', 6, '2024-09-02 09:00:00', 'Factura de servicios gráficos'),
(5, 2, 'factura_subida', 'asignada_contaduria', 2, '2024-09-02 09:30:00', 'Asignado a Carlos Martínez'),
(6, 2, 'asignada_contaduria', 'en_proceso', 4, '2024-09-02 11:00:00', 'Iniciando proceso de pago'),
(7, 2, 'en_proceso', 'contrasena_generada', 4, '2024-09-02 14:30:00', 'Contraseña generada: ABC123'),

(8, 3, NULL, 'factura_subida', 7, '2024-09-03 10:15:00', 'Factura de suministros'),
(9, 3, 'factura_subida', 'asignada_contaduria', 2, '2024-09-03 10:45:00', 'Auto-asignación'),
(10, 3, 'asignada_contaduria', 'en_proceso', 3, '2024-09-03 13:20:00', 'Procesando suministros'),
(11, 3, 'en_proceso', 'contrasena_generada', 3, '2024-09-03 15:00:00', 'Contraseña: XYZ789'),
(12, 3, 'contrasena_generada', 'retencion_isr_generada', 3, '2024-09-04 09:30:00', 'Retención ISR subida'),

(13, 4, NULL, 'factura_subida', 8, '2024-09-01 16:45:00', 'Factura servicios legales'),
(14, 4, 'factura_subida', 'asignada_contaduria', 2, '2024-09-01 17:00:00', 'Asignado a Carlos - Alta prioridad'),
(15, 4, 'asignada_contaduria', 'en_proceso', 4, '2024-09-02 08:00:00', 'Procesamiento urgente'),
(16, 4, 'en_proceso', 'contrasena_generada', 4, '2024-09-02 10:30:00', 'Contraseña: LEG456'),
(17, 4, 'contrasena_generada', 'retencion_isr_generada', 4, '2024-09-02 12:00:00', 'ISR procesado'),
(18, 4, 'retencion_isr_generada', 'retencion_iva_generada', 4, '2024-09-02 14:00:00', 'IVA procesado'),
(19, 4, 'retencion_iva_generada', 'pago_realizado', 4, '2024-09-03 09:00:00', 'Pago ejecutado'),
(20, 4, 'pago_realizado', 'proceso_completado', 4, '2024-09-03 11:30:00', 'Proceso finalizado exitosamente'),

(21, 5, NULL, 'factura_subida', 5, '2024-09-05 11:20:00', 'Nueva factura mantenimiento ERP');

-- ==================== PAGOS ====================
INSERT IGNORE INTO payments (id, invoice_id, password_generated, isr_retention_file, iva_retention_file, payment_proof_file, completion_date) VALUES
(1, 2, 'ABC123', NULL, NULL, NULL, NULL),
(2, 3, 'XYZ789', 'backend/src/uploads/retenciones/isr_3.pdf', NULL, NULL, NULL),
(3, 4, 'LEG456', 'backend/src/uploads/retenciones/isr_4.pdf', 'backend/src/uploads/retenciones/iva_4.pdf', 'backend/src/uploads/comprobantes/pago_4.pdf', '2024-09-03 11:30:00');

-- ==================== LOGS DEL SISTEMA ====================
INSERT IGNORE INTO system_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, details, timestamp) VALUES
(1, 5, 'LOGIN_SUCCESS', 'User', 5, '192.168.1.100', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('email', 'proveedor1@tecavanzada.com', 'role', 'proveedor'), '2024-09-01 08:15:00'),
(2, 5, 'INVOICE_CREATED', 'Invoice', 1, '192.168.1.100', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('invoice_number', 'FACT-2025-001', 'amount', 2500.00), '2024-09-01 08:30:00'),
(3, 2, 'INVOICE_ASSIGNED', 'Invoice', 1, '192.168.1.150', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('assigned_to', 'María López', 'auto_assignment', TRUE), '2024-09-01 09:15:00'),
(4, 3, 'LOGIN_SUCCESS', 'User', 3, '192.168.1.200', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('email', 'maria.lopez@recepcionfacturas.com', 'role', 'trabajador_contaduria'), '2024-09-01 10:30:00'),
(5, 3, 'INVOICE_STATUS_CHANGE', 'Invoice', 1, '192.168.1.200', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('from_status', 'asignada_contaduria', 'to_status', 'en_proceso'), '2024-09-01 10:45:00'),
(6, 4, 'PASSWORD_GENERATED', 'Payment', 1, '192.168.1.210', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('invoice_id', 2, 'password', 'ABC123'), '2024-09-02 14:30:00'),
(7, 4, 'DOCUMENT_UPLOADED', 'Payment', 3, '192.168.1.210', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('document_type', 'payment_proof', 'invoice_id', 4), '2024-09-03 11:30:00'),
(8, 1, 'LOGIN_SUCCESS', 'User', 1, '192.168.1.10', 'Mozilla/5.0 Chrome/91.0', JSON_OBJECT('email', 'admin@recepcionfacturas.com', 'role', 'super_admin'), '2024-09-05 07:45:00');

-- ==================== VERIFICACIÓN DE DATOS ====================
-- Verificar datos insertados
SELECT 'Proveedores insertados:' as Info, COUNT(*) as Total FROM suppliers;
SELECT 'Usuarios insertados:' as Info, COUNT(*) as Total FROM users;
SELECT 'Facturas insertadas:' as Info, COUNT(*) as Total FROM invoices;
SELECT 'Estados insertados:' as Info, COUNT(*) as Total FROM invoice_states;
SELECT 'Pagos insertados:' as Info, COUNT(*) as Total FROM payments;
SELECT 'Logs insertados:' as Info, COUNT(*) as Total FROM system_logs;

-- ==================== CREDENCIALES DE ACCESO ====================
-- Para referencia durante desarrollo
-- USUARIOS ORIGINALES:
-- admin@recepcionfacturas.com / admin123 (Super Admin)
-- contaduria@recepcionfacturas.com / contaduria123 (Admin Contaduría)
-- maria.lopez@recepcionfacturas.com / trabajador123 (Trabajador Contaduría)
-- carlos.martinez@recepcionfacturas.com / trabajador123 (Trabajador Contaduría)
-- proveedor1@tecavanzada.com / proveedor123 (Proveedor - Tecnología Avanzada)
-- proveedor2@graficosguat.com / proveedor123 (Proveedor - Servicios Gráficos)
-- proveedor3@suministroscentral.com / proveedor123 (Proveedor - Suministros)
-- proveedor4@legalmoderna.com / proveedor123 (Proveedor - Consultoría Legal)

-- USUARIOS PERSONALIZADOS:
-- fruiz@clubpremierfs.com / admin123 (Super Admin - Fernando Ruiz)
-- aquiles14troya@gmail.com / admin123 (Proveedor - Aquiles González - Aquiles Tech Solutions S.A.)
-- mmargen811@gmail.com / admin123 (Trabajador Contaduría - Mario Margen)