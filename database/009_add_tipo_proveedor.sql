-- Migración: Sistema de tipos de proveedor fiscal
-- Fecha: 2025-10-07
-- Descripción: Reemplaza regimen_isr con tipo_proveedor para gestionar diferentes tipos fiscales

USE recepcion_facturas;

-- Eliminar columna antigua regimen_isr (verificar primero si existe)
SET @exist := (SELECT COUNT(*) FROM information_schema.COLUMNS 
               WHERE TABLE_SCHEMA = 'recepcion_facturas' 
               AND TABLE_NAME = 'suppliers' 
               AND COLUMN_NAME = 'regimen_isr');

SET @sqlstmt := IF(@exist > 0, 'ALTER TABLE suppliers DROP COLUMN regimen_isr', 'SELECT "Column regimen_isr does not exist" AS Info');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna tipo_proveedor con ENUM
ALTER TABLE suppliers
ADD COLUMN tipo_proveedor ENUM(
  'definitiva',
  'pagos_trimestrales', 
  'pequeno_contribuyente',
  'pagos_trimestrales_retencion'
) NOT NULL DEFAULT 'definitiva' 
COMMENT 'Tipo fiscal del proveedor que determina qué documentos debe subir';

-- Crear índice para búsquedas por tipo
CREATE INDEX idx_suppliers_tipo_proveedor ON suppliers(tipo_proveedor);

-- Actualizar tabla de invoices - eliminar documento_isr (ahora depende del tipo)
-- Los documentos se gestionarán según el tipo de proveedor

-- Verificación
SELECT 'Migración 009 completada exitosamente' as Status;

-- Mostrar tipos de proveedor disponibles
SELECT 
    'Tipos de proveedor disponibles:' as Info,
    'definitiva' as Tipo,
    'ISR + IVA + Contraseña + Comprobante' as Documentos
UNION ALL
SELECT '', 'pagos_trimestrales', 'IVA + Contraseña + Comprobante'
UNION ALL
SELECT '', 'pequeno_contribuyente', 'IVA + Contraseña + Comprobante'
UNION ALL
SELECT '', 'pagos_trimestrales_retencion', 'Contraseña + Comprobante';

-- Verificar estructura
DESCRIBE suppliers;