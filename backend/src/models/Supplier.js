const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Supplier = sequelize.define('Supplier', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    business_name: { type: DataTypes.STRING, allowNull: false },
    nit: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    contact_email: { type: DataTypes.STRING, validate: { isEmail: true } },
    contact_phone: { type: DataTypes.STRING(20) },
    address: { type: DataTypes.TEXT },
    bank_details: { type: DataTypes.JSON, defaultValue: {} },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'suppliers',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Supplier;
