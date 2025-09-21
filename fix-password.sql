USE recepcion_facturas;

-- Establecer contraseña conocida: admin123
UPDATE users 
SET password_hash = '$2b$12$CDMbKxPWQOEKF7zJBFqfWOMKrnJoFVqMyvlAcLxo2ikpraHXSyphC' 
WHERE email = 'aquiles14troya@gmail.com';

SELECT 'Contraseña temporal establecida para aquiles14troya@gmail.com: admin123' as Resultado;