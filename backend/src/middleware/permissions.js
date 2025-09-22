/**
 * Middleware de verificación de permisos granulares para PayQuetzal
 * 
 * Implementa un sistema de autorización de dos niveles:
 * 1. Permisos base por rol (super_admin, admin_contaduria, trabajador_contaduria, proveedor)
 * 2. Permisos específicos por usuario almacenados en user_permissions
 * 
 * Estructura de permisos:
 * - dashboard: { ver }
 * - facturas: { ver_todas, ver_propias, crear, editar, eliminar }
 * - documentos: { ver_todas, ver_propias, crear, editar, eliminar }
 * - proveedores: { ver_todas, ver_propias, crear, editar, gestionar, eliminar }
 * - usuarios: { ver_todas, ver_propias, crear, editar, gestionar, eliminar }
 * 
 * Validaciones adicionales:
 * - Verificación de propiedad de recursos (usuarios solo ven sus propios datos)
 * - Restricciones específicas por rol y contexto
 * - Override de permisos individuales almacenados en BD
 * 
 * Uso: checkPermission('facturas', 'ver_todas') como middleware en rutas
 */

const db = require('../utils/database');

/**
 * Retorna la matriz de permisos por defecto según el rol del usuario
 * Define qué puede hacer cada tipo de usuario en el sistema
 * 
 * @param {string} role - Rol del usuario (super_admin, admin_contaduria, trabajador_contaduria, proveedor)
 * @returns {Object} Objeto con permisos estructurados por módulo y acción
 */
const getDefaultPermissions = (role) => {
  const defaults = {
    // Super administrador: acceso total al sistema
    super_admin: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: true },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: true },
      proveedores: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: true, eliminar: true },
      usuarios: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: true, eliminar: true }
    },
    // Administrador de contaduría: gestión completa excepto eliminaciones críticas
    admin_contaduria: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      proveedores: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: false, eliminar: false },
      usuarios: { ver_todas: true, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false }
    },
    // Trabajador de contaduría: procesamiento de facturas asignadas
    trabajador_contaduria: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: false, editar: true, eliminar: false },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      proveedores: { ver_todas: true, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false },
      usuarios: { ver_todas: false, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false }
    },
    // Proveedor: solo gestión de sus propias facturas y documentos
    proveedor: {
      dashboard: { ver: true },
      facturas: { ver_todas: false, ver_propias: true, crear: true, editar: false, eliminar: false },
      documentos: { ver_todas: false, ver_propias: true, crear: true, editar: false, eliminar: false },
      proveedores: { ver_todas: false, ver_propias: true, crear: false, editar: true, gestionar: false, eliminar: false },
      usuarios: { ver_todas: false, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false }
    }
  };

  return defaults[role] || defaults['proveedor'];
};

/**
 * Verifica si un usuario es propietario de un recurso específico
 * Implementa las reglas de propiedad para cada tipo de entidad
 * 
 * @param {number} userId - ID del usuario que solicita acceso
 * @param {string} resourceType - Tipo de recurso (facturas, proveedores, usuarios)
 * @param {number} resourceId - ID del recurso específico
 * @returns {boolean} true si el usuario es propietario del recurso
 */
const checkResourceOwnership = async (userId, resourceType, resourceId) => {
  try {
    let query, params;
    
    switch (resourceType) {
      case 'facturas':
        // Para facturas, verificar si el usuario es el proveedor que la subió
        query = `
          SELECT i.*, s.id as supplier_id 
          FROM invoices i 
          LEFT JOIN suppliers s ON i.supplier_id = s.id 
          LEFT JOIN users u ON s.id = u.supplier_id 
          WHERE i.id = ? AND u.id = ?
        `;
        params = [resourceId, userId];
        break;
        
      case 'proveedores':
        // Para proveedores, verificar si el usuario pertenece a ese proveedor
        query = `
          SELECT s.* 
          FROM suppliers s 
          LEFT JOIN users u ON s.id = u.supplier_id 
          WHERE s.id = ? AND u.id = ?
        `;
        params = [resourceId, userId];
        break;
        
      case 'usuarios':
        // Para usuarios, solo puede ver su propio perfil
        return parseInt(resourceId) === parseInt(userId);
        
      default:
        return false;
    }
    
    const [results] = await db.execute(query, params);
    return results.length > 0;
  } catch (error) {
    console.error('Error checking resource ownership:', error);
    return false;
  }
};

