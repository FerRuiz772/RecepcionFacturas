const express = require('express');
const router = express.Router();
const { authenticate, requireContaduria, requireProveedor } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// Todas las rutas protegidas
router.use(authenticate);

// Ruta para cola de trabajo 
router.get('/work-queue', requireContaduria, invoiceController.getWorkQueue);

// Ruta para facturas pendientes
router.get('/pending-invoices', requireContaduria, invoiceController.getPendingInvoices);

// Ruta para documentos disponibles (proveedores)
router.get('/available-documents', requireProveedor, invoiceController.getAvailableDocuments);

module.exports = router;