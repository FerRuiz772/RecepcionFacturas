const fs = require('fs').promises;
const path = require('path');
const { Invoice, Supplier, Payment } = require('../models');

async function migrateFilesToNewStructure() {
    try {
        console.log('🚀 Iniciando migración de archivos...');
        
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const proveedoresDir = path.join(uploadsDir, 'proveedores');
        
        // Crear carpeta base de proveedores
        await fs.mkdir(proveedoresDir, { recursive: true });
        
        // Obtener todas las facturas con proveedores
        const invoices = await Invoice.findAll({
            include: [
                { model: Supplier, as: 'supplier' },
                { model: Payment, as: 'payment' }
            ]
        });
        
        console.log(`📋 Encontradas ${invoices.length} facturas para migrar`);
        
        for (const invoice of invoices) {
            try {
                // Normalizar nombre del proveedor para carpeta
                const supplierFolder = invoice.supplier.business_name
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                    .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales
                    .toLowerCase();
                
                // Normalizar número de factura
                const invoiceFolder = invoice.number
                    .replace(/[^a-zA-Z0-9\-]/g, '_');
                
                // Crear estructura de carpetas
                const supplierDir = path.join(proveedoresDir, supplierFolder);
                const invoiceDir = path.join(supplierDir, invoiceFolder);
                
                await fs.mkdir(supplierDir, { recursive: true });
                await fs.mkdir(invoiceDir, { recursive: true });
                
                console.log(`📁 Creada carpeta: ${invoiceDir}`);
                
                // Migrar archivos de factura si existen
                if (invoice.uploaded_files && invoice.uploaded_files.length > 0) {
                    for (const file of invoice.uploaded_files) {
                        const oldPath = path.join(uploadsDir, file.filename);
                        const newPath = path.join(invoiceDir, file.filename);
                        
                        try {
                            await fs.access(oldPath);
                            await fs.copyFile(oldPath, newPath);
                            console.log(`✅ Migrado: ${file.filename}`);
                        } catch (error) {
                            console.log(`⚠️  Archivo no encontrado: ${file.filename}`);
                        }
                    }
                }
                
                // Migrar archivos de pago si existen
                if (invoice.payment) {
                    const payment = invoice.payment;
                    
                    // Migrar retención ISR
                    if (payment.isr_retention_file) {
                        const oldPath = path.join(uploadsDir, payment.isr_retention_file);
                        const newPath = path.join(invoiceDir, payment.isr_retention_file);
                        
                        try {
                            await fs.access(oldPath);
                            await fs.copyFile(oldPath, newPath);
                            console.log(`✅ Migrado ISR: ${payment.isr_retention_file}`);
                        } catch (error) {
                            console.log(`⚠️  Archivo ISR no encontrado: ${payment.isr_retention_file}`);
                        }
                    }
                    
                    // Migrar retención IVA
                    if (payment.iva_retention_file) {
                        const oldPath = path.join(uploadsDir, payment.iva_retention_file);
                        const newPath = path.join(invoiceDir, payment.iva_retention_file);
                        
                        try {
                            await fs.access(oldPath);
                            await fs.copyFile(oldPath, newPath);
                            console.log(`✅ Migrado IVA: ${payment.iva_retention_file}`);
                        } catch (error) {
                            console.log(`⚠️  Archivo IVA no encontrado: ${payment.iva_retention_file}`);
                        }
                    }
                    
                    // Migrar comprobante de pago
                    if (payment.payment_proof_file) {
                        const oldPath = path.join(uploadsDir, payment.payment_proof_file);
                        const newPath = path.join(invoiceDir, payment.payment_proof_file);
                        
                        try {
                            await fs.access(oldPath);
                            await fs.copyFile(oldPath, newPath);
                            console.log(`✅ Migrado comprobante: ${payment.payment_proof_file}`);
                        } catch (error) {
                            console.log(`⚠️  Archivo comprobante no encontrado: ${payment.payment_proof_file}`);
                        }
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error migrando factura ${invoice.number}:`, error.message);
            }
        }
        
        console.log('✅ Migración completada!');
        console.log('📝 Los archivos originales se mantuvieron como respaldo');
        console.log('🗂️  Nueva estructura creada en: uploads/proveedores/');
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    migrateFilesToNewStructure();
}

module.exports = { migrateFilesToNewStructure };
