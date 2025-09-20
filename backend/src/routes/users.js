const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Listar usuarios
router.get('/', checkPermission('usuarios', 'ver'), userController.getAllUsers);

// Ver detalles de usuario
router.get('/:id', checkPermission('usuarios', 'ver'), userController.getUserById);

// Obtener permisos modulares de usuario
router.get('/:id/permissions', checkPermission('usuarios', 'gestionar'), userController.getModularPermissions);

// Crear usuario (solo super admin)
router.post('/', authorize(['super_admin']), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'])
], userController.createUser);

// Actualizar usuario (solo super admin)
router.put('/:id', authorize(['super_admin']), userController.updateUser);

// Eliminar usuario (solo super admin)
router.delete('/:id', authorize(['super_admin']), userController.deleteUser);

// Actualizar permisos modulares de usuario
router.put('/:id/permissions', checkPermission('usuarios', 'gestionar'), userController.updateModularPermissions);

// Obtener información de permisos para un rol
router.get('/permissions/info/:role', checkPermission('usuarios', 'gestionar'), userController.getPermissionInfo);

// Obtener permisos por defecto de un rol
router.get('/permissions/defaults/:role', checkPermission('usuarios', 'gestionar'), userController.getDefaultPermissions);

module.exports = router;
