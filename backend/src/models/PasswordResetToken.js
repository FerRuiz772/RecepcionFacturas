/**
 * Modelo PasswordResetToken - Tokens para recuperación de contraseñas
 * 
 * Gestiona tokens seguros de un solo uso para resetear contraseñas olvidadas
 * Implementa expiración automática y seguimiento de uso para seguridad
 * 
 * Características de seguridad:
 * - Tokens únicos generados criptográficamente
 * - Expiración temporal configurable (típicamente 1 hora)
 * - Seguimiento de uso para prevenir reutilización
 * - Índices para consultas eficientes
 * 
 * Flujo de uso:
 * 1. Usuario solicita reset → se crea token con expires_at
 * 2. Token se envía por email
 * 3. Usuario usa token → se marca used_at
 * 4. Tokens expirados se limpian automáticamente
 * 
 * Relaciones:
 * - Pertenece a User (user_id) - usuario que solicita el reset
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Token único generado criptográficamente para resetear contraseña'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'ID del usuario que solicita el reset de contraseña'
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha y hora de expiración del token (típicamente 1 hora después de creación)'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora cuando se usó el token (null = no usado aún)'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'password_reset_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    comment: 'Tokens de seguridad para recuperación de contraseñas olvidadas',
    indexes: [
      {
        fields: ['token'], // Índice único para búsquedas rápidas por token
        comment: 'Índice para búsqueda eficiente de tokens'
      },
      {
        fields: ['user_id'], // Índice para consultar tokens por usuario
        comment: 'Índice para consultar tokens de un usuario específico'
      },
      {
        fields: ['expires_at'], // Índice para limpeza de tokens expirados
        comment: 'Índice para limpieza eficiente de tokens expirados'
      }
    ]
  });

  /**
   * Define las asociaciones del modelo PasswordResetToken
   * @param {Object} models - Todos los modelos disponibles para asociaciones
   */
  PasswordResetToken.associate = (models) => {
    // Un token pertenece a un usuario específico
    PasswordResetToken.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return PasswordResetToken;
};