const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPermission = sequelize.define('UserPermission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'ID del usuario propietario del permiso'
  },
  permission_key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Clave del permiso (ej: facturas.ver, usuarios.crear)'
  },
  granted: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Si el permiso está concedido o revocado'
  }
}, {
  tableName: 'user_permissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'permission_key'],
      name: 'unique_user_permission'
    },
    {
      fields: ['user_id'],
      name: 'idx_user_permissions_user_id'
    },
    {
      fields: ['permission_key'],
      name: 'idx_user_permissions_permission_key'
    }
  ],
  comment: 'Tabla de permisos granulares por usuario'
});

module.exports = UserPermission;