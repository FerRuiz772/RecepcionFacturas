-- Migración: Agregar régimen ISR a proveedores y documentos IVA/ISR a facturas
-- Fecha: 2025-10-06
-- Descripción: Permite marcar proveedores con régimen ISR y guardar documentos por factura

USE recepcion_facturas;

-- Agregar columna regimen_isr a suppliers
ALTER TABLE suppliers
ADD COLUMN regimen_isr TINYINT(1) NOT NULL DEFAULT 0 
COMMENT 'Indica si el proveedor está en Régimen Sujeto a Definitiva ISR';

-- Agregar columnas de documentos a invoices
ALTER TABLE invoices
ADD COLUMN documento_iva JSON NULL 
COMMENT 'Documento de retención IVA (siempre requerido)',
ADD COLUMN documento_isr JSON NULL 
COMMENT 'Documento de retención ISR (solo si supplier tiene regimen_isr)';

-- Crear índice para búsquedas por régimen
CREATE INDEX idx_suppliers_regimen_isr ON suppliers(regimen_isr);

-- Verificación
SELECT 'Migración completada exitosamente' as Status;
SELECT COUNT(*) as suppliers_total FROM suppliers;
SELECT COUNT(*) as suppliers_con_isr FROM suppliers WHERE regimen_isr = 1;