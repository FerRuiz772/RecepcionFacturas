const jwt = require('jsonwebtoken');
const { User, Supplier } = require('../models');
const rateLimit = require('express-rate-limit');

// Rate limiting para autenticación
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 5 intentos por IP
  message: { error: 'Demasiados intentos de autenticación' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware principal de autenticación
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autorización requerido',
        code: 'NO_TOKEN' 
      });
    }

    const token = authHeader.substring(7);

    // Verificar el token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validar estructura del token
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ 
        error: 'Token malformado',
        code: 'INVALID_TOKEN_STRUCTURE' 
      });
    }

    // Buscar el usuario en la base de datos con datos del proveedor si aplica
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] },
      include: [{
        model: Supplier,
        as: 'supplier',
        required: false,
        attributes: ['id', 'business_name', 'nit']
      }]
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND' 
      });
    }

    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Usuario inactivo',
        code: 'USER_INACTIVE' 
      });
    }

    // Verificar que el rol del token coincida con el de la BD
    if (user.role !== decoded.role) {
      return res.status(401).json({ 
        error: 'Rol inconsistente',
        code: 'ROLE_MISMATCH' 
      });
    }

    // Agregar datos completos del usuario al request
    req.user = {
      userId: user.id,
      id: user.id, // Para compatibilidad
      email: user.email,
      name: user.name,
      role: user.role,
      supplier_id: user.supplier_id,
      // Datos del proveedor si aplica
      ...(user.supplier && {
        supplier_name: user.supplier.business_name,
        supplier_nit: user.supplier.nit
      })
    };

    // Agregar métodos de utilidad
    req.user.isProveedor = user.role === 'proveedor';
    req.user.isContaduria = ['admin_contaduria', 'trabajador_contaduria'].includes(user.role);
    req.user.isAdmin = ['super_admin', 'admin_contaduria'].includes(user.role);
    req.user.isSuperAdmin = user.role === 'super_admin';

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED' 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'INVALID_TOKEN' 
      });
    } else {
      console.error('Error en autenticación:', error);
      return res.status(500).json({ 
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR' 
      });
    }
  }
};

// Middleware de autorización por roles
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    // Si no se especifican roles, permitir a todos los autenticados
    if (allowedRoles.length === 0) {
      return next();
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Roles requeridos: ${allowedRoles.join(', ')}`,
        code: 'INSUFFICIENT_PRIVILEGES',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }

    next();
  };
};

// Middleware específico para proveedores
const requireProveedor = (req, res, next) => {
  if (!req.user.isProveedor) {
    return res.status(403).json({ 
      error: 'Solo proveedores pueden acceder',
      code: 'PROVEEDOR_REQUIRED' 
    });
  }
  next();
};

// Middleware específico para contaduría
const requireContaduria = (req, res, next) => {
  if (!req.user.isContaduria) {
    return res.status(403).json({ 
      error: 'Solo personal de contaduría puede acceder',
      code: 'CONTADURIA_REQUIRED' 
    });
  }
  next();
};

// Middleware específico para admins
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Solo administradores pueden acceder',
      code: 'ADMIN_REQUIRED' 
    });
  }
  next();
};

// Middleware para validar permisos sobre facturas específicas
const validateInvoiceAccess = async (req, res, next) => {
  try {
    const invoiceId = req.params.id;
    const { Invoice } = require('../models');

    if (!invoiceId) {
      return res.status(400).json({ 
        error: 'ID de factura requerido',
        code: 'INVOICE_ID_REQUIRED' 
      });
    }

    const invoice = await Invoice.findByPk(invoiceId, {
      attributes: ['id', 'supplier_id', 'assigned_to']
    });

    if (!invoice) {
      return res.status(404).json({ 
        error: 'Factura no encontrada',
        code: 'INVOICE_NOT_FOUND' 
      });
    }

    // Super admin puede acceder a todo
    if (req.user.isSuperAdmin) {
      return next();
    }

    // Proveedores solo pueden acceder a sus propias facturas
    if (req.user.isProveedor) {
      if (invoice.supplier_id !== req.user.supplier_id) {
        return res.status(403).json({ 
          error: 'No puede acceder a facturas de otros proveedores',
          code: 'INVOICE_ACCESS_DENIED' 
        });
      }
    }

    // Trabajadores de contaduría solo pueden acceder a facturas asignadas
    if (req.user.role === 'trabajador_contaduria') {
      if (invoice.assigned_to !== req.user.userId) {
        return res.status(403).json({ 
          error: 'No puede acceder a facturas no asignadas',
          code: 'INVOICE_NOT_ASSIGNED' 
        });
      }
    }

    // Admin de contaduría puede acceder a todas las facturas
    req.invoice = invoice;
    next();
  } catch (error) {
    console.error('Error validating invoice access:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      code: 'INTERNAL_ERROR' 
    });
  }
};

// Middleware para logging de accesos
const logAccess = (req, res, next) => {
  if (req.user) {
    console.log(`[${new Date().toISOString()}] ${req.user.role} (${req.user.email}) - ${req.method} ${req.originalUrl}`);
  }
  next();
};

// Middleware para detectar cambios de contraseña forzosos
const checkPasswordChange = async (req, res, next) => {
  // Implementar lógica si necesitas forzar cambio de contraseña
  next();
};

module.exports = {
  authenticate,
  authorize,
  requireProveedor,
  requireContaduria,
  requireAdmin,
  validateInvoiceAccess,
  logAccess,
  checkPasswordChange,
  authRateLimit
};