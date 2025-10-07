-- Migración: Agregar número de serie y número de DTE a facturas
-- Fecha: 2025-10-07
-- Descripción: Permite registrar el número de serie y número de DTE de las facturas para control fiscal

USE recepcion_facturas;

-- Agregar columnas a la tabla invoices
ALTER TABLE invoices
ADD COLUMN serie VARCHAR(50) NULL COMMENT 'Número de serie de la factura',
ADD COLUMN numero_dte VARCHAR(100) NULL COMMENT 'Número de DTE (Documento Tributario Electrónico)';

-- Crear índices para búsquedas
CREATE INDEX idx_invoices_serie ON invoices(serie);
CREATE INDEX idx_invoices_numero_dte ON invoices(numero_dte);

-- Verificación
SELECT 'Migración 008 completada exitosamente' as Status;
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'recepcion_facturas' 
AND TABLE_NAME = 'invoices' 
AND COLUMN_NAME IN ('serie', 'numero_dte');