const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Rutas de proveedores
router.get('/', requirePermission(['suppliers.view'], { requireAll: false }), supplierController.getAllSuppliers);
router.get('/:id', requirePermission(['suppliers.view'], { requireAll: false }), supplierController.getSupplierById);

// Crear proveedor
router.post('/', requirePermission(['suppliers.create']), [
    body('business_name').isLength({ min: 2, max: 255 }).withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('nit').isLength({ min: 8, max: 20 }).withMessage('El NIT debe tener entre 8 y 20 caracteres'),
], supplierController.createSupplier);

router.put('/:id', requirePermission(['suppliers.edit']), supplierController.updateSupplier);
router.delete('/:id', requirePermission(['suppliers.delete']), supplierController.deleteSupplier);

module.exports = router;