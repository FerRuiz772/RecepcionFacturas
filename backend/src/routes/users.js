const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requirePermission } = require('../middleware/auth');
const { body } = require('express-validator');

// Todas las rutas protegidas
router.use(authenticate);

// Listar usuarios
router.get('/', requirePermission(['users.view']), userController.getAllUsers);

// Ver detalles de usuario
router.get('/:id', requirePermission(['users.view']), userController.getUserById);

// Obtener permisos de usuario - permitir ver propios permisos
router.get('/:id/permissions', authenticate, userController.getUserPermissions);

// Crear usuario (super admin y admin contaduria)
router.post('/', requirePermission(['users.create']), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'])
], userController.createUser);

// Actualizar usuario
router.put('/:id', requirePermission(['users.edit']), userController.updateUser);

// Cambiar contraseña de usuario
router.put('/:id/change-password', [
  // Middleware personalizado para verificar permisos
  (req, res, next) => {
    const targetUserId = parseInt(req.params.id);
    const currentUserId = req.user.userId;
    
    // Si el usuario está cambiando su propia contraseña, permitir
    if (targetUserId === currentUserId) {
      return next();
    }
    
    // Si es otro usuario, verificar permiso users.edit
    requirePermission(['users.edit'])(req, res, next);
  },
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
], userController.changePassword);

// Eliminar usuario
router.delete('/:id', requirePermission(['users.delete']), userController.deleteUser);

// Actualizar permisos de usuario
router.put('/:id/permissions', requirePermission(['users.edit']), userController.updateUserPermissions);

module.exports = router;
