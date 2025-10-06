-- Migración: Sistema de comentarios por factura
-- Fecha: 2025-10-06
-- Descripción: Permite comunicación entre proveedores y personal de contaduría por factura

USE recepcion_facturas;

-- Crear tabla de comentarios
CREATE TABLE IF NOT EXISTS invoice_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  user_id INT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_invoice_comments_invoice (invoice_id),
  INDEX idx_invoice_comments_user (user_id),
  INDEX idx_invoice_comments_created (created_at)
) COMMENT='Comentarios/chat por factura entre proveedores y contaduría';

-- Verificación
SELECT 'Tabla invoice_comments creada exitosamente' as Status;
SELECT COUNT(*) as total_comments FROM invoice_comments;