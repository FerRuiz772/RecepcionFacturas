/**
 * Controlador para gestión de proveedores del sistema PayQuetzal
 * Maneja CRUD de proveedores, creación de estructura de carpetas y validaciones
 * 
 * Funcionalidades principales:
 * - CRUD completo de proveedores con paginación
 * - Creación automática de estructura de carpetas por proveedor
 * - Filtros por estado activo/inactivo
 * - Permisos diferenciados por rol de usuario
 * - Validación de datos fiscales (NIT, dirección, etc.)
 * - Gestión de usuarios asociados a proveedores
 * 
 * Estructura de carpetas:
 * uploads/proveedores/[nombre_normalizado]/
 */

const { validationResult } = require('express-validator');
const models = require('../models');
const { Supplier, User, sequelize, Op } = models;
const path = require('path');
const fs = require('fs').promises;

/**
 * Crea estructura de carpetas para un proveedor específico
 * Normaliza el nombre del proveedor para uso seguro en sistema de archivos
 * 
 * @param {string} supplierName - Nombre comercial del proveedor
 * @returns {string} Ruta completa de la carpeta creada
 * @throws {Error} Si hay problemas en la creación de directorios
 */
const createSupplierFolder = async (supplierName) => {
    try {
        // Normalizar nombre del proveedor para carpeta
        const folderName = supplierName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
            .toLowerCase();

        // Crear estructura de carpetas jerárquica
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

/**
 * Controlador principal para gestión de proveedores
 * Contiene todas las operaciones CRUD y funciones especializadas
 */
const supplierController = {
    /**
     * Obtiene lista paginada de proveedores con filtros por rol
     * 
     * @route GET /api/suppliers
     * @param {Object} req.query - Parámetros de consulta
     * @param {number} req.query.page - Número de página (default: 1)
     * @param {number} req.query.limit - Elementos por página (default: 10)
     * @param {string} req.query.is_active - Filtrar por estado activo ('true'/'false')
     * @returns {Object} Lista paginada con permisos aplicados según rol del usuario
     */
    async getAllSuppliers(req, res) {
        try {
            const { page = 1, limit = 10, is_active, search } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (is_active !== undefined) where.is_active = is_active === 'true';

            // Debug: log incoming params to help trace search issues
            console.log('🔍 GET /api/suppliers - params:', { page, limit, is_active, search });

            // Búsqueda por nombre usando LIKE (MySQL collation utf8mb4_unicode_ci is case-insensitive)
            if (search && search.trim() !== '') {
                const raw = String(search).trim();
                where.business_name = { [Op.like]: `%${raw}%` };
                console.log('🔎 Applied search filter for suppliers (business_name LIKE):', raw);
            }

            // Filtrar por rol del usuario
            console.log('👤 Request user info:', { id: req.user?.userId, role: req.user?.role })
            if (req.user.role === 'proveedor') {
                // Los proveedores solo ven su propio registro
                const user = await User.findByPk(req.user.userId);
                if (user.supplier_id) {
                    where.id = user.supplier_id;
                } else {
                    // Si el proveedor no tiene supplier_id, no ve ningún proveedor
                    return res.json({
                        suppliers: [],
                        total: 0,
                        page: parseInt(page),
                        totalPages: 0
                    });
                }
            }
            // super_admin, admin_contaduria y trabajador_contaduria ven todos los proveedores
            // Log the final 'where' used for the query to help debugging
            console.log('🧭 Final suppliers where clause:', JSON.stringify(where))
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

            // Debug: log result count and a few business_name values to verify filtering
            try {
                const sampleNames = (suppliers.rows || []).slice(0, 5).map(s => s.business_name)
                console.log('📊 Suppliers query result - count:', suppliers.count, 'sample:', sampleNames)
            } catch (e) {
                console.log('⚠️ Error while logging supplier samples:', e.message)
            }

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

    /**
     * Obtiene un proveedor específico por ID con validación de permisos
     * Los proveedores solo pueden ver su propio registro
     * 
     * @route GET /api/suppliers/:id
     * @param {number} req.params.id - ID del proveedor a consultar
     * @returns {Object} Datos del proveedor incluyendo usuarios asociados
     */
    async getSupplierById(req, res) {
        try {
            const { id } = req.params;
            
            // Filtrar por rol del usuario - proveedores solo ven su propio registro
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (!user.supplier_id || user.supplier_id !== parseInt(id)) {
                    return res.status(403).json({ error: 'No tienes permisos para ver este proveedor' });
                }
            }
            
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

    /**
     * Crea un nuevo proveedor con validaciones de datos únicos
     * Incluye creación automática de estructura de carpetas
     * 
     * @route POST /api/suppliers
     * @param {Object} req.body - Datos del proveedor
     * @param {string} req.body.business_name - Nombre comercial (requerido)
     * @param {string} req.body.nit - Número de identificación tributaria (requerido, único)
     * @param {string} req.body.address - Dirección física (requerido)
     * @returns {Object} Proveedor creado con ID asignado
     */
    async createSupplier(req, res) {
        try {
            console.log('🔍 POST /api/suppliers - Body recibido:', req.body);
            
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ Errores de validación:', errors.array());
                return res.status(400).json({ errors: errors.array() });
            }

            const { business_name, nit, address, regimen_isr } = req.body;

            console.log('📋 Datos extraídos:', { business_name, nit, address, regimen_isr });

            // Verificar que el NIT no exista
            const existingSupplier = await Supplier.findOne({ where: { nit } });
            if (existingSupplier) {
                console.log('❌ NIT ya existe:', nit);
                return res.status(400).json({ error: 'El NIT ya está registrado' });
            }

            console.log('✅ Creando proveedor...');
            const supplier = await Supplier.create({
                business_name,
                nit,
                address,
                regimen_isr: regimen_isr || false
            });

            console.log('✅ Proveedor creado:', supplier.id);

            // Crear carpeta del proveedor
            try {
                await createSupplierFolder(business_name);
            } catch (error) {
                console.warn('Error creando carpeta de proveedor, pero el proveedor fue creado:', error);
            }

            res.status(201).json(supplier);
        } catch (error) {
            console.error('❌ Error en createSupplier:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Actualiza datos de un proveedor existente
     * Permite modificar información comercial y bancaria
     * 
     * @route PUT /api/suppliers/:id
     * @param {number} req.params.id - ID del proveedor a actualizar
     * @param {Object} req.body - Datos a actualizar
     * @param {string} req.body.business_name - Nombre comercial
     * @param {string} req.body.contact_phone - Teléfono de contacto
     * @param {string} req.body.address - Dirección física
     * @param {Object} req.body.bank_details - Información bancaria en JSON
     * @param {boolean} req.body.is_active - Estado activo/inactivo
     * @returns {Object} Proveedor actualizado
     */
    async updateSupplier(req, res) {
        try {
            const { id } = req.params;
            const { business_name, contact_phone, address, bank_details, regimen_isr, is_active } = req.body;

            console.log('📝 Actualizando proveedor:', { 
                id, 
                business_name, 
                regimen_isr, 
                regimen_isr_type: typeof regimen_isr,
                is_active 
            });

            const supplier = await Supplier.findByPk(id);
            if (!supplier) {
                return res.status(404).json({ error: 'Proveedor no encontrado' });
            }

            await supplier.update({
                business_name,
                contact_phone,
                address,
                bank_details,
                regimen_isr,
                is_active
            });

            console.log('✅ Proveedor actualizado:', { 
                id: supplier.id, 
                regimen_isr: supplier.regimen_isr 
            });

            res.json(supplier);
        } catch (error) {
            console.error('❌ Error actualizando proveedor:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    /**
     * Elimina (desactiva) un proveedor del sistema
     * Valida que no tenga facturas asociadas antes de permitir la eliminación
     * En lugar de eliminación física, realiza desactivación lógica
     * 
     * @route DELETE /api/suppliers/:id
     * @param {number} req.params.id - ID del proveedor a eliminar
     * @returns {Object} Mensaje de confirmación de desactivación
     */
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