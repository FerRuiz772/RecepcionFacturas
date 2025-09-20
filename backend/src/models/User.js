const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'),
        allowNull: false
    },
    supplier_id: { type: DataTypes.INTEGER, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    profile_data: { type: DataTypes.JSON, defaultValue: {} },
    permissions: { type: DataTypes.JSON, defaultValue: null },
    last_login: { type: DataTypes.DATE }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
});

// Método para validar contraseña
User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

// Método para verificar si el usuario tiene un permiso específico
User.prototype.hasPermission = async function(permissionKey) {
    // Si no hay permisos cargados, cargarlos primero
    if (!this.userPermissions) {
        await this.loadPermissions();
    }
    
    // Buscar el permiso específico
    const permission = this.userPermissions?.find(p => p.permission_key === permissionKey);
    return permission ? permission.granted : false;
};

// Método para verificar múltiples permisos (AND lógico)
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
