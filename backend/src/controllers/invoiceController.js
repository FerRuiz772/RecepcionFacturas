const { validationResult } = require('express-validator');
const { Invoice, Supplier, User, InvoiceState, Payment, sequelize } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const zlib = require('zlib');
const { Op } = require('sequelize');

// Configuración de multer para upload de archivos
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads', req.params.id || 'temp');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF e imágenes'));
        }
    }
});

// Validación de transiciones de estado
const VALID_STATE_TRANSITIONS = {
    'factura_subida': ['asignada_contaduria', 'rechazada'],
    'asignada_contaduria': ['en_proceso', 'rechazada'],
    'en_proceso': ['contrasena_generada', 'rechazada'],
    'contrasena_generada': ['retencion_isr_generada', 'rechazada'],
    'retencion_isr_generada': ['retencion_iva_generada', 'rechazada'],
    'retencion_iva_generada': ['pago_realizado', 'rechazada'],
    'pago_realizado': ['proceso_completado', 'rechazada'],
    'proceso_completado': [],
    'rechazada': ['factura_subida']
};

const invoiceController = {
    // Middleware para upload
    uploadMiddleware: upload.array('files', 5),

    async getAllInvoices(req, res) {
        try {
            const { status, supplier_id, assigned_to, page = 1, limit = 10, search } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (status) where.status = status;
            if (supplier_id) where.supplier_id = parseInt(supplier_id);
            if (assigned_to) where.assigned_to = parseInt(assigned_to);

            // Búsqueda por número de factura o descripción
            if (search) {
                where[Op.or] = [
                    { number: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filtrar por rol del usuario
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                where.supplier_id = user.supplier_id;
            } else if (req.user.role === 'trabajador_contaduria') {
                where.assigned_to = req.user.userId;
            }

            const invoices = await Invoice.findAndCountAll({
                where,
                include: [
                    {
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['id', 'business_name', 'nit']
                    },
                    {
                        model: User,
                        as: 'assignedUser',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json({
                invoices: invoices.rows,
                total: invoices.count,
                page: parseInt(page),
                totalPages: Math.ceil(invoices.count / limit),
                hasNext: offset + parseInt(limit) < invoices.count,
                hasPrev: parseInt(page) > 1
            });
        } catch (error) {
            console.error('Error al obtener facturas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getInvoiceById(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(parseInt(id), {
                include: [
                    {
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['id', 'business_name', 'nit', 'contact_email', 'contact_phone']
                    },
                    {
                        model: User,
                        as: 'assignedUser',
                        attributes: ['id', 'name', 'email'],
                        required: false
                    },
                    {
                        model: InvoiceState,
                        as: 'states',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'name']
                        }],
                        order: [['timestamp', 'DESC']]
                    },
                    {
                        model: Payment,
                        as: 'payment',
                        required: false
                    }
                ]
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
                }
            } else if (req.user.role === 'trabajador_contaduria') {
                if (invoice.assigned_to !== req.user.userId) {
                    return res.status(403).json({ error: 'Solo puede ver facturas asignadas a usted' });
                }
            }

            res.json(invoice);
        } catch (error) {
            console.error('Error al obtener factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async createInvoice(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                await transaction.rollback();
                return res.status(400).json({ errors: errors.array() });
            }

            const { number, amount, description, due_date, priority = 'media' } = req.body;

            if (req.user.role !== 'proveedor') {
                await transaction.rollback();
                return res.status(403).json({ error: 'Solo proveedores pueden crear facturas' });
            }

            const user = await User.findByPk(req.user.userId, { transaction });
            if (!user.supplier_id) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Usuario proveedor no tiene empresa asignada' });
            }

            // Verificar que el número de factura no exista
            const existingInvoice = await Invoice.findOne({ 
                where: { number },
                transaction 
            });
            if (existingInvoice) {
                await transaction.rollback();
                return res.status(400).json({ error: 'El número de factura ya existe' });
            }

            // Validar monto
            if (parseFloat(amount) <= 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
            }

            // Procesar archivos subidos
            const uploadedFiles = [];
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const compressedFile = await this.compressFile(file);
                    uploadedFiles.push({
                        originalName: file.originalname,
                        filename: compressedFile.filename,
                        path: compressedFile.path,
                        size: compressedFile.size,
                        mimetype: file.mimetype,
                        uploadedAt: new Date()
                    });
                }
            }

            // Crear factura
            const invoice = await Invoice.create({
                number,
                supplier_id: user.supplier_id,
                amount: parseFloat(amount),
                description,
                due_date,
                priority,
                uploaded_files: uploadedFiles,
                status: 'factura_subida',
                processing_data: {
                    created_by: req.user.userId,
                    created_at: new Date(),
                    ip_address: req.ip
                }
            }, { transaction });

            // Crear registro de estado inicial
            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: null,
                to_state: 'factura_subida',
                user_id: req.user.userId,
                notes: 'Factura creada por proveedor'
            }, { transaction });

            // Auto-asignar a contaduría
            const assignedUserId = await this.autoAssignInvoice();
            if (assignedUserId) {
                await invoice.update({
                    assigned_to: assignedUserId,
                    status: 'asignada_contaduria'
                }, { transaction });

                await InvoiceState.create({
                    invoice_id: invoice.id,
                    from_state: 'factura_subida',
                    to_state: 'asignada_contaduria',
                    user_id: assignedUserId,
                    notes: 'Auto-asignación por sistema'
                }, { transaction });
            }

            await transaction.commit();

            // Obtener factura completa para respuesta
            const createdInvoice = await Invoice.findByPk(invoice.id, {
                include: [
                    { model: Supplier, attributes: ['id', 'business_name', 'nit'] },
                    { model: User, as: 'assignedUser', attributes: ['id', 'name'], required: false }
                ]
            });

            res.status(201).json({
                message: 'Factura creada exitosamente',
                invoice: createdInvoice
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al crear factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateInvoice(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { amount, description, due_date, priority } = req.body;

            const invoice = await Invoice.findByPk(parseInt(id), { transaction });
            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    await transaction.rollback();
                    return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
                }
                
                // Solo permitir editar si está en estado inicial
                if (invoice.status !== 'factura_subida') {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'No puede editar facturas en proceso' });
                }
            }

            // Preparar datos de actualización
            const updateData = {};
            if (amount !== undefined) updateData.amount = parseFloat(amount);
            if (description !== undefined) updateData.description = description;
            if (due_date !== undefined) updateData.due_date = due_date;
            if (priority !== undefined) updateData.priority = priority;

            await invoice.update(updateData, { transaction });

            // Registrar cambio si es significativo
            if (Object.keys(updateData).length > 0) {
                await InvoiceState.create({
                    invoice_id: invoice.id,
                    from_state: invoice.status,
                    to_state: invoice.status,
                    user_id: req.user.userId,
                    notes: `Factura actualizada: ${Object.keys(updateData).join(', ')}`
                }, { transaction });
            }

            await transaction.commit();
            res.json({
                message: 'Factura actualizada exitosamente',
                invoice
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateInvoiceStatus(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const invoice = await Invoice.findByPk(parseInt(id), { transaction });
            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo personal de contaduría puede cambiar estados
            if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
            }

            // Validar que trabajador solo cambie sus facturas asignadas
            if (req.user.role === 'trabajador_contaduria' && invoice.assigned_to !== req.user.userId) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Solo puede cambiar estado de facturas asignadas a usted' });
            }

            // Validar transición de estado
            const currentStatus = invoice.status;
            const validNextStates = VALID_STATE_TRANSITIONS[currentStatus] || [];
            
            if (!validNextStates.includes(status)) {
                await transaction.rollback();
                return res.status(400).json({ 
                    error: `Transición inválida de '${currentStatus}' a '${status}'`,
                    validStates: validNextStates,
                    currentStatus
                });
            }

            await invoice.update({ status }, { transaction });

            // Crear registro de cambio de estado
            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: currentStatus,
                to_state: status,
                user_id: req.user.userId,
                notes: notes || `Estado cambiado a ${status}`
            }, { transaction });

            await transaction.commit();
            
            res.json({
                message: 'Estado actualizado exitosamente',
                invoice,
                previousStatus: currentStatus,
                newStatus: status
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al actualizar estado:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async generatePassword(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(parseInt(id), { transaction });

            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo contaduría puede generar contraseñas
            if (!['admin_contaduria', 'trabajador_contaduria'].includes(req.user.role)) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
            }

            // Validar que trabajador solo genere para sus facturas
            if (req.user.role === 'trabajador_contaduria' && invoice.assigned_to !== req.user.userId) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Solo puede generar contraseñas para facturas asignadas a usted' });
            }

            if (invoice.status !== 'en_proceso') {
                await transaction.rollback();
                return res.status(400).json({ 
                    error: 'La factura debe estar en proceso para generar contraseña',
                    currentStatus: invoice.status 
                });
            }

            // Generar contraseña única
            const password = crypto.randomBytes(4).toString('hex').toUpperCase();

            // Crear o actualizar registro de pago
            let payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                transaction 
            });

            if (payment) {
                await payment.update({ password_generated: password }, { transaction });
            } else {
                payment = await Payment.create({
                    invoice_id: parseInt(id),
                    password_generated: password
                }, { transaction });
            }

            // Actualizar estado de la factura
            await invoice.update({ status: 'contrasena_generada' }, { transaction });

            // Registrar cambio de estado
            await InvoiceState.create({
                invoice_id: parseInt(id),
                from_state: 'en_proceso',
                to_state: 'contrasena_generada',
                user_id: req.user.userId,
                notes: `Contraseña generada: ${password}`
            }, { transaction });

            await transaction.commit();
            
            res.json({ 
                message: 'Contraseña generada exitosamente', 
                password,
                invoiceId: parseInt(id),
                newStatus: 'contrasena_generada'
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al generar contraseña:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async uploadDocument(req, res, next) {
        try {
            const { invoice } = req;
            const { type } = req.body;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    error: 'No se ha proporcionado ningún archivo',
                    code: 'NO_FILE_PROVIDED'
                });
            }

            const validTypes = ['retention_isr', 'retention_iva', 'payment_proof'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: 'Tipo de documento no válido',
                    code: 'INVALID_DOCUMENT_TYPE'
                });
            }

            // Crear directorio de uploads si no existe
            const uploadsDir = path.join(__dirname, '..', 'uploads');
            await fs.promises.mkdir(uploadsDir, { recursive: true });

            const originalName = file.originalname;
            const extension = path.extname(originalName);
            const newFileName = `${invoice.id}-${type}${extension}`;
            const uploadPath = path.join(uploadsDir, newFileName);

            // Si el archivo existe, lo eliminamos primero
            try {
                await fs.promises.unlink(uploadPath);
            } catch (err) {
                // Ignoramos el error si el archivo no existe
            }

            await fs.promises.rename(file.path, uploadPath);

            // Actualizar la factura con la nueva información del documento
            const updateData = {
                [`${type}_path`]: newFileName,
                [`${type}_date`]: new Date()
            };

            await invoice.update(updateData);

            // Registrar la acción en el log del sistema
            const SystemLog = require('../models/SystemLog');
            await SystemLog.create({
                action: 'DOCUMENT_UPLOAD',
                userId: req.user.id,
                details: JSON.stringify({
                    invoiceId: invoice.id,
                    documentType: type,
                    fileName: newFileName
                })
            });

            res.json({
                message: 'Documento subido correctamente',
                invoice
            });

        } catch (error) {
            // Si hay un error, intentamos limpiar el archivo temporal
            if (req.file && req.file.path) {
                try {
                    await fs.promises.unlink(req.file.path);
                } catch (err) {
                    // Ignoramos errores al limpiar
                }
            }
            next(error);
        }
    },

    async downloadInvoiceFiles(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(parseInt(id));

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
                }
            }

            if (!invoice.uploaded_files || invoice.uploaded_files.length === 0) {
                return res.status(404).json({ error: 'No hay archivos disponibles' });
            }

            if (invoice.uploaded_files.length === 1) {
                const file = invoice.uploaded_files[0];
                const filePath = path.join(__dirname, '../uploads', id.toString(), file.filename);
                
                try {
                    await fs.access(filePath);
                    res.download(filePath, file.originalName);
                } catch (error) {
                    res.status(404).json({ error: 'Archivo no encontrado' });
                }
            } else {
                const zipPath = await this.createZipFromFiles(invoice.uploaded_files, id);
                res.download(zipPath, `factura-${invoice.number}.zip`);
            }
        } catch (error) {
            console.error('Error al descargar facturas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadRetentionISR(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.isr_retention_file) {
                return res.status(404).json({ error: 'Retención ISR no disponible' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            try {
                await fs.access(payment.isr_retention_file);
                const filename = `retencion-isr-${payment.Invoice.number}.pdf`;
                res.download(payment.isr_retention_file, filename);
            } catch (error) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
        } catch (error) {
            console.error('Error al descargar ISR:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadRetentionIVA(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.iva_retention_file) {
                return res.status(404).json({ error: 'Retención IVA no disponible' });
            }

            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            try {
                await fs.access(payment.iva_retention_file);
                const filename = `retencion-iva-${payment.Invoice.number}.pdf`;
                res.download(payment.iva_retention_file, filename);
            } catch (error) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
        } catch (error) {
            console.error('Error al descargar IVA:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadPaymentProof(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.payment_proof_file) {
                return res.status(404).json({ error: 'Comprobante de pago no disponible' });
            }

            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            try {
                await fs.access(payment.payment_proof_file);
                const filename = `comprobante-pago-${payment.Invoice.number}.pdf`;
                res.download(payment.payment_proof_file, filename);
            } catch (error) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
        } catch (error) {
            console.error('Error al descargar comprobante:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async deleteInvoice(req, res) {
        const transaction = await sequelize.transaction();
        
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(parseInt(id), { transaction });

            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo super admin puede eliminar
            if (req.user.role !== 'super_admin') {
                await transaction.rollback();
                return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
            }

            // Eliminar archivos físicos
            if (invoice.uploaded_files && invoice.uploaded_files.length > 0) {
                for (const file of invoice.uploaded_files) {
                    try {
                        if (file.path && await fs.access(file.path).then(() => true).catch(() => false)) {
                            await fs.unlink(file.path);
                        }
                    } catch (error) {
                        console.warn(`No se pudo eliminar archivo: ${file.path}`);
                    }
                }
            }

            // Eliminar archivos de pagos asociados
            const payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                transaction 
            });
            
            if (payment) {
                const fileFields = ['isr_retention_file', 'iva_retention_file', 'payment_proof_file'];
                for (const field of fileFields) {
                    if (payment[field]) {
                        try {
                            await fs.unlink(payment[field]);
                        } catch (error) {
                            console.warn(`No se pudo eliminar archivo: ${payment[field]}`);
                        }
                    }
                }
            }

            await invoice.destroy({ transaction });
            await transaction.commit();
            
            res.json({ 
                message: 'Factura eliminada exitosamente',
                deletedInvoiceId: parseInt(id)
            });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al eliminar factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    
    // ================== RUTAS DE DASHBOARD ==================
    
    async getAvailableDocuments(req, res) {
        try {
            if (req.user.role !== 'proveedor') {
                return res.status(403).json({ error: 'Solo proveedores pueden acceder' });
            }
    
            const user = await User.findByPk(req.user.userId);
            if (!user.supplier_id) {
                return res.json({ documents: [], total: 0 });
            }
    
            const invoices = await Invoice.findAll({
                where: { 
                    supplier_id: user.supplier_id,
                    status: {
                        [Op.in]: [
                            'retencion_isr_generada', 
                            'retencion_iva_generada', 
                            'proceso_completado'
                        ]
                    }
                },
                include: [{ model: Payment, as: 'payment', required: false }],
                order: [['updated_at', 'DESC']]
            });
    
            const documents = [];
            
            invoices.forEach(invoice => {
                if (invoice.payment) {
                    if (invoice.payment.isr_retention_file) {
                        documents.push({
                            id: `isr-${invoice.id}`,
                            type: 'retention_isr',
                            title: 'Retención ISR',
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.number,
                            amount: parseFloat(invoice.amount),
                            date: invoice.payment.created_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-retention-isr`,
                            status: invoice.status
                        });
                    }
    
                    if (invoice.payment.iva_retention_file) {
                        documents.push({
                            id: `iva-${invoice.id}`,
                            type: 'retention_iva',
                            title: 'Retención IVA',
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.number,
                            amount: parseFloat(invoice.amount),
                            date: invoice.payment.created_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-retention-iva`,
                            status: invoice.status
                        });
                    }
    
                    if (invoice.payment.payment_proof_file && invoice.status === 'proceso_completado') {
                        documents.push({
                            id: `proof-${invoice.id}`,
                            type: 'payment_proof',
                            title: 'Comprobante de Pago',
                            invoiceId: invoice.id,
                            invoiceNumber: invoice.number,
                            amount: parseFloat(invoice.amount),
                            date: invoice.payment.completion_date || invoice.payment.updated_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-payment-proof`,
                            status: invoice.status
                        });
                    }
                }
            });
    
            res.json({ 
                documents,
                total: documents.length,
                summary: {
                    isr_count: documents.filter(d => d.type === 'retention_isr').length,
                    iva_count: documents.filter(d => d.type === 'retention_iva').length,
                    proof_count: documents.filter(d => d.type === 'payment_proof').length
                }
            });
        } catch (error) {
            console.error('Error getting available documents:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    
    async getWorkQueue(req, res) {
        try {
            if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Solo contaduría puede acceder' });
            }
    
            const workQueue = [];
            const whereClause = req.user.role === 'trabajador_contaduria' 
                ? { assigned_to: req.user.userId }
                : {};
    
            // Facturas que necesitan generar contraseña
            const needPassword = await Invoice.findAll({
                where: { 
                    ...whereClause,
                    status: 'en_proceso' 
                },
                include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }],
                limit: 10,
                order: [['created_at', 'ASC']]
            });
    
            needPassword.forEach(invoice => {
                workQueue.push({
                    id: `password-${invoice.id}`,
                    invoiceId: invoice.id,
                    action: 'Generar Contraseña',
                    supplier: invoice.supplier.business_name,
                    invoiceNumber: invoice.number,
                    amount: parseFloat(invoice.amount),
                    priority: 'Alta',
                    timeAgo: this.getTimeAgo(invoice.created_at),
                    actionUrl: `/api/invoices/${invoice.id}/generate-password`,
                    status: invoice.status
                });
            });
    
            // Facturas que necesitan retención ISR
            const needISR = await Invoice.findAll({
                where: { 
                    ...whereClause,
                    status: 'contrasena_generada' 
                },
                include: [{ model: Supplier, attributes: ['business_name'] }],
                limit: 10,
                order: [['updated_at', 'ASC']]
            });
    
            needISR.forEach(invoice => {
                workQueue.push({
                    id: `isr-${invoice.id}`,
                    invoiceId: invoice.id,
                    action: 'Subir Retención ISR',
                    supplier: invoice.supplier.business_name,
                    invoiceNumber: invoice.number,
                    amount: parseFloat(invoice.amount),
                    priority: 'Media',
                    timeAgo: this.getTimeAgo(invoice.updated_at),
                    actionUrl: `/api/invoices/${invoice.id}/upload-document`,
                    status: invoice.status
                });
            });
    
            // Facturas que necesitan retención IVA
            const needIVA = await Invoice.findAll({
                where: { 
                    ...whereClause,
                    status: 'retencion_isr_generada' 
                },
                include: [{ model: Supplier, attributes: ['business_name'] }],
                limit: 5,
                order: [['updated_at', 'ASC']]
            });
    
            needIVA.forEach(invoice => {
                workQueue.push({
                    id: `iva-${invoice.id}`,
                    invoiceId: invoice.id,
                    action: 'Subir Retención IVA',
                    supplier: invoice.supplier.business_name,
                    invoiceNumber: invoice.number,
                    amount: parseFloat(invoice.amount),
                    priority: 'Media',
                    timeAgo: this.getTimeAgo(invoice.updated_at),
                    actionUrl: `/api/invoices/${invoice.id}/upload-document`,
                    status: invoice.status
                });
            });
    
            // Ordenar por prioridad
            const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
            workQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
    
            res.json({ 
                tasks: workQueue.slice(0, 15),
                summary: {
                    total_pending: workQueue.length,
                    high_priority: workQueue.filter(t => t.priority === 'Alta').length,
                    by_action: workQueue.reduce((acc, task) => {
                        acc[task.action] = (acc[task.action] || 0) + 1;
                        return acc;
                    }, {})
                }
            });
        } catch (error) {
            console.error('Error getting work queue:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    
    // ================== MÉTODOS AUXILIARES ==================
    
    async compressFile(file) {
        try {
            const inputPath = file.path;
            const outputPath = inputPath.replace(path.extname(inputPath), '_compressed' + path.extname(inputPath));
    
            if (file.mimetype === 'application/pdf') {
                const input = await fs.readFile(inputPath);
                const compressed = zlib.gzipSync(input);
                await fs.writeFile(outputPath + '.gz', compressed);
                await fs.unlink(inputPath);
                
                return {
                    filename: path.basename(outputPath + '.gz'),
                    path: outputPath + '.gz',
                    size: compressed.length
                };
            } else if (file.mimetype.startsWith('image/')) {
                await sharp(inputPath)
                    .resize(1920, 1920, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 85 })
                    .toFile(outputPath);
                
                await fs.unlink(inputPath);
                const stats = await fs.stat(outputPath);
                return {
                    filename: path.basename(outputPath),
                    path: outputPath,
                    size: stats.size
                };
            }
    
            const stats = await fs.stat(inputPath);
            return {
                filename: path.basename(inputPath),
                path: inputPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Error al comprimir archivo:', error);
            const stats = await fs.stat(file.path);
            return {
                filename: path.basename(file.path),
                path: file.path,
                size: stats.size
            };
        }
    },
    
    async autoAssignInvoice() {
        try {
            const workers = await User.findAll({
                where: { 
                    role: 'trabajador_contaduria',
                    is_active: true 
                }
            });
    
            if (workers.length === 0) {
                const admin = await User.findOne({
                    where: { 
                        role: 'admin_contaduria',
                        is_active: true 
                    }
                });
                return admin ? admin.id : null;
            }
    
            const workersWithCount = await Promise.all(
                workers.map(async (worker) => {
                    const count = await Invoice.count({
                        where: { 
                            assigned_to: worker.id,
                            status: {
                                [Op.notIn]: ['proceso_completado', 'rechazada']
                            }
                        }
                    });
                    return { worker, count };
                })
            );
    
            const selectedWorker = workersWithCount.reduce((min, current) => 
                current.count < min.count ? current : min
            ).worker;
    
            return selectedWorker.id;
        } catch (error) {
            console.error('Error en auto-asignación:', error);
            return null;
        }
    },
    
    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
    
        if (diffDays > 0) return `${diffDays}d`;
        if (diffHours > 0) return `${diffHours}h`;
        if (diffMinutes > 0) return `${diffMinutes}m`;
        return 'Ahora';
    }, async getPendingInvoices(req, res) {
        try {
            if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Solo contaduría puede acceder' });
            }
    
            let whereClause = {
                status: {
                    [Op.notIn]: ['proceso_completado', 'rechazada']
                }
            };
    
            // Si es trabajador, solo sus facturas asignadas
            if (req.user.role === 'trabajador_contaduria') {
                whereClause.assigned_to = req.user.userId;
            }
    
            const invoices = await Invoice.findAll({
                where: whereClause,
                include: [
                    { 
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['business_name', 'nit'] 
                    },
                    {
                        model: User,
                        as: 'assignedUser',
                        attributes: ['name'],
                        required: false
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: 50
            });
    
            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                number: invoice.number,
                supplier: invoice.supplier.business_name,
                supplier_nit: invoice.supplier.nit,
                amount: parseFloat(invoice.amount),
                status: invoice.status,
                priority: invoice.priority,
                assigned_to: invoice.assignedUser ? invoice.assignedUser.name : 'Sin asignar',
                created_at: invoice.created_at,
                due_date: invoice.due_date,
                timeAgo: this.getTimeAgo(invoice.created_at),
                detailUrl: `/api/invoices/${invoice.id}`,
                canEdit: invoice.status === 'factura_subida'
            }));
    
            // Calcular estadísticas
            const statusCounts = invoices.reduce((acc, invoice) => {
                acc[invoice.status] = (acc[invoice.status] || 0) + 1;
                return acc;
            }, {});
    
            const priorityCounts = invoices.reduce((acc, invoice) => {
                acc[invoice.priority] = (acc[invoice.priority] || 0) + 1;
                return acc;
            }, {});
    
            res.json({ 
                invoices: formattedInvoices,
                summary: {
                    total: formattedInvoices.length,
                    by_status: statusCounts,
                    by_priority: priorityCounts,
                    total_amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
                    user_role: req.user.role
                }
            });
        } catch (error) {
            console.error('Error getting pending invoices:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
    
    };
    
    module.exports = invoiceController;