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

User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

User.beforeCreate(async (user) => {
    if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, parseInt(process.env.BCRYPT_ROUNDS || '12'));
    }
});

module.exports = User;
