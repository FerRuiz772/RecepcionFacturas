const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, validateInvoiceAccess, requirePermission } = require('../middleware/auth');
const { body } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que el directorio de uploads/temp existe
const uploadsDir = path.join(__dirname, '..', 'uploads');
const tempDir = path.join(uploadsDir, 'temp');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// Configuración de multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, tempDir),
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, `${file.fieldname}-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF e imágenes'));
        }
    }
});

// Todas las rutas protegidas
router.use(authenticate);

// ===== DASHBOARD PRIMERO (rutas específicas) =====
router.get('/dashboard/available-documents', requirePermission(['invoices.view'], { requireAll: false }), invoiceController.getAvailableDocuments);
router.get('/dashboard/work-queue', requirePermission(['invoices.view'], { requireAll: false }), invoiceController.getWorkQueue);
router.get('/dashboard/pending-invoices', requirePermission(['invoices.view'], { requireAll: false }), invoiceController.getPendingInvoices);

// ===== Rutas básicas =====
router.get('/', requirePermission(['invoices.view'], { requireAll: false }), invoiceController.getAllInvoices);

// Crear factura (proveedores solo suben archivos, contaduría incluye datos)
router.post('/', requirePermission(['invoices.create']),
    invoiceController.uploadMiddleware,
    // Validación condicional basada en el rol del usuario
    (req, res, next) => {
        const { role } = req.user;
        
        // Si es contaduría, validar datos completos
        if (['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(role)) {
            const { body: validate } = require('express-validator');
            const validations = [
                validate('number').notEmpty().trim().withMessage('Número de factura requerido'),
                validate('amount').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
                validate('description').notEmpty().trim().withMessage('Descripción requerida')
            ];
            
            // Ejecutar validaciones
            Promise.all(validations.map(validation => validation.run(req)))
                .then(() => next())
                .catch(next);
        } else {
            // Para proveedores, solo validar que haya archivos (se hace en el controller)
            next();
        }
    },
    invoiceController.createInvoice
);

// ===== Rutas con parámetros dinámicos AL FINAL =====
router.get('/:id', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.getInvoiceById);

// Actualizar factura
router.put('/:id', requirePermission(['invoices.edit']), validateInvoiceAccess, invoiceController.updateInvoice);

// Cambiar estado
router.put('/:id/status', requirePermission(['invoices.edit']), [
    body('status').notEmpty(),
    body('notes').optional().trim()
], validateInvoiceAccess, invoiceController.updateInvoiceStatus);

// Eliminar factura
router.delete('/:id', requirePermission(['invoices.delete']), invoiceController.deleteInvoice);

// ===== Rutas para documentos =====
router.post('/:id/generate-password', requirePermission(['invoices.view']), validateInvoiceAccess, invoiceController.generatePassword);

// Ruta para subir documentos
router.post('/:id/upload-document', requirePermission(['invoices.edit']),
    upload.single('file'),
    [
        body('type').isIn(['retention_isr', 'retention_iva', 'payment_proof', 'password_file'])
    ],
    async (req, res, next) => {
        try {
            const { Invoice } = require('../models');
            const invoice = await Invoice.findByPk(req.params.id);
            
            if (!invoice) {
                return res.status(404).json({ 
                    error: 'Factura no encontrada',
                    code: 'INVOICE_NOT_FOUND' 
                });
            }

            req.invoice = invoice;
            next();
        } catch (error) {
            next(error);
        }
    },
    invoiceController.uploadDocument
);

// ===== Descargas =====
router.get('/:id/download-invoice', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadInvoiceFiles);
router.get('/:id/download-all-files', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadInvoiceFiles);
router.get('/:id/download-retention-isr', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadRetentionISR);
router.get('/:id/download-retention-iva', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadRetentionIVA);
router.get('/:id/download-payment-proof', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadPaymentProof);
router.get('/:id/download-password-file', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadPasswordFile);

// ===== Visualización y descarga de archivos específicos =====
router.get('/:id/view-file/:filename', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.viewInvoiceFile);
router.get('/:id/download-file/:filename', requirePermission(['invoices.view'], { requireAll: false }), validateInvoiceAccess, invoiceController.downloadInvoiceFile);

// Ruta para reemplazar documentos específicos
router.put('/:id/replace-document/:type', requirePermission(['invoices.edit']),
    upload.single('file'),
    validateInvoiceAccess,
    invoiceController.replaceDocument
);

module.exports = router;