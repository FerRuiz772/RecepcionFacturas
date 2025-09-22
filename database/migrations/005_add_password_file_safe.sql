-- Migración para agregar columna password_file a la tabla payments
-- Fecha: 2025-09-22
-- Descripción: Agrega la columna password_file para almacenar rutas de archivos de contraseña subidos

-- Verificar si la columna ya existe y agregarla solo si no existe
SET @exist := (SELECT COUNT(*) 
               FROM information_schema.COLUMNS 
               WHERE TABLE_SCHEMA = 'recepcion_facturas' 
               AND TABLE_NAME = 'payments' 
               AND COLUMN_NAME = 'password_file');

SET @sqlstmt := IF(@exist = 0, 
    'ALTER TABLE payments ADD COLUMN password_file VARCHAR(255) COMMENT ''Ruta del archivo de contraseña subido'' AFTER password_generated;', 
    'SELECT ''La columna password_file ya existe en la tabla payments'' as mensaje;');

PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificación final
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_COMMENT
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'recepcion_facturas' 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME = 'password_file';