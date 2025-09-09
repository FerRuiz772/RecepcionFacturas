-- Datos iniciales para la aplicación
USE recepcion_facturas;

-- Insertar proveedor de ejemplo
INSERT IGNORE INTO suppliers (id, business_name, nit, contact_email, contact_phone, address, bank_details) VALUES
(1, 'Proveedor Ejemplo S.A.', '12345678-9', 'contacto@proveedor.com', '2234-5678', 'Zona 1, Ciudad de Guatemala', '{"banco": "Banco Industrial", "cuenta": "123456789", "tipo": "monetaria"}');

-- Insertar usuarios iniciales
-- Nota: Las contraseñas se hashearán en el backend, aquí van en texto plano para que el modelo las procese
INSERT IGNORE INTO users (id, email, password_hash, name, role, supplier_id, is_active) VALUES
(1, 'admin@recepcionfacturas.com', '$2b$12$xsV7QdZHvvofdnAZoeTbs.MO8t7aNNb7xB1PLLBootlaBan4UzkTu', 'Super Administrador', 'super_admin', NULL, TRUE),
(2, 'contaduria@recepcionfacturas.com', '$2b$12$zgPrt9dqUnikz1D/2gwQW.4eCsPlvAMLp.yZbhtND8M4t4vmteQXe', 'Admin Contaduría', 'admin_contaduria', NULL, TRUE),
(3, 'trabajador@recepcionfacturas.com', '$2b$12$RiuEmqfjCfq4ZXgAZsmkwuOOWzkarUzqxxVS17iTKLKbsjw.t/Tq.', 'Trabajador Contaduría', 'trabajador_contaduria', NULL, TRUE),
(4, 'proveedor@recepcionfacturas.com', '$2b$12$j5P9c2hH5aqahOKEe5i3iODAAzqronz5IBphYs4DY8ENeDMt/qIUG', 'Usuario Proveedor', 'proveedor', 1, TRUE);

-- Insertar factura de ejemplo
INSERT IGNORE INTO invoices (id, number, supplier_id, amount, description, due_date, status) VALUES
(1, 'FACT-001-2025', 1, 1500.00, 'Servicios de consultoría tecnológica', '2025-10-15', 'factura_subida');

-- Insertar estado inicial de la factura
INSERT IGNORE INTO invoice_states (invoice_id, from_state, to_state, user_id, notes) VALUES
(1, NULL, 'factura_subida', 4, 'Factura creada por proveedor');