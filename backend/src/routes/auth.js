const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authRateLimit } = require('../middleware/auth');
const { body } = require('express-validator');

// Rate limiting para rutas de autenticación sensibles
router.use('/login', authRateLimit);
router.use('/forgot-password', authRateLimit);
router.use('/reset-password', authRateLimit);

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido'),
  body('password').isLength({ min: 6 }).withMessage('Contraseña debe tener al menos 6 caracteres')
], authController.login);

// Obtener usuario actual
router.get('/me', authenticate, authController.me);

// Logout
router.post('/logout', authenticate, authController.logout);

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token requerido')
], authController.refreshToken);

// Reset de contraseña
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Email válido requerido')
], authController.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty().withMessage('Token requerido'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], authController.resetPassword);

// Cambiar contraseña autenticado
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
  body('newPassword').isLength({ min: 6 }).withMessage('Nueva contraseña debe tener al menos 6 caracteres')
], authController.changePassword);

module.exports = router;
