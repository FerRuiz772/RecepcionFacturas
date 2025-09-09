const { validationResult } = require('express-validator');
const { Invoice, Supplier, User, InvoiceState, Payment } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const zlib = require('zlib');

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

const invoiceController = {
    // Middleware para upload
    uploadMiddleware: upload.array('files', 5),

    async getAllInvoices(req, res) {
        try {
            const { status, supplier_id, assigned_to, page = 1, limit = 10 } = req.query;
            const offset = (page - 1) * limit;

            const where = {};
            if (status) where.status = status;
            if (supplier_id) where.supplier_id = supplier_id;
            if (assigned_to) where.assigned_to = assigned_to;

            // Filtrar por rol del usuario
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                where.supplier_id = user.supplier_id;
            }

            const invoices = await Invoice.findAndCountAll({
                where,
                include: [
                    {
                        model: Supplier,
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
                totalPages: Math.ceil(invoices.count / limit)
            });
        } catch (error) {
            console.error('Error al obtener facturas:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getInvoiceById(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(id, {
                include: [
                    {
                        model: Supplier,
                        attributes: ['id', 'business_name', 'nit', 'contact_email']
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
                    return res.status(403).json({ error: 'No tiene permisos para ver esta factura' });
                }
            }

            res.json(invoice);
        } catch (error) {
            console.error('Error al obtener factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async createInvoice(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { number, amount, description, due_date } = req.body;

            // Solo proveedores pueden crear facturas
            if (req.user.role !== 'proveedor') {
                return res.status(403).json({ error: 'Solo proveedores pueden crear facturas' });
            }

            const user = await User.findByPk(req.user.userId);
            if (!user.supplier_id) {
                return res.status(400).json({ error: 'Usuario proveedor no tiene empresa asignada' });
            }

            // Verificar que el número de factura no exista
            const existingInvoice = await Invoice.findOne({ where: { number } });
            if (existingInvoice) {
                return res.status(400).json({ error: 'El número de factura ya existe' });
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
                        mimetype: file.mimetype
                    });
                }
            }

            const invoice = await Invoice.create({
                number,
                supplier_id: user.supplier_id,
                amount,
                description,
                due_date,
                uploaded_files: uploadedFiles,
                status: 'factura_subida'
            });

            // Crear registro de estado inicial
            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: null,
                to_state: 'factura_subida',
                user_id: req.user.userId,
                notes: 'Factura creada por proveedor'
            });

            // Auto-asignar a contaduría
            await this.autoAssignInvoice(invoice.id);

            const createdInvoice = await Invoice.findByPk(invoice.id, {
                include: [
                    {
                        model: Supplier,
                        attributes: ['id', 'business_name', 'nit']
                    }
                ]
            });

            res.status(201).json(createdInvoice);
        } catch (error) {
            console.error('Error al crear factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateInvoice(req, res) {
        try {
            const { id } = req.params;
            const { amount, description, due_date } = req.body;

            const invoice = await Invoice.findByPk(id);
            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para editar esta factura' });
                }
                
                // Solo permitir editar si está en estado inicial
                if (invoice.status !== 'factura_subida') {
                    return res.status(400).json({ error: 'No puede editar facturas en proceso' });
                }
            }

            await invoice.update({
                amount,
                description,
                due_date
            });

            res.json(invoice);
        } catch (error) {
            console.error('Error al actualizar factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateInvoiceStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;

            const invoice = await Invoice.findByPk(id);
            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo personal de contaduría puede cambiar estados
            if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
                return res.status(403).json({ error: 'No tiene permisos para cambiar el estado' });
            }

            const previousStatus = invoice.status;
            await invoice.update({ status });

            // Crear registro de cambio de estado
            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: previousStatus,
                to_state: status,
                user_id: req.user.userId,
                notes
            });

            res.json(invoice);
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async generatePassword(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(id);

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo contaduría puede generar contraseñas
            if (!['admin_contaduria', 'trabajador_contaduria'].includes(req.user.role)) {
                return res.status(403).json({ error: 'No tiene permisos para generar contraseñas' });
            }

            if (invoice.status !== 'en_proceso') {
                return res.status(400).json({ error: 'La factura debe estar en proceso para generar contraseña' });
            }

            // Generar contraseña única
            const password = crypto.randomBytes(4).toString('hex').toUpperCase();

            // Crear o actualizar registro de pago
            let payment = await Payment.findOne({ where: { invoice_id: id } });
            if (payment) {
                await payment.update({ password_generated: password });
            } else {
                payment = await Payment.create({
                    invoice_id: id,
                    password_generated: password
                });
            }

            // Actualizar estado de la factura
            await invoice.update({ status: 'contrasena_generada' });

            // Registrar cambio de estado
            await InvoiceState.create({
                invoice_id: id,
                from_state: 'en_proceso',
                to_state: 'contrasena_generada',
                user_id: req.user.userId,
                notes: `Contraseña generada: ${password}`
            });

            res.json({ message: 'Contraseña generada exitosamente', password });
        } catch (error) {
            console.error('Error al generar contraseña:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async uploadDocument(req, res) {
        try {
            const { id } = req.params;
            const { type } = req.body;

            const invoice = await Invoice.findByPk(id);
            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo contaduría puede subir documentos
            if (!['admin_contaduria', 'trabajador_contaduria'].includes(req.user.role)) {
                return res.status(403).json({ error: 'No tiene permisos para subir documentos' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No se proporcionó archivo' });
            }

            // Validar tipo de documento y estado de factura
            const validStates = {
                'retention_isr': ['en_proceso', 'contrasena_generada'],
                'retention_iva': ['retencion_isr_generada'],
                'payment_proof': ['pago_realizado']
            };

            if (!validStates[type] || !validStates[type].includes(invoice.status)) {
                return res.status(400).json({ error: 'Estado de factura no válido para este tipo de documento' });
            }

            // Comprimir archivo
            const compressedFile = await this.compressFile(req.file);

            // Obtener o crear registro de pago
            let payment = await Payment.findOne({ where: { invoice_id: id } });
            if (!payment) {
                payment = await Payment.create({ invoice_id: id });
            }

            // Actualizar registro según el tipo
            const updateData = {};
            let newStatus = '';

            switch (type) {
                case 'retention_isr':
                    updateData.isr_retention_file = compressedFile.path;
                    newStatus = 'retencion_isr_generada';
                    break;
                case 'retention_iva':
                    updateData.iva_retention_file = compressedFile.path;
                    newStatus = 'retencion_iva_generada';
                    break;
                case 'payment_proof':
                    updateData.payment_proof_file = compressedFile.path;
                    newStatus = 'proceso_completado';
                    break;
            }

            await payment.update(updateData);

            // Actualizar estado de factura
            const previousStatus = invoice.status;
            await invoice.update({ status: newStatus });

            // Registrar cambio de estado
            await InvoiceState.create({
                invoice_id: id,
                from_state: previousStatus,
                to_state: newStatus,
                user_id: req.user.userId,
                notes: `Documento ${type} subido: ${req.file.originalname}`
            });

            res.json({ 
                message: 'Documento subido exitosamente', 
                filename: compressedFile.filename,
                newStatus
            });
        } catch (error) {
            console.error('Error al subir documento:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadInvoiceFiles(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(id);

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificar permisos
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar esta factura' });
                }
            }

            if (!invoice.uploaded_files || invoice.uploaded_files.length === 0) {
                return res.status(404).json({ error: 'No hay archivos disponibles' });
            }

            // Si es un solo archivo, enviarlo directamente
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
                // Múltiples archivos: crear ZIP
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
                where: { invoice_id: id },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.isr_retention_file) {
                return res.status(404).json({ error: 'Retención ISR no disponible' });
            }

            // Verificar permisos para proveedores
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            const filename = `retencion-isr-${payment.Invoice.number}.pdf`;
            res.download(payment.isr_retention_file, filename);
        } catch (error) {
            console.error('Error al descargar ISR:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadRetentionIVA(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: id },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.iva_retention_file) {
                return res.status(404).json({ error: 'Retención IVA no disponible' });
            }

            // Verificar permisos para proveedores
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            const filename = `retencion-iva-${payment.Invoice.number}.pdf`;
            res.download(payment.iva_retention_file, filename);
        } catch (error) {
            console.error('Error al descargar IVA:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadPaymentProof(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: id },
                include: [{ model: Invoice, attributes: ['number', 'supplier_id'] }]
            });

            if (!payment || !payment.payment_proof_file) {
                return res.status(404).json({ error: 'Comprobante de pago no disponible' });
            }

            // Verificar permisos para proveedores
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            const filename = `comprobante-pago-${payment.Invoice.number}.pdf`;
            res.download(payment.payment_proof_file, filename);
        } catch (error) {
            console.error('Error al descargar comprobante:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async deleteInvoice(req, res) {
        try {
            const { id } = req.params;
            const invoice = await Invoice.findByPk(id);

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Solo super admin puede eliminar
            if (req.user.role !== 'super_admin') {
                return res.status(403).json({ error: 'No tiene permisos para eliminar facturas' });
            }

            // Eliminar archivos físicos
            if (invoice.uploaded_files && invoice.uploaded_files.length > 0) {
                for (const file of invoice.uploaded_files) {
                    try {
                        await fs.unlink(file.path);
                    } catch (error) {
                        console.warn(`No se pudo eliminar archivo: ${file.path}`);
                    }
                }
            }

            await invoice.destroy();
            res.json({ message: 'Factura eliminada exitosamente' });
        } catch (error) {
            console.error('Error al eliminar factura:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Método auxiliar para comprimir archivos
    async compressFile(file) {
        try {
            const inputPath = file.path;
            const outputPath = inputPath.replace(path.extname(inputPath), '_compressed' + path.extname(inputPath));

            if (file.mimetype === 'application/pdf') {
                // Para PDFs, usar compresión gzip
                const input = await fs.readFile(inputPath);
                const compressed = zlib.gzipSync(input);
                await fs.writeFile(outputPath + '.gz', compressed);
                
                // Eliminar archivo original
                await fs.unlink(inputPath);
                
                return {
                    filename: path.basename(outputPath + '.gz'),
                    path: outputPath + '.gz',
                    size: compressed.length
                };
            } else if (file.mimetype.startsWith('image/')) {
                // Para imágenes, usar Sharp
                await sharp(inputPath)
                    .resize(1920, 1920, { 
                        fit: 'inside',
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 85 })
                    .toFile(outputPath);
                
                // Eliminar archivo original
                await fs.unlink(inputPath);
                
                const stats = await fs.stat(outputPath);
                return {
                    filename: path.basename(outputPath),
                    path: outputPath,
                    size: stats.size
                };
            }

            // Si no necesita compresión, devolver original
            const stats = await fs.stat(inputPath);
            return {
                filename: path.basename(inputPath),
                path: inputPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Error al comprimir archivo:', error);
            // En caso de error, devolver archivo original
            const stats = await fs.stat(file.path);
            return {
                filename: path.basename(file.path),
                path: file.path,
                size: stats.size
            };
        }
    },

    // Método auxiliar para crear ZIP
    async createZipFromFiles(files, invoiceId) {
        const archiver = require('archiver');
        const zipPath = path.join(__dirname, '../uploads', 'temp', `factura-${invoiceId}-${Date.now()}.zip`);
        
        // Asegurar que el directorio temp existe
        await fs.mkdir(path.dirname(zipPath), { recursive: true });
        
        const output = require('fs').createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        return new Promise((resolve, reject) => {
            output.on('close', () => resolve(zipPath));
            archive.on('error', reject);
            
            archive.pipe(output);
            
            files.forEach(file => {
                const filePath = path.join(__dirname, '../uploads', invoiceId.toString(), file.filename);
                archive.file(filePath, { name: file.originalName });
            });
            
            archive.finalize();
        });
    },

    async autoAssignInvoice(invoiceId) {
        try {
            // Buscar trabajador de contaduría con menos facturas asignadas
            const workers = await User.findAll({
                where: { 
                    role: 'trabajador_contaduria',
                    is_active: true 
                }
            });

            if (workers.length === 0) {
                // Si no hay trabajadores, asignar a admin de contaduría
                const admin = await User.findOne({
                    where: { 
                        role: 'admin_contaduria',
                        is_active: true 
                    }
                });

                if (admin) {
                    await Invoice.update(
                        { 
                            assigned_to: admin.id,
                            status: 'asignada_contaduria'
                        },
                        { where: { id: invoiceId } }
                    );

                    await InvoiceState.create({
                        invoice_id: invoiceId,
                        from_state: 'factura_subida',
                        to_state: 'asignada_contaduria',
                        user_id: admin.id,
                        notes: 'Auto-asignación a admin de contaduría'
                    });
                }
                return;
            }

            // Contar facturas asignadas por trabajador
            const workersWithCount = await Promise.all(
                workers.map(async (worker) => {
                    const count = await Invoice.count({
                        where: { 
                            assigned_to: worker.id,
                            status: { 
                                [require('sequelize').Op.notIn]: ['proceso_completado', 'rechazada'] 
                            }
                        }
                    });
                    return { worker, count };
                })
            );

            // Asignar al trabajador con menos facturas
            const selectedWorker = workersWithCount.reduce((min, current) => 
                current.count < min.count ? current : min
            ).worker;

            await Invoice.update(
                { 
                    assigned_to: selectedWorker.id,
                    status: 'asignada_contaduria'
                },
                { where: { id: invoiceId } }
            );

            await InvoiceState.create({
                invoice_id: invoiceId,
                from_state: 'factura_subida',
                to_state: 'asignada_contaduria',
                user_id: selectedWorker.id,
                notes: 'Auto-asignación por sistema'
            });

        } catch (error) {
            console.error('Error en auto-asignación:', error);
        }
    }
};

module.exports = invoiceController;