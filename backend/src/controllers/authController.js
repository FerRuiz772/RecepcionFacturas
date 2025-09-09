const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const { User, Supplier, SystemLog } = require('../models');

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

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({
        where: { email: email.toLowerCase(), is_active: true }
      });

      if (!user) {
        // Por seguridad, no revelar si el email existe
        return res.json({ 
          message: 'Si el email existe, recibirás instrucciones de recuperación',
          code: 'RESET_EMAIL_SENT' 
        });
      }

      // Generar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hora

      // Guardar token en profile_data (temporal)
      await user.update({
        profile_data: {
          ...user.profile_data,
          reset_token: resetToken,
          reset_expires: resetExpires
        }
      });

      // Log solicitud de reset
      await SystemLog.create({
        user_id: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        entity_type: 'User',
        ip_address: req.ip,
        details: { email }
      });

      // TODO: Enviar email con el token
      console.log(`🔑 Reset token para ${email}: ${resetToken}`);

      res.json({ 
        message: 'Si el email existe, recibirás instrucciones de recuperación',
        code: 'RESET_EMAIL_SENT' 
      });

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

      // Buscar usuario con el token
      const user = await User.findOne({
        where: {
          is_active: true,
          profile_data: {
            reset_token: token
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
  }
};

module.exports = authController;