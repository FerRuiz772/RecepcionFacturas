const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate, validateInvoiceAccess, requireProveedor, requireContaduria, requireAdmin } = require('../middleware/auth');
const { body } = require('express-validator');
const multer = require('multer');

// Configuración de multer
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'uploads/temp'),
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
router.get('/dashboard/available-documents', requireProveedor, invoiceController.getAvailableDocuments);
router.get('/dashboard/work-queue', invoiceController.getWorkQueue);
router.get('/dashboard/pending-invoices', invoiceController.getPendingInvoices);

// ===== Rutas básicas =====
router.get('/', invoiceController.getAllInvoices);

// Crear factura (solo proveedores)
router.post('/', requireProveedor,
    invoiceController.uploadMiddleware,
    [
        body('number').notEmpty().trim(),
        body('amount').isFloat({ min: 0.01 }),
        body('description').notEmpty().trim()
    ],
    invoiceController.createInvoice
);

// ===== Rutas con parámetros dinámicos AL FINAL =====
router.get('/:id', validateInvoiceAccess, invoiceController.getInvoiceById);

// Actualizar factura
router.put('/:id', validateInvoiceAccess, invoiceController.updateInvoice);

// Cambiar estado
router.put('/:id/status', [
    body('status').notEmpty(),
    body('notes').optional().trim()
], validateInvoiceAccess, invoiceController.updateInvoiceStatus);

// Eliminar factura (solo super admin)
router.delete('/:id', requireAdmin, invoiceController.deleteInvoice);

// ===== Rutas para documentos =====
router.post('/:id/generate-password', validateInvoiceAccess, invoiceController.generatePassword);

// Ruta para subir documentos - accesible para cualquier usuario autenticado
router.post('/:id/upload-document',
    upload.single('file'),
    [
        body('type').isIn(['retention_isr', 'retention_iva', 'payment_proof'])
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
router.get('/:id/download-invoice', validateInvoiceAccess, invoiceController.downloadInvoiceFiles);
router.get('/:id/download-all-files', validateInvoiceAccess, invoiceController.downloadInvoiceFiles);
router.get('/:id/download-retention-isr', validateInvoiceAccess, invoiceController.downloadRetentionISR);
router.get('/:id/download-retention-iva', validateInvoiceAccess, invoiceController.downloadRetentionIVA);
router.get('/:id/download-payment-proof', validateInvoiceAccess, invoiceController.downloadPaymentProof);
router.get('/export/pdf', invoiceController.exportToPDF);

module.exports = router;