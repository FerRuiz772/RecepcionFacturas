const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, requireAdmin, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Rutas de proveedores
router.get('/', checkPermission('proveedores', 'ver'), supplierController.getAllSuppliers);
router.get('/:id', checkPermission('proveedores', 'ver'), supplierController.getSupplierById);

// Crear proveedor
router.post('/', checkPermission('proveedores', 'crear'), [
    body('business_name').isLength({ min: 2, max: 255 }).withMessage('El nombre debe tener entre 2 y 255 caracteres'),
    body('nit').isLength({ min: 8, max: 20 }).withMessage('El NIT debe tener entre 8 y 20 caracteres'),
    body('contact_phone').optional().isMobilePhone().withMessage('El teléfono no es válido'),
], supplierController.createSupplier);

router.put('/:id', checkPermission('proveedores', 'editar'), supplierController.updateSupplier);
router.delete('/:id', checkPermission('proveedores', 'eliminar'), supplierController.deleteSupplier);

module.exports = router;