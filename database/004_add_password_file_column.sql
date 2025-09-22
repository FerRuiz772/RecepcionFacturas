-- Agregar columna password_file a la tabla payments
ALTER TABLE payments 
ADD COLUMN password_file VARCHAR(255) 
COMMENT 'Ruta del archivo de contraseña subido' 
AFTER password_generated;