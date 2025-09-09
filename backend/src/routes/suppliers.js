const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

// Proteger todas las rutas
router.use(authenticate);

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', [
    body('business_name').notEmpty().trim(),
    body('nit').notEmpty().trim(),
    body('contact_email').optional().isEmail().normalizeEmail()
], supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;