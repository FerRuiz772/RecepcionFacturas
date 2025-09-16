const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Listar usuarios (incluye trabajador_contaduria para asignaciones)
router.get('/', authorize(['super_admin', 'admin_contaduria', 'trabajador_contaduria']), userController.getAllUsers);

// Ver detalles de usuario (incluye trabajador_contaduria para asignaciones)
router.get('/:id', authorize(['super_admin', 'admin_contaduria', 'trabajador_contaduria']), userController.getUserById);

// Solo super_admin puede crear
router.post('/', authorize(['super_admin']), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'])
], userController.createUser);

// Actualizar (admin_contaduria o super_admin)
router.put('/:id', authorize(['super_admin', 'admin_contaduria']), userController.updateUser);

// Eliminar (solo super_admin)
router.delete('/:id', authorize(['super_admin']), userController.deleteUser);

module.exports = router;
