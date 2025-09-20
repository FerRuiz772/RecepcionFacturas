-- Schema actualizado para IDs numéricos (Opción A)
-- Crear base de datos y configurar
CREATE DATABASE IF NOT EXISTS recepcion_facturas 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE recepcion_facturas;

-- Tabla de Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  business_name VARCHAR(255) NOT NULL,
  nit VARCHAR(20) UNIQUE NOT NULL,
  contact_phone VARCHAR(20),
  address TEXT,
  bank_details JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor') NOT NULL,
  supplier_id INT NULL,
  profile_data JSON DEFAULT ('{}'),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Tabla de Facturas
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(100) UNIQUE NOT NULL,
  supplier_id INT NOT NULL,
  assigned_to INT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  due_date DATE,
  uploaded_files JSON DEFAULT ('[]'),
  status ENUM(
    'factura_subida',
    'asignada_contaduria',
    'en_proceso',
    'contrasena_generada',
    'retencion_isr_generada',
    'retencion_iva_generada',
    'pago_realizado',
    'proceso_completado',
    'rechazada'
  ) DEFAULT 'factura_subida',
  priority ENUM('baja', 'media', 'alta', 'urgente') DEFAULT 'media',
  processing_data JSON DEFAULT ('{}'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Tabla de Estados de Factura (para auditoría)
CREATE TABLE IF NOT EXISTS invoice_states (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  from_state VARCHAR(50),
  to_state VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL UNIQUE,
  password_generated VARCHAR(255),
  isr_retention_file VARCHAR(500),
  iva_retention_file VARCHAR(500),
  payment_proof_file VARCHAR(500),
  completion_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Tabla de Logs del Sistema (para auditoría completa)
CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSON DEFAULT ('{}'),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX idx_invoices_assigned ON invoices(assigned_to);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created ON invoices(created_at);
CREATE INDEX idx_invoices_number ON invoices(number);
CREATE INDEX idx_invoice_states_invoice ON invoice_states(invoice_id);
CREATE INDEX idx_invoice_states_timestamp ON invoice_states(timestamp);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_supplier ON users(supplier_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_system_logs_user ON system_logs(user_id);
CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_suppliers_nit ON suppliers(nit);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);