const { validationResult } = require('express-validator');
const { Supplier, User } = require('../models');

const supplierController = {
    async getAllSuppliers(req, res) {
        try {
            const { page = 1, limit = 10, is_active } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (is_active !== undefined) where.is_active = is_active === 'true';

            const suppliers = await Supplier.findAndCountAll({
                where,
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'is_active'],
                    required: false
                }],
                order: [['business_name', 'ASC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                suppliers: suppliers.rows,
                total: suppliers.count,
                page: parseInt(page),
                totalPages: Math.ceil(suppliers.count / limit)
            });
        } catch (error) {
            console.error('Error al obtener proveedores:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getSupplierById(req, res) {
        try {
            const { id } = req.params;
            const supplier = await Supplier.findByPk(id, {
                include: [{
                    model: User,
                    attributes: ['id', 'name', 'email', 'is_active'],
                    required: false
                }]
            });

            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            res.json(supplier);
        } catch (error) {
            console.error('Error al obtener proveedor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async createSupplier(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Solo admins pueden crear proveedores
            if (!['super_admin', 'admin_contaduria'].includes(req.user.role)) {
                return res.status(403).json({ error: 'No tiene permisos para crear proveedores' });
            }

            const { business_name, nit, contact_email, contact_phone, address, bank_details } = req.body;

            // Verificar que el NIT no exista
            const existingSupplier = await Supplier.findOne({ where: { nit } });
            if (existingSupplier) {
                return res.status(400).json({ error: 'El NIT ya está registrado' });
            }

            const supplier = await Supplier.create({
                business_name,
                nit,
                contact_email,
                contact_phone,
                address,
                bank_details: bank_details || {}
            });

            res.status(201).json(supplier);
        } catch (error) {
            console.error('Error al crear proveedor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const { business_name, contact_email, contact_phone, address, bank_details, is_active } = req.body;

            // Solo admins pueden actualizar proveedores
            if (!['super_admin', 'admin_contaduria'].includes(req.user.role)) {
                return res.status(403).json({ error: 'No tiene permisos para actualizar proveedores' });
            }

            const supplier = await Supplier.findByPk(id);
            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            await supplier.update({
                business_name,
                contact_email,
                contact_phone,
                address,
                bank_details,
                is_active
            });

            res.json(supplier);
        } catch (error) {
            console.error('Error al actualizar proveedor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async deleteSupplier(req, res) {
        try {
            const { id } = req.params;

            // Solo super admin puede eliminar proveedores
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({ error: 'No tiene permisos para eliminar proveedores' });
            }

            const supplier = await Supplier.findByPk(id);
            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            // Verificar que no tenga facturas asociadas
            const { Invoice } = require('../models');
            const invoiceCount = await Invoice.count({ where: { supplier_id: id } });
            
            if (invoiceCount > 0) {
                return res.status(400).json({ 
                    error: 'No se puede eliminar el proveedor porque tiene facturas asociadas' 
                });
            }

            await supplier.update({ is_active: false });
            res.json({ message: 'Proveedor desactivado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar proveedor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = supplierController;