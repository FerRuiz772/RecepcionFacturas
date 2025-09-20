const db = require('../utils/database');

// Permisos por defecto según rol
const getDefaultPermissions = (role) => {
  const defaults = {
    super_admin: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: true },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: true },
      proveedores: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: true, eliminar: true },
      usuarios: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: true, eliminar: true }
    },
    admin_contaduria: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      proveedores: { ver_todas: true, ver_propias: true, crear: true, editar: true, gestionar: false, eliminar: false },
      usuarios: { ver_todas: true, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false }
    },
    trabajador_contaduria: {
      dashboard: { ver: true },
      facturas: { ver_todas: true, ver_propias: true, crear: false, editar: true, eliminar: false },
      documentos: { ver_todas: true, ver_propias: true, crear: true, editar: true, eliminar: false },
      proveedores: { ver_todas: true, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false },
      usuarios: { ver_todas: false, ver_propias: true, crear: false, editar: false, gestionar: false, eliminar: false }
    },
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

// Verificar si el usuario es propietario del recurso
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

// Middleware principal de verificación de permisos
const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      // Super admin tiene todos los permisos
      if (user.role === 'super_admin') {
        return next();
      }

      // Obtener permisos del usuario
      let userPermissions = user.permissions;
      
      // Si no tiene permisos personalizados, usar los por defecto
      if (!userPermissions || Object.keys(userPermissions).length === 0) {
        userPermissions = getDefaultPermissions(user.role);
      }

      // Verificar si el módulo existe en los permisos
      if (!userPermissions[module]) {
        return res.status(403).json({ error: 'Acceso denegado al módulo' });
      }

      const modulePermissions = userPermissions[module];

      // Para acciones que requieren verificar propiedad
      if (action === 'ver_propias' || action === 'editar' || action === 'eliminar') {
        const resourceId = req.params.id;
        
        // Si tiene permiso para "ver_todas", no necesita verificar propiedad
        if (action === 'ver_propias' && modulePermissions.ver_todas) {
          return next();
        }
        
        // Verificar si tiene el permiso específico
        if (!modulePermissions[action]) {
          return res.status(403).json({ error: 'Permiso insuficiente' });
        }
        
        // Si hay un resourceId, verificar propiedad
        if (resourceId) {
          const isOwner = await checkResourceOwnership(user.id, module, resourceId);
          if (!isOwner && !modulePermissions.ver_todas) {
            return res.status(403).json({ error: 'Solo puede acceder a sus propios recursos' });
          }
        }
        
        return next();
      }

      // Para otras acciones, verificar permiso directo
      if (!modulePermissions[action]) {
        return res.status(403).json({ error: `Permiso denegado para acción: ${action}` });
      }

      next();
    } catch (error) {
      console.error('Error en checkPermission:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

// Función para obtener información de permisos (para frontend)
const getPermissionInfo = (role, customPermissions = null) => {
  const defaultPermissions = getDefaultPermissions(role);
  return customPermissions || defaultPermissions;
};

module.exports = {
  checkPermission,
  getDefaultPermissions,
  getPermissionInfo,
  checkResourceOwnership
};
