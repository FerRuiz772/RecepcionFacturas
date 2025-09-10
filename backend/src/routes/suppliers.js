const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, requireAdmin, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Rutas de proveedores
router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);

// Crear proveedor
router.post('/', [
    body('business_name').notEmpty().trim(),
    body('nit').notEmpty().trim(),
    body('contact_email').optional().isEmail().normalizeEmail()
], supplierController.createSupplier);

router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;