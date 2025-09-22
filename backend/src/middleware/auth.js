const jwt = require('jsonwebtoken');
const { User, Supplier, UserPermission } = require('../models');
const rateLimit = require('express-rate-limit');

/**
 * Rate limiting para endpoints de autenticación
 * Previene ataques de fuerza bruta limitando intentos por IP
 */
const authRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // Ventana de 1 minuto para desarrollo
  max: 1000, // Máximo 1000 intentos por IP para desarrollo  
  message: { error: 'Demasiados intentos de autenticación' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar rate limiting para IPs locales en desarrollo
    const isLocal = req.ip === '127.0.0.1' || req.ip === '::1' || req.ip.startsWith('192.168.') || req.ip.startsWith('::ffff:192.168.')
    return process.env.NODE_ENV === 'development' && isLocal
  }
});

/**
 * Middleware principal de autenticación JWT
 * Valida tokens, carga datos del usuario y verifica estado activo
 * Soporta tokens en header Authorization y query parameter (para iframes)
 * @param {Object} req - Request object
 * @param {Object} res - Response object 
 * @param {Function} next - Next middleware function
 */
const authenticate = async (req, res, next) => {
  try {
    // Extraer token desde header Authorization o query parameter
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Token de acceso requerido',
        code: 'NO_TOKEN' 
      });
    }

    // Verificar y decodificar token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validar estructura del token
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({ 
        error: 'Token malformado',
        code: 'INVALID_TOKEN_STRUCTURE' 
      });
    }

    // Buscar usuario en la base de datos con datos del proveedor y permisos
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          required: false,
          attributes: ['id', 'business_name', 'nit']
        },
        {
          model: UserPermission,
          as: 'userPermissions',
          required: false,
          attributes: ['permission_key', 'granted']
        }
      ]
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

    // Cargar permisos del usuario
    let userPermissions = [];
    
    // Si el usuario tiene permisos en formato JSON (nuevo sistema)
    if (user.permissions && typeof user.permissions === 'object') {
      // Convertir el objeto JSON a un array de strings de permisos
      for (const [module, actions] of Object.entries(user.permissions)) {
        for (const [action, granted] of Object.entries(actions)) {
          if (granted === true) {
            userPermissions.push(`${module}.${action}`);
          }
        }
      }
    } else {
      // Sistema legacy con tabla user_permissions
      const permissions = user.userPermissions || [];
      userPermissions = permissions
        .filter(p => p.granted)
        .map(p => p.permission_key);
    }

    // Función helper para verificar permisos
    const hasPermission = (permissionKey) => {
      // Verificar solo permisos específicos, sin bypass por rol
      return userPermissions.includes(permissionKey);
    };

    const hasAllPermissions = (permissionKeys) => {
      return permissionKeys.every(key => userPermissions.includes(key));
    };

    const hasAnyPermission = (permissionKeys) => {
      return permissionKeys.some(key => userPermissions.includes(key));
    };

    // Agregar datos completos del usuario al request
    req.user = {
      userId: user.id,
      id: user.id, // compatibilidad
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: userPermissions, // Lista de permisos activos
      supplier_id: user.supplier_id,
      ...(user.supplier && {
        supplier_name: user.supplier.business_name,
        supplier_nit: user.supplier.nit
      }),
      // Métodos helper para verificar permisos
      hasPermission,
      hasAllPermissions,
      hasAnyPermission
    };

    // Helpers legacy (mantenemos por compatibilidad)
    req.user.isProveedor = user.role === 'proveedor';
    req.user.isContaduria = ['super_admin', 'admin_contaduria', 'trabajador_contaduria'].includes(user.role);
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

// Nuevo middleware de autorización basado en permisos granulares
const requirePermission = (permissionKeys, options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    // Si no se especifican permisos, permitir acceso
    if (!permissionKeys || permissionKeys.length === 0) {
      return next();
    }

    // Convertir a array si es string
    const permissions = Array.isArray(permissionKeys) ? permissionKeys : [permissionKeys];
    
    // Determinar el tipo de verificación (ALL por defecto, o ANY)
    const requireAll = options.requireAll !== false; // Por defecto true

    let hasAccess = false;
    
    if (requireAll) {
      // Requiere TODOS los permisos especificados
      hasAccess = req.user.hasAllPermissions(permissions);
    } else {
      // Requiere AL MENOS UNO de los permisos especificados
      hasAccess = req.user.hasAnyPermission(permissions);
    }

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
};

// Middleware de autorización por roles (mantenido por compatibilidad)
const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'NOT_AUTHENTICATED' 
      });
    }

    if (allowedRoles.length === 0) return next();

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

// Middleware específico para proveedores (legacy)
const requireProveedor = (req, res, next) => {
  if (!req.user.isProveedor) {
    return res.status(403).json({ 
      error: 'Acceso denegado',
      code: 'ACCESS_DENIED' 
    });
  }
  next();
};

// Middleware específico para contaduría (legacy)
const requireContaduria = (req, res, next) => {
  if (!req.user.isContaduria) {
    return res.status(403).json({ 
      error: 'Acceso denegado',
      code: 'ACCESS_DENIED' 
    });
  }
  next();
};

// Middleware específico para admins
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      error: 'Acceso denegado',
      code: 'ACCESS_DENIED' 
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

    if (req.user.isSuperAdmin) return next();

    if (req.user.isProveedor && invoice.supplier_id !== req.user.supplier_id) {
      return res.status(403).json({ 
        error: 'Acceso denegado',
        code: 'ACCESS_DENIED' 
      });
    }

    // Los trabajadores de contaduría pueden acceder a facturas asignadas, subir documentos y visualizar archivos
    if (req.user.role === 'trabajador_contaduria') {
      const isUploadEndpoint = req.path.includes('/upload-document');
      const isViewFileEndpoint = req.path.includes('/view-file');
      const isAssigned = invoice.assigned_to === req.user.userId;
      
      if (!isAssigned && !isUploadEndpoint && !isViewFileEndpoint) {
        return res.status(403).json({ 
          error: 'Acceso denegado',
          code: 'ACCESS_DENIED' 
        });
      }
    }

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

// Middleware para detectar cambios de contraseña forzosos (placeholder)
const checkPasswordChange = async (req, res, next) => {
  next();
};

module.exports = {
  authenticate,
  requirePermission,    // Nuevo middleware principal
  authorize,           // Legacy - mantenido por compatibilidad
  requireProveedor,    // Legacy
  requireContaduria,   // Legacy
  requireAdmin,
  validateInvoiceAccess,
  logAccess,
  checkPasswordChange,
  authRateLimit
};
