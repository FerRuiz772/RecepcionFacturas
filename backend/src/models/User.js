const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

/**
 * Modelo de Usuario - Maneja autenticación, autorización y perfil de usuarios
 * Soporta múltiples roles: super_admin, admin_contaduria, trabajador_contaduria, proveedor
 * Incluye sistema de permisos granular y asociación con proveedores
 */
const User = sequelize.define('User', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    email: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        unique: true, 
        validate: { isEmail: true },
        comment: 'Email único del usuario, usado para login'
    },
    password_hash: { 
        type: DataTypes.STRING, 
        allowNull: false,
        comment: 'Hash bcrypt de la contraseña del usuario'
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        comment: 'Nombre completo del usuario'
    },
    role: {
        type: DataTypes.ENUM('super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'),
        allowNull: false,
        comment: 'Rol del usuario que determina permisos base'
    },
    supplier_id: { 
        type: DataTypes.INTEGER, 
        allowNull: true,
        comment: 'ID del proveedor asociado (solo para usuarios tipo proveedor)'
    },
    is_active: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true,
        comment: 'Indica si el usuario puede acceder al sistema'
    },
    profile_data: { 
        type: DataTypes.JSON, 
        defaultValue: {},
        comment: 'Datos adicionales del perfil (teléfono, departamento, etc.)'
    },
    permissions: { 
        type: DataTypes.JSON, 
        defaultValue: null,
        comment: 'Permisos personalizados que sobrescriben los del rol'
    },
    last_login: { 
        type: DataTypes.DATE,
        comment: 'Timestamp del último acceso exitoso'
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

/**
 * Valida la contraseña proporcionada contra el hash almacenado
 * @param {string} password - Contraseña en texto plano a validar
 * @returns {boolean} true si la contraseña es correcta
 */
User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

/**
 * Verifica si el usuario tiene un permiso específico
 * @param {string} permissionKey - Clave del permiso a verificar
 * @returns {boolean} true si el usuario tiene el permiso
 */
User.prototype.hasPermission = async function(permissionKey) {
    // Si no hay permisos cargados, cargarlos primero
    if (!this.userPermissions) {
        await this.loadPermissions();
    }
    
    // Buscar el permiso específico en la lista
    const permission = this.userPermissions?.find(p => p.permission_key === permissionKey);
    return permission ? permission.granted : false;
};

/**
 * Verifica múltiples permisos usando lógica AND (todos deben estar presentes)
 * @param {string[]} permissionKeys - Array de claves de permisos a verificar
 * @returns {boolean} true si el usuario tiene TODOS los permisos
 */
User.prototype.hasAllPermissions = async function(permissionKeys) {
    for (const permissionKey of permissionKeys) {
        if (!(await this.hasPermission(permissionKey))) {
            return false;
        }
    }
    return true;
};

// Método para verificar al menos uno de múltiples permisos (OR lógico)
User.prototype.hasAnyPermission = async function(permissionKeys) {
    for (const permissionKey of permissionKeys) {
        if (await this.hasPermission(permissionKey)) {
            return true;
        }
    }
    return false;
};

// Método para cargar permisos del usuario
User.prototype.loadPermissions = async function() {
    const UserPermission = require('./UserPermission');
    this.userPermissions = await UserPermission.findAll({
        where: { user_id: this.id },
        raw: true
    });
    return this.userPermissions;
};

// Método para obtener todos los permisos del usuario
User.prototype.getPermissions = async function() {
    const UserPermission = require('./UserPermission');
    const permissions = await UserPermission.findAll({
        where: { user_id: this.id, granted: true },
        attributes: ['permission_key'],
        raw: true
    });
    return permissions.map(p => p.permission_key);
};

// Método para verificar si es super admin (acceso total)
User.prototype.isSuperAdmin = function() {
    return this.role === 'super_admin';
};

// Hash de contraseña antes de crear
User.beforeCreate(async (user) => {
    if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    }
});

// Hash de contraseña antes de actualizar
User.beforeUpdate(async (user) => {
    if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    }
});

module.exports = User;
