-- Migration: Add phone field to users table for WhatsApp notifications
-- Description: Adds a phone column to store user phone numbers for WhatsApp integration
-- Author: PayQuetzal Team
-- Date: October 2025
-- Version: 011

-- Add phone column to users table
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20) NULL 
COMMENT 'Número de teléfono para notificaciones por WhatsApp (sin código de país, ej: 12345678)';

-- Create index for faster lookups
CREATE INDEX idx_users_phone ON users(phone);

-- Optional: Add constraint to ensure phone format (Guatemala: 8 digits)
-- Uncomment if you want to enforce format validation at database level
-- ALTER TABLE users 
-- ADD CONSTRAINT chk_phone_format 
-- CHECK (phone IS NULL OR phone REGEXP '^[0-9]{8}$');

-- Update existing records (optional - only if you have phone data to migrate)
-- UPDATE users SET phone = 'PHONE_NUMBER' WHERE id = USER_ID;

-- Example data for testing (optional - remove in production)
-- UPDATE users SET phone = '12345678' WHERE email = 'proveedor@example.com';
-- UPDATE users SET phone = '87654321' WHERE email = 'admin@example.com';

-- Verification query
SELECT 
    id, 
    username, 
    email, 
    phone, 
    role,
    is_active
FROM users
WHERE phone IS NOT NULL
ORDER BY id;

-- Count users with phone numbers
SELECT 
    role,
    COUNT(*) as total_users,
    SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) as users_with_phone,
    CONCAT(
        ROUND(
            (SUM(CASE WHEN phone IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
            2
        ),
        '%'
    ) as percentage_with_phone
FROM users
WHERE is_active = 1
GROUP BY role;
