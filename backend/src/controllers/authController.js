const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User, Supplier, SystemLog, PasswordResetToken } = require('../models');
const { Op } = require('sequelize'); // AÑADIDO: Para operadores Sequelize
const emailService = require('../utils/emailService');

const authController = {
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Buscar usuario con datos del proveedor
      const user = await User.findOne({
        where: { email: email.toLowerCase(), is_active: true },
        include: [{
          model: Supplier,
          as: 'supplier',
          required: false,
          attributes: ['id', 'business_name', 'nit']
        }]
      });

      if (!user || !(await user.validatePassword(password))) {
        // Log intento fallido
        await SystemLog.create({
          user_id: null,
          action: 'LOGIN_FAILED',
          entity_type: 'User',
          ip_address: clientIP,
          user_agent: userAgent,
          details: { 
            email, 
            reason: !user ? 'USER_NOT_FOUND' : 'INVALID_PASSWORD' 
          }
        });

        return res.status(401).json({ 
          error: 'Credenciales inválidas',
          code: 'INVALID_CREDENTIALS' 
        });
      }

      // Generar tokens
      const tokenPayload = { 
        userId: user.id, 
        role: user.role,
        email: user.email
      };

      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
      );

      // Actualizar último login
      await user.update({ 
        last_login: new Date(),
        profile_data: {
          ...user.profile_data,
          last_ip: clientIP,
          last_user_agent: userAgent
        }
      });

      // Log login exitoso
      await SystemLog.create({
        user_id: user.id,
        action: 'LOGIN_SUCCESS',
        entity_type: 'User',
        ip_address: clientIP,
        user_agent: userAgent,
        details: { email, role: user.role }
      });

      console.log(`✅ Login exitoso: ${email} (${user.role})`);

      // Preparar respuesta del usuario
      const responseUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        supplier_id: user.supplier_id
      };

      // Agregar datos del proveedor si aplica
      if (user.role === 'proveedor' && user.supplier) {
        responseUser.supplier_name = user.supplier.business_name;
        responseUser.supplier_nit = user.supplier.nit;
      }

      res.json({
        token,
        refreshToken,
        user: responseUser,
        expiresIn: process.env.JWT_EXPIRE || '1h'
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      
      // Log error interno
      await SystemLog.create({
        user_id: null,
        action: 'LOGIN_ERROR',
        entity_type: 'System',
        ip_address: req.ip,
        details: { 
          error: error.message,
          stack: error.stack 
        }
      });

      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  // NUEVO: Endpoint para obtener usuario actual (para el problema del reload)
  async me(req, res) {
    try {
      const userId = req.user.userId;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] },
        include: [{
          model: Supplier,
          as: 'supplier',
          required: false,
          attributes: ['id', 'business_name', 'nit']
        }]
      });

      if (!user || !user.is_active) {
        return res.status(401).json({ 
          error: 'Usuario no válido o inactivo',
          code: 'USER_INVALID' 
        });
      }

      // Preparar respuesta del usuario
      const responseUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        supplier_id: user.supplier_id,
        last_login: user.last_login
      };

      // Agregar datos del proveedor si aplica
      if (user.role === 'proveedor' && user.supplier) {
        responseUser.supplier_name = user.supplier.business_name;
        responseUser.supplier_nit = user.supplier.nit;
      }

      res.json({ user: responseUser });

    } catch (error) {
      console.error('❌ Error en /me:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async logout(req, res) {
    try {
      const userId = req.user?.userId;
      const clientIP = req.ip;

      if (userId) {
        // Log logout
        await SystemLog.create({
          user_id: userId,
          action: 'LOGOUT',
          entity_type: 'User',
          ip_address: clientIP,
          details: { timestamp: new Date() }
        });

        console.log(`📤 Logout: ${req.user.email}`);
      }

      res.json({ 
        message: 'Logout exitoso',
        timestamp: new Date().toISOString() 
      });

    } catch (error) {
      console.error('❌ Error en logout:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ 
          error: 'Refresh token requerido',
          code: 'REFRESH_TOKEN_REQUIRED' 
        });
      }

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Validar que sea un refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          error: 'Token inválido',
          code: 'INVALID_REFRESH_TOKEN' 
        });
      }

      const user = await User.findByPk(decoded.userId);
      
      if (!user || !user.is_active) {
        return res.status(401).json({ 
          error: 'Usuario no válido',
          code: 'USER_INVALID' 
        });
      }

      // Generar nuevo access token
      const newToken = jwt.sign(
        { 
          userId: user.id, 
          role: user.role,
          email: user.email 
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '1h' }
      );

      // Log refresh
      await SystemLog.create({
        user_id: user.id,
        action: 'TOKEN_REFRESH',
        entity_type: 'User',
        ip_address: req.ip,
        details: { email: user.email }
      });

      res.json({ 
        token: newToken,
        expiresIn: process.env.JWT_EXPIRE || '1h'
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Refresh token expirado',
          code: 'REFRESH_TOKEN_EXPIRED' 
        });
      }
      
      return res.status(401).json({ 
        error: 'Refresh token inválido',
        code: 'INVALID_REFRESH_TOKEN' 
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ 
          error: 'Token y nueva contraseña requeridos',
          code: 'MISSING_FIELDS' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'La contraseña debe tener al menos 6 caracteres',
          code: 'PASSWORD_TOO_SHORT' 
        });
      }

      // CORREGIDO: Usar operador JSON de Sequelize para buscar en profile_data
      const user = await User.findOne({
        where: {
          is_active: true,
          profile_data: {
            [Op.contains]: { reset_token: token }
          }
        }
      });

      if (!user) {
        return res.status(400).json({ 
          error: 'Token inválido o expirado',
          code: 'INVALID_RESET_TOKEN' 
        });
      }

      // Verificar expiración
      const resetExpires = new Date(user.profile_data.reset_expires);
      if (resetExpires < new Date()) {
        return res.status(400).json({ 
          error: 'Token expirado',
          code: 'RESET_TOKEN_EXPIRED' 
        });
      }

      // Actualizar contraseña y limpiar token
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      await user.update({
        password_hash: hashedPassword,
        profile_data: {
          ...user.profile_data,
          reset_token: null,
          reset_expires: null,
          password_changed_at: new Date()
        }
      });

      // Log cambio de contraseña
      await SystemLog.create({
        user_id: user.id,
        action: 'PASSWORD_RESET_SUCCESS',
        entity_type: 'User',
        ip_address: req.ip,
        details: { email: user.email }
      });

      console.log(`🔐 Contraseña actualizada para: ${user.email}`);

      res.json({ 
        message: 'Contraseña actualizada exitosamente',
        code: 'PASSWORD_UPDATED' 
      });

    } catch (error) {
      console.error('❌ Error en reset password:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Contraseña actual y nueva requeridas',
          code: 'MISSING_FIELDS' 
        });
      }

      const user = await User.findByPk(userId);
      
      if (!user || !(await user.validatePassword(currentPassword))) {
        return res.status(400).json({ 
          error: 'Contraseña actual incorrecta',
          code: 'INVALID_CURRENT_PASSWORD' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          error: 'La nueva contraseña debe tener al menos 6 caracteres',
          code: 'PASSWORD_TOO_SHORT' 
        });
      }

      // Actualizar contraseña
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));

      await user.update({
        password_hash: hashedPassword,
        profile_data: {
          ...user.profile_data,
          password_changed_at: new Date()
        }
      });

      // Log cambio de contraseña
      await SystemLog.create({
        user_id: userId,
        action: 'PASSWORD_CHANGE',
        entity_type: 'User',
        ip_address: req.ip,
        details: { email: user.email }
      });

      res.json({ 
        message: 'Contraseña cambiada exitosamente',
        code: 'PASSWORD_CHANGED' 
      });

    } catch (error) {
      console.error('❌ Error en change password:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      // Buscar usuario por email
      const user = await User.findOne({
        where: { 
          email: email.toLowerCase(), 
          is_active: true 
        }
      });

      // Por seguridad, siempre devolvemos el mismo mensaje
      // independientemente de si el usuario existe o no
      const response = {
        message: 'Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.',
        code: 'RESET_EMAIL_SENT'
      };

      if (!user) {
        // Log del intento con email inexistente
        await SystemLog.create({
          user_id: null,
          action: 'password_reset_request_invalid',
          ip_address: clientIP,
          details: { email, reason: 'user_not_found' }
        });

        // Devolvemos la misma respuesta por seguridad
        return res.json(response);
      }

      // Verificar si ya existe un token activo reciente (último minuto)
      const recentToken = await PasswordResetToken.findOne({
        where: {
          user_id: user.id,
          used_at: null,
          created_at: {
            [Op.gte]: new Date(Date.now() - 60000) // Último minuto
          }
        }
      });

      if (recentToken) {
        return res.status(429).json({
          error: 'Ya se envió un correo de recuperación recientemente. Espera un momento antes de solicitar otro.',
          code: 'RATE_LIMITED'
        });
      }

      // Invalidar tokens anteriores
      await PasswordResetToken.update(
        { used_at: new Date() },
        { 
          where: { 
            user_id: user.id, 
            used_at: null 
          } 
        }
      );

      // Generar nuevo token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hora

      // Crear registro de token
      await PasswordResetToken.create({
        token: resetToken,
        user_id: user.id,
        expires_at: expiresAt
      });

      // Enviar email de recuperación
      try {
        await emailService.sendPasswordResetEmail(
          user.email,
          user.name,
          resetToken
        );

        // Log exitoso
        await SystemLog.create({
          user_id: user.id,
          action: 'password_reset_request_sent',
          ip_address: clientIP,
          details: { email: user.email }
        });

      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        
        // Eliminar token si no se pudo enviar el email
        await PasswordResetToken.destroy({
          where: { token: resetToken }
        });

        return res.status(500).json({
          error: 'No se pudo enviar el correo de recuperación. Inténtalo más tarde.',
          code: 'EMAIL_ERROR'
        });
      }

      res.json(response);

    } catch (error) {
      console.error('❌ Error en forgot password:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password, confirmPassword } = req.body;
      const clientIP = req.ip || req.connection.remoteAddress;

      // Validar que las contraseñas coincidan
      if (password !== confirmPassword) {
        return res.status(400).json({
          error: 'Las contraseñas no coinciden',
          code: 'PASSWORD_MISMATCH'
        });
      }

      // Buscar token válido
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          used_at: null,
          expires_at: {
            [Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'user',
          where: { is_active: true }
        }]
      });

      if (!resetToken) {
        return res.status(400).json({
          error: 'Token inválido o expirado',
          code: 'INVALID_TOKEN'
        });
      }

      const user = resetToken.user;

      // Validar fortaleza de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos',
          code: 'WEAK_PASSWORD'
        });
      }

      // Verificar que no sea la misma contraseña actual
      const isSamePassword = await user.validatePassword(password);
      if (isSamePassword) {
        return res.status(400).json({
          error: 'La nueva contraseña debe ser diferente a la actual',
          code: 'SAME_PASSWORD'
        });
      }

      // Actualizar contraseña (el hook beforeUpdate se encargará del hash)
      await user.update({ password_hash: password });

      // Marcar token como usado
      await resetToken.update({ used_at: new Date() });

      // Log exitoso
      await SystemLog.create({
        user_id: user.id,
        action: 'password_reset_completed',
        ip_address: clientIP,
        details: { email: user.email }
      });

      res.json({
        message: 'Contraseña restablecida exitosamente',
        code: 'PASSWORD_RESET_SUCCESS'
      });

    } catch (error) {
      console.error('❌ Error en reset password:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  },

  async validateResetToken(req, res) {
    try {
      const { token } = req.params;

      // Buscar token válido
      const resetToken = await PasswordResetToken.findOne({
        where: {
          token,
          used_at: null,
          expires_at: {
            [Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'user',
          where: { is_active: true },
          attributes: ['id', 'email', 'name']
        }]
      });

      if (!resetToken) {
        return res.status(400).json({
          error: 'Token inválido o expirado',
          code: 'INVALID_TOKEN'
        });
      }

      res.json({
        valid: true,
        code: 'VALID_TOKEN',
        user: {
          email: resetToken.user.email,
          name: resetToken.user.name
        }
      });

    } catch (error) {
      console.error('❌ Error validating reset token:', error);
      res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
};

module.exports = authController;