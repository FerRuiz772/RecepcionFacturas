const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

// Proteger todas las rutas
router.use(authenticate);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').notEmpty().trim(),
    body('role').isIn(['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'])
], userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;