/**
 * Middleware principal de verificación de permisos
 * Combina permisos de rol con permisos específicos del usuario
 * 
 * @param {string} module - Módulo del sistema (dashboard, facturas, documentos, etc.)
 * @param {string} action - Acción específica (ver, crear, editar, eliminar, etc.)
 * @returns {Function} Middleware de Express para validación de permisos
 */
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Super admin tiene todos los permisos automáticamente
      if (user.role === 'super_admin') {
        return next();
      }

      // Obtener permisos del usuario (de la sesión o BD)
      let userPermissions = user.permissions;
      
      // Si no tiene permisos personalizados, usar los por defecto del rol
      if (!userPermissions || Object.keys(userPermissions).length === 0) {
        userPermissions = getDefaultPermissions(user.role);
      }

      // Verificar si el módulo existe en los permisos del usuario
      if (!userPermissions[module]) {
        return res.status(403).json({ 
          error: 'Acceso denegado al módulo',
          details: `No tienes permisos para acceder al módulo: ${module}`
        });
      }

      const modulePermissions = userPermissions[module];

      // Para acciones que requieren verificar propiedad del recurso
      if (action === 'ver_propias' || action === 'editar' || action === 'eliminar') {
        const resourceId = req.params.id;
        
        // Si tiene permiso para "ver_todas", no necesita verificar propiedad
        if (action === 'ver_propias' && modulePermissions.ver_todas) {
          return next();
        }
        
        // Verificar si tiene el permiso específico para la acción
        if (!modulePermissions[action]) {
          return res.status(403).json({ 
            error: 'Permiso insuficiente',
            details: `No tienes permiso para: ${action} en ${module}`
          });
        }
        
        // Si hay un resourceId, verificar propiedad del recurso
        if (resourceId) {
          const isOwner = await checkResourceOwnership(user.id, module, resourceId);
          if (!isOwner && !modulePermissions.ver_todas) {
            return res.status(403).json({ 
              error: 'Solo puede acceder a sus propios recursos',
              details: `No tienes acceso al ${module.slice(0, -1)} con ID: ${resourceId}`
            });
          }
        }
        
        return next();
      }

      // Para otras acciones, verificar permiso directo
      if (!modulePermissions[action]) {
        return res.status(403).json({ 
          error: `Permiso denegado para acción: ${action}`,
          details: `Tu rol ${user.role} no permite: ${action} en ${module}`
        });
      }

      next();
    } catch (error) {
      console.error('Error en checkPermission:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

/**
 * Función utilitaria para obtener información de permisos
 * Útil para el frontend para mostrar/ocultar elementos según permisos
 * 
 * @param {string} role - Rol del usuario
 * @param {Object} customPermissions - Permisos personalizados del usuario (opcional)
 * @returns {Object} Objeto con estructura completa de permisos
 */
const getPermissionInfo = (role, customPermissions = null) => {
  const defaultPermissions = getDefaultPermissions(role);
  // Si hay permisos personalizados, mergearlos con los defaults
  return customPermissions ? { ...defaultPermissions, ...customPermissions } : defaultPermissions;
};

/**
 * Middleware para validar permisos de escritura en recursos
 * Usado para operaciones que modifican datos críticos
 * 
 * @param {string} module - Módulo del sistema
 * @returns {Function} Middleware que valida permisos de escritura
 */
const requireWritePermission = (module) => {
  return checkPermission(module, 'editar');
};

/**
 * Middleware para validar permisos administrativos
 * Usado para operaciones que requieren permisos elevados
 * 
 * @param {string} module - Módulo del sistema
 * @returns {Function} Middleware que valida permisos administrativos
 */
const requireAdminPermission = (module) => {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo super_admin y admin_contaduria tienen permisos administrativos
    if (user.role === 'super_admin' || user.role === 'admin_contaduria') {
      return next();
    }

    return res.status(403).json({ 
      error: 'Permisos administrativos requeridos',
      details: `La acción requiere permisos de administrador para ${module}`
    });
  };
};

module.exports = {
  checkPermission,
  getDefaultPermissions,
  getPermissionInfo,
  checkResourceOwnership,
  requireWritePermission,
  requireAdminPermission
};
