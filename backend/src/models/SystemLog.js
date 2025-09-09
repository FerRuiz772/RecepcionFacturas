const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SystemLog = sequelize.define('SystemLog', {
  id: {
    type: DataTypes.STRING(36),
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(36),
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  entity_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  entity_id: {
    type: DataTypes.STRING(36),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  details: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'system_logs',
  timestamps: false
});

module.exports = SystemLog;