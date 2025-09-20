const { validationResult } = require('express-validator');
const { Supplier, User } = require('../models');
const path = require('path');
const fs = require('fs').promises;

// Helper function para crear estructura de carpetas
const createSupplierFolder = async (supplierName) => {
    try {
        // Normalizar nombre del proveedor para carpeta
        const folderName = supplierName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
            .toLowerCase();

        // Crear estructura de carpetas
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const proveedoresDir = path.join(uploadsDir, 'proveedores');
        const supplierDir = path.join(proveedoresDir, folderName);

        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.mkdir(proveedoresDir, { recursive: true });
        await fs.mkdir(supplierDir, { recursive: true });

        console.log('📁 Carpeta de proveedor creada:', supplierDir);
        return supplierDir;
    } catch (error) {
        console.error('Error creando carpeta de proveedor:', error);
        throw error;
    }
};

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
                    as: 'users',
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
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getSupplierById(req, res) {
        try {
            const { id } = req.params;
            const supplier = await Supplier.findByPk(id, {
                include: [{
                    model: User,
                    as: 'users',
                    attributes: ['id', 'name', 'email', 'is_active'],
                    required: false
                }]
            });

            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            res.json(supplier);
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async createSupplier(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { business_name, nit, contact_phone, address, bank_details } = req.body;

            // Verificar que el NIT no exista
            const existingSupplier = await Supplier.findOne({ where: { nit } });
            if (existingSupplier) {
                return res.status(400).json({ error: 'El NIT ya está registrado' });
            }

            const supplier = await Supplier.create({
                business_name,
                nit,
                contact_phone,
                address,
                bank_details: bank_details || {}
            });

            // Crear carpeta del proveedor
            try {
                await createSupplierFolder(business_name);
            } catch (error) {
                console.warn('Error creando carpeta de proveedor, pero el proveedor fue creado:', error);
            }

            res.status(201).json(supplier);
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const { business_name, contact_phone, address, bank_details, is_active } = req.body;

            const supplier = await Supplier.findByPk(id);
            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            await supplier.update({
                business_name,
                contact_phone,
                address,
                bank_details,
                is_active
            });

            res.json(supplier);
        } catch (error) {
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async deleteSupplier(req, res) {
        try {
            const { id } = req.params;
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
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = supplierController;