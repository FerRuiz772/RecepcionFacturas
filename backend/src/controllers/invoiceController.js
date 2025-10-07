/**
 * Controlador de gestión de facturas del sistema PayQuetzal
 * Maneja el ciclo completo de vida de las facturas desde creación hasta pago
 * 
 * Funcionalidades principales:
 * - CRUD de facturas con validaciones de negocio
 * - Upload y gestión de documentos relacionados (PDF, imágenes)
 * - Workflow de estados de factura (pendiente, revisión, aprobada, pagada, rechazada)
 * - Notificaciones automáticas por email según cambios de estado
 * - Generación de reportes y métricas del dashboard
 * - Gestión de pagos y documentos de respaldo
 * - Sistema de carpetas organizadas por proveedor y número de factura
 * 
 * Estados de factura:
 * - pendiente: Recién creada, esperando revisión
 * - en_revision: Bajo revisión de contabilidad  
 * - aprobada: Aprobada para pago
 * - pagada: Pago completado con documentos
 * - rechazada: Rechazada con motivo
 * 
 * Estructura de archivos:
 * uploads/empresas/[proveedor]/proveedores/[proveedor]/[numero_factura]/
 */

const { validationResult } = require('express-validator');
const { Invoice, Supplier, User, InvoiceState, Payment, SystemLog, sequelize } = require('../models');
const invoiceNotificationService = require('../utils/invoiceNotificationService');
const statusNotificationService = require('../utils/statusNotificationService');
const invoiceDocumentService = require('../services/invoiceDocumentService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sharp = require('sharp');
const zlib = require('zlib');
const { Op } = require('sequelize');

/**
 * Devuelve las partes de fecha según la zona horaria de Guatemala (America/Guatemala)
 * @param {Date} date
 * @returns {{year: string, month: string, day: string}}
 */
const getGuatemalaDateParts = (date = new Date()) => {
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Guatemala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = fmt.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return { year, month, day };
};

// ========== FUNCIONES DE LIMPIEZA Y MANTENIMIENTO ==========

/**
 * Limpia archivos comprimidos huérfanos al iniciar el servidor
 * Esto previene problemas con PDFs corrompidos por compresión
 */
const cleanupCompressedFiles = async () => {
    try {
        console.log('🧹 Iniciando limpieza de archivos comprimidos...');
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        
        // Verificar que el directorio existe
        try {
            await fs.access(uploadsDir);
        } catch (error) {
            console.log('📁 Directorio uploads no existe aún, saltando limpieza');
            return;
        }
        
        const findAndCleanGzFiles = async (directory) => {
            try {
                const items = await fs.readdir(directory, { withFileTypes: true });
                
                for (const item of items) {
                    const fullPath = path.join(directory, item.name);
                    
                    if (item.isDirectory()) {
                        await findAndCleanGzFiles(fullPath);
                    } else if (item.isFile() && item.name.endsWith('.pdf')) {
                        // Verificar si el archivo PDF está comprimido internamente
                        try {
                            const fileBuffer = await fs.readFile(fullPath);
                            const isGzipped = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b;
                            
                            if (isGzipped) {
                                console.log(`🔧 Limpiando archivo PDF comprimido: ${fullPath}`);
                                try {
                                    const decompressedData = zlib.gunzipSync(fileBuffer);
                                    await fs.writeFile(fullPath, decompressedData);
                                    console.log(`✅ Archivo PDF descomprimido: ${fullPath}`);
                                } catch (error) {
                                    console.log(`❌ Error descomprimiendo PDF ${fullPath}: ${error.message}`);
                                }
                            }
                        } catch (error) {
                            // Ignorar errores de lectura de archivos individuales
                            if (error.code !== 'ENOENT') {
                                console.log(`❌ Error leyendo archivo ${fullPath}: ${error.message}`);
                            }
                        }
                    } else if (item.isFile() && item.name.endsWith('.gz')) {
                        console.log(`🔧 Limpiando archivo .gz: ${fullPath}`);
                        try {
                            const compressedData = await fs.readFile(fullPath);
                            const decompressedData = zlib.gunzipSync(compressedData);
                            const originalPath = fullPath.replace('.gz', '');
                            
                            await fs.writeFile(originalPath, decompressedData);
                            await fs.unlink(fullPath);
                            console.log(`✅ Archivo .gz limpiado: ${originalPath}`);
                        } catch (error) {
                            console.log(`❌ Error limpiando ${fullPath}: ${error.message}`);
                        }
                    }
                }
            } catch (error) {
                // Silenciosamente ignorar errores de directorios no accesibles
                if (error.code !== 'ENOENT' && error.code !== 'EACCES') {
                    console.log(`❌ Error procesando directorio ${directory}: ${error.message}`);
                }
            }
        };
        
        await findAndCleanGzFiles(uploadsDir);
        console.log('✅ Limpieza de archivos comprimidos completada');
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
    }
};

// Ejecutar limpieza después de un pequeño delay para asegurar que el sistema esté listo
setTimeout(cleanupCompressedFiles, 2000);

/**
 * Crea la estructura de carpetas para organizar documentos de facturas
 * Estructura: uploads/empresas/[empresa]/proveedores/[proveedor]/[numero_factura]
 * @param {string} supplierBusinessName - Nombre comercial del proveedor
 * @param {string} invoiceNumber - Número de la factura
 * @returns {string} Ruta completa de la carpeta creada
 */
const createInvoiceFolder = async (supplierBusinessName, invoiceNumber) => {
    try {
        // Normalizar nombres para uso seguro en sistema de archivos
        const supplierFolder = supplierBusinessName
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remover acentos
            .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
            .toLowerCase();

        const invoiceFolder = invoiceNumber
            .replace(/[^a-zA-Z0-9\-]/g, '_'); // Reemplazar caracteres especiales excepto guiones

        // Definir estructura de carpetas jerárquica
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const empresasDir = path.join(uploadsDir, 'empresas');
        
        // TODO: En el futuro mapear múltiples proveedores a la misma empresa
        // En el futuro se puede mapear múltiples proveedores a la misma empresa
        const empresaDir = path.join(empresasDir, supplierFolder);
        const proveedoresDir = path.join(empresaDir, 'proveedores');
        const supplierDir = path.join(proveedoresDir, supplierFolder);
        const invoiceDir = path.join(supplierDir, invoiceFolder);

        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.mkdir(empresasDir, { recursive: true });
        await fs.mkdir(empresaDir, { recursive: true });
        await fs.mkdir(proveedoresDir, { recursive: true });
        await fs.mkdir(supplierDir, { recursive: true });
        await fs.mkdir(invoiceDir, { recursive: true });

        console.log('📁 Carpeta de factura creada:', invoiceDir);
        return invoiceDir;
    } catch (error) {
        console.error('Error creando carpeta de factura:', error);
        throw error;
        throw error;
    }
};

/**
 * Busca documentos en múltiples estructuras de carpetas del sistema
 * Soporta migración entre diferentes organizaciones de archivos
 * 
 * Estructuras soportadas:
 * 1. Nueva: uploads/empresas/[proveedor]/proveedores/[proveedor]/[factura]/
 * 2. Actual: uploads/[proveedor]/[factura_fecha]/
 * 3. Antigua: uploads/[archivo]
 * 4. Proveedores: uploads/proveedores/[proveedor]/[factura]/
 * 
 * @param {string} supplierBusinessName - Nombre comercial del proveedor
 * @param {string} invoiceNumber - Número de la factura  
 * @param {string} fileName - Nombre del archivo a buscar
 * @returns {string} Ruta completa del archivo encontrado
 * @throws {Error} Si el archivo no se encuentra en ninguna estructura
 */
const findDocumentPath = async (supplierBusinessName, invoiceNumber, fileName) => {
    try {
        console.log(`🔍 FindDocumentPath: Buscando archivo...`);
        console.log(`   📁 Proveedor: ${supplierBusinessName}`);
        console.log(`   📄 Factura: ${invoiceNumber}`);
        console.log(`   📎 Archivo: ${fileName}`);
        
        // Limpiar el nombre del proveedor para el directorio
        const supplierFolder = supplierBusinessName.replace(/[^a-zA-Z0-9]/g, '_');
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        
        console.log(`   📂 Directorio uploads: ${uploadsDir}`);
        console.log(`   📂 Carpeta proveedor: ${supplierFolder}`);

        // Función auxiliar para verificar y descomprimir si es necesario
        const checkAndDecompressFile = async (filePath) => {
            try {
                await fs.access(filePath);
                
                // Verificar si el archivo está comprimido
                const fileBuffer = await fs.readFile(filePath);
                const isGzipped = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b;
                
                if (isGzipped && filePath.endsWith('.pdf')) {
                    console.log(`   🔧 Archivo comprimido detectado, descomprimiendo: ${filePath}`);
                    try {
                        const decompressedData = zlib.gunzipSync(fileBuffer);
                        await fs.writeFile(filePath, decompressedData);
                        console.log(`   ✅ Archivo descomprimido exitosamente: ${filePath}`);
                    } catch (error) {
                        console.log(`   ❌ Error descomprimiendo archivo: ${error.message}`);
                        throw error;
                    }
                }
                
                return filePath;
            } catch (error) {
                throw error;
            }
        };

        // 1. Buscar en la nueva estructura por empresa
        const empresasDir = path.join(uploadsDir, 'empresas', supplierFolder.toLowerCase(), 'proveedores', supplierFolder.toLowerCase(), invoiceNumber.replace(/[^a-zA-Z0-9\-]/g, '_'));
        console.log(`   🔍 Buscando en estructura nueva: ${empresasDir}`);
        try {
            const newStructurePath = path.join(empresasDir, fileName);
            const result = await checkAndDecompressFile(newStructurePath);
            console.log(`   ✅ Encontrado en estructura nueva: ${result}`);
            return result;
        } catch (error) {
            console.log(`   ❌ No encontrado en estructura nueva: ${error.message}`);
        }

        // 2. Buscar en la estructura actual: uploads/SupplierName/InvoiceNumber_Date/
        const supplierDir = path.join(uploadsDir, supplierFolder);
        console.log(`   🔍 Buscando en directorio proveedor: ${supplierDir}`);
        try {
            const subdirs = await fs.readdir(supplierDir);
            console.log(`   📁 Subdirectorios encontrados:`, subdirs);
            for (const subdir of subdirs) {
                if (subdir.includes(invoiceNumber)) {
                    const potentialPath = path.join(supplierDir, subdir, fileName);
                    console.log(`   🔍 Probando: ${potentialPath}`);
                    try {
                        const result = await checkAndDecompressFile(potentialPath);
                        console.log(`   ✅ Encontrado en estructura actual: ${result}`);
                        return result;
                    } catch (error) {
                        console.log(`   ❌ No accesible: ${error.message}`);
                        continue;
                    }
                }
            }
        } catch (error) {
            console.log(`   ❌ Error leyendo directorio proveedor: ${error.message}`);
        }

        // 3. Buscar directamente en uploads (estructura antigua)
        const directPath = path.join(uploadsDir, fileName);
        console.log(`   🔍 Buscando en uploads directo: ${directPath}`);
        try {
            const result = await checkAndDecompressFile(directPath);
            console.log(`   ✅ Encontrado en uploads directo: ${result}`);
            return result;
        } catch (error) {
            console.log(`   ❌ No encontrado en uploads directo: ${error.message}`);
        }

        // 4. Buscar en la estructura de proveedores
        const proveedoresDir = path.join(uploadsDir, 'proveedores', supplierFolder.toLowerCase(), invoiceNumber.replace(/[^a-zA-Z0-9\-]/g, '_'));
        console.log(`   🔍 Buscando en estructura proveedores: ${proveedoresDir}`);
        try {
            const proveedoresPath = path.join(proveedoresDir, fileName);
            const result = await checkAndDecompressFile(proveedoresPath);
            console.log(`   ✅ Encontrado en estructura proveedores: ${result}`);
            return result;
        } catch (error) {
            console.log(`   ❌ No encontrado en estructura proveedores: ${error.message}`);
        }

        console.log(`   ❌ Archivo no encontrado en ninguna ubicación`);
        throw new Error(`Archivo no encontrado: ${fileName}`);
    } catch (error) {
        console.error(`❌ Error en findDocumentPath:`, error);
        throw error;
    }
};



/**
 * Configuración de almacenamiento con multer para upload de archivos de facturas
 * Crea directorios dinámicos basados en parámetros de request
 * Maneja errores de creación de directorios graciosamente
 */
const storage = multer.diskStorage({
    /**
     * Define el directorio de destino para archivos subidos
     * Utiliza el ID de la factura o carpeta 'temp' como fallback
     */
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads', req.params.id || 'temp');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    /**
     * Genera nombre único para archivos subidos usando timestamp y número aleatorio
     * Preserva la extensión original del archivo
     */
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
});

/**
 * Configuración de multer para upload de archivos PDF
 * Límite de 10MB por archivo, máximo 5 archivos por request
 * Solo acepta archivos con mimetype application/pdf
 */
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB por archivo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'));
        }
    }
});

/**
 * Matriz de transiciones válidas entre estados de factura
 * Define el workflow de estados permitidos para mantener integridad del proceso
 * 
 * Estados del workflow:
 * - factura_subida: Estado inicial, factura cargada por proveedor
 * - asignada_contaduria: Asignada a contador para revisión
 * - en_proceso: Contador trabajando en la factura
 * - contrasena_generada: Contraseña para descarga generada
 * - retencion_isr_generada: Retención ISR calculada y guardada
 * - retencion_iva_generada: Retención IVA calculada y guardada  
 * - pago_realizado: Pago ejecutado
 * - proceso_completado: Workflow finalizado exitosamente
 * - rechazada: Factura rechazada, puede volver a factura_subida
 */
const VALID_STATE_TRANSITIONS = {
    'factura_subida': ['asignada_contaduria', 'rechazada'],
    'asignada_contaduria': ['en_proceso', 'rechazada'],
    'en_proceso': ['contrasena_generada', 'rechazada'],
    'contrasena_generada': ['retencion_isr_generada', 'rechazada'],
    'retencion_isr_generada': ['retencion_iva_generada', 'pago_realizado', 'proceso_completado', 'rechazada'],
    'retencion_iva_generada': ['pago_realizado', 'proceso_completado', 'rechazada'],
    'pago_realizado': ['proceso_completado', 'rechazada'],
    'proceso_completado': ['rechazada'],
    'rechazada': ['factura_subida']
};

/**
 * Controlador principal para gestión de facturas
 * Contiene todos los endpoints CRUD y funciones especializadas
 */
const invoiceController = {
    // Middleware para upload de múltiples archivos (máximo 5)
    uploadMiddleware: upload.array('files', 5),

    /**
     * Obtiene lista paginada de facturas con filtros y permisos por rol
     * 
     * @route GET /api/invoices
     * @param {Object} req.query - Parámetros de consulta
     * @param {string} req.query.status - Filtrar por estado de factura
     * @param {number} req.query.supplier_id - Filtrar por ID de proveedor
     * @param {number} req.query.assigned_to - Filtrar por contador asignado
     * @param {string} req.query.tipo_proveedor - Filtrar por tipo de proveedor/régimen
     * @param {number} req.query.page - Número de página (default: 1)
     * @param {number} req.query.limit - Elementos por página (default: 10)
     * @param {string} req.query.search - Búsqueda en número y descripción
     * @param {string} req.query.date_from - Fecha inicio filtro (YYYY-MM-DD)
     * @param {string} req.query.date_to - Fecha fin filtro (YYYY-MM-DD)
     * @returns {Object} Lista paginada con filtros aplicados según rol del usuario
     */
    async getAllInvoices(req, res) {
        try {
            const { status, supplier_id, assigned_to, tipo_proveedor, page = 1, limit = 10, search, date_from, date_to } = req.query;
            const offset = (page - 1) * limit;

            console.log('🔍 Filtros recibidos:', { status, supplier_id, assigned_to, tipo_proveedor, search, date_from, date_to });

            const where = {};
            if (status) where.status = status;
            if (supplier_id) where.supplier_id = parseInt(supplier_id);
            if (assigned_to) where.assigned_to = parseInt(assigned_to);

            // Filtros por fecha
            if (date_from || date_to) {
                where.created_at = {};
                if (date_from) {
                    where.created_at[Op.gte] = new Date(date_from);
                }
                if (date_to) {
                    // Agregar 23:59:59 para incluir todo el día
                    const endDate = new Date(date_to);
                    endDate.setHours(23, 59, 59, 999);
                    where.created_at[Op.lte] = endDate;
                }
            }

            console.log('📊 Where clause antes de rol:', where);

            // Búsqueda por número de factura o descripción
            if (search) {
                where[Op.or] = [
                    { number: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filtrar por rol del usuario (todos los roles ven sus facturas correspondientes)
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                where.supplier_id = user.supplier_id;
            } else if (req.user.role === 'trabajador_contaduria') {
                // trabajador_contaduria solo ve sus propias facturas asignadas
                where.assigned_to = req.user.userId;
            }
            // super_admin y admin_contaduria pueden usar el filtro assigned_to o ver todas
            
            console.log('📋 Where clause final:', where);
            console.log('👤 Usuario rol:', req.user.role);

            // Configurar includes basado en el rol del usuario
            const supplierInclude = {
                model: Supplier,
                as: 'supplier',
                attributes: ['id', 'business_name', 'nit', 'tipo_proveedor']
            };

            // Si hay filtro de tipo_proveedor, agregar where al include
            if (tipo_proveedor) {
                supplierInclude.where = { tipo_proveedor };
                supplierInclude.required = true; // Hacer INNER JOIN para filtrar
            }

            const includes = [
                supplierInclude,
                {
                    model: Payment,
                    as: 'payment',
                    required: false
                }
            ];

            // Solo incluir información del usuario asignado si NO es proveedor
            if (req.user.role !== 'proveedor') {
                includes.push({
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name', 'email'],
                    required: false
                });
            }

            const invoices = await Invoice.findAndCountAll({
                where,
                include: includes,
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            // Si es proveedor, remover el campo assigned_to de cada factura
            let processedInvoices = invoices.rows;
            if (req.user.role === 'proveedor') {
                processedInvoices = invoices.rows.map(invoice => {
                    const invoiceData = invoice.toJSON();
                    delete invoiceData.assigned_to;
                    return invoiceData;
                });
            }

            res.json({
                invoices: processedInvoices,
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
            
            // Configurar includes basado en el rol del usuario
            const includes = [
                {
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['id', 'business_name', 'nit', 'contact_phone', 'tipo_proveedor']
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
            ];

            // Solo incluir información del usuario asignado si NO es proveedor
            if (req.user.role !== 'proveedor') {
                includes.push({
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name', 'email'],
                    required: false
                });
            }

            const invoice = await Invoice.findByPk(parseInt(id), {
                include: includes
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Verificación automática de estado inconsistente
            try {
                if (invoice.payment && 
                    !['proceso_completado', 'rechazada'].includes(invoice.status) &&
                    invoice.amount > 0) {
                    
                    const payment = invoice.payment;
                    const allDocumentsComplete = payment.password_file && 
                                               payment.isr_retention_file && 
                                               payment.iva_retention_file && 
                                               payment.payment_proof_file;

                    if (allDocumentsComplete && invoice.status !== 'proceso_completado') {
                        console.log(`🔧 Auto-corrección: Factura ${invoice.number} tiene todos los documentos pero estado incorrecto`);
                        
                        const oldStatus = invoice.status;
                        await invoice.update({ status: 'proceso_completado' });
                        
                        if (!payment.completion_date) {
                            await payment.update({ completion_date: new Date() });
                        }
                        
                        await InvoiceState.create({
                            invoice_id: invoice.id,
                            from_state: oldStatus,
                            to_state: 'proceso_completado',
                            user_id: 1, // Sistema automático
                            notes: 'Auto-corrección al consultar factura - todos los documentos estaban completos',
                            timestamp: new Date()
                        });
                        
                        // Actualizar el objeto invoice para reflejar el cambio
                        invoice.status = 'proceso_completado';
                        console.log(`✅ Factura ${invoice.number} corregida automáticamente`);
                    }
                }
            } catch (autoFixError) {
                console.error('❌ Error en auto-corrección:', autoFixError);
                // No interrumpir la consulta principal
            }

            // Verificar permisos de acceso
            if (req.user.hasPermission('facturas.ver_propias') && !req.user.hasPermission('facturas.ver_todas')) {
                // Usuario solo puede ver sus propias facturas
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
            }

            // Si es proveedor, remover el campo assigned_to de la respuesta
            let responseData = invoice.toJSON();
            if (req.user.role === 'proveedor') {
                delete responseData.assigned_to;
            }

            res.json(responseData);
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
            const { role } = req.user;

            // Verificar que el usuario tenga permisos para crear facturas
            if (!['proveedor', 'admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(role)) {
                await transaction.rollback();
                return res.status(403).json({ error: 'No tiene permisos para crear facturas' });
            }

            let supplier_id;
            let created_by_role = role;

            // Determinar supplier_id según el rol
            if (role === 'proveedor') {
                const user = await User.findByPk(req.user.userId, { transaction });
                if (!user.supplier_id) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Usuario proveedor no tiene empresa asignada' });
                }
                supplier_id = user.supplier_id;
            } else {
                // Para contaduría, debe especificar supplier_id o se puede inferir de contexto
                if (!req.body.supplier_id) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Debe especificar el ID del proveedor' });
                }
                supplier_id = req.body.supplier_id;
            }

            // Validar archivos
            if (!req.files || req.files.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Debe subir al menos un archivo' });
            }

            // Variables para el invoice
            let invoiceData = {
                supplier_id,
                priority,
                status: 'factura_subida',
                processing_data: {
                    created_by: req.user.userId,
                    created_by_role,
                    created_at: new Date(),
                    ip_address: req.ip
                }
            };

            // Si hay datos de factura (contaduría), incluirlos
            if (number && amount && description) {
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

                invoiceData = {
                    ...invoiceData,
                    number,
                    amount: parseFloat(amount),
                    description,
                    due_date,
                    serie: req.body.serie || null,
                    numero_dte: req.body.numero_dte || null
                };
            } else if (role !== 'proveedor') {
                // Si es contaduría pero no envió datos, es un error
                await transaction.rollback();
                return res.status(400).json({ error: 'Personal de contaduría debe incluir datos de la factura' });
            } else {
                // Proveedor solo sube archivos - generar número de referencia
                // Nuevo formato solicitado: REF-AÑOMESDIA-SEQ (orden de entrada del día)
                const parts = getGuatemalaDateParts();
                const dateStr = `${parts.year}${parts.month}${parts.day}`; // YYYYMMDD

                // Contar cuántas facturas se han creado en este día para generar un consecutivo
                // Contar facturas creadas el mismo día según zona horaria de Guatemala
                const startOfDay = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 0, 0, 0));
                const endOfDay = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 23, 59, 59, 999));
                // Ajustar rango para comparar en UTC (DB almacena timestamps en UTC normalmente)
                const invoicesTodayCount = await Invoice.count({
                    where: {
                        created_at: {
                            [Op.between]: [startOfDay, endOfDay]
                        }
                    }
                });

                const seq = String(invoicesTodayCount + 1).padStart(4, '0'); // 0001, 0002, ...
                const refNumber = `REF-${dateStr}-${seq}`;
                invoiceData = {
                    ...invoiceData,
                    number: refNumber,
                    amount: 0, // Será llenado por contaduría
                    description: 'Pendiente de procesamiento por contaduría'
                };
            }

            // Procesar archivos subidos con estructura de carpetas organizada
            const uploadedFiles = [];
            if (req.files && req.files.length > 0) {
                // Obtener información del proveedor
                const supplier = await Supplier.findByPk(supplier_id, { transaction });
                if (!supplier) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Proveedor no encontrado' });
                }

                // Crear estructura de directorios
                const providerName = supplier.business_name.replace(/[^a-zA-Z0-9]/g, '_'); // Limpiar nombre
                    const gp = getGuatemalaDateParts();
                    const currentDate = `${gp.year}-${gp.month}-${gp.day}`; // YYYY-MM-DD (Guatemala)
                const invoiceNumber = invoiceData.number.replace(/[^a-zA-Z0-9-]/g, '_'); // Limpiar número
                
                const providerDir = path.join(__dirname, '../uploads', providerName);
                const invoiceDir = path.join(providerDir, `${invoiceNumber}_${currentDate}`);
                
                // Crear directorios si no existen
                await fs.mkdir(providerDir, { recursive: true });
                await fs.mkdir(invoiceDir, { recursive: true });

                for (const file of req.files) {
                    // Determinar tipo de documento basado en el nombre del archivo
                    const originalName = file.originalname.toLowerCase();
                    let docType = 'documento'; // tipo por defecto
                    
                    if (originalName.includes('factura')) docType = 'factura';
                    else if (originalName.includes('isr')) docType = 'isr';
                    else if (originalName.includes('iva')) docType = 'iva';
                    else if (originalName.includes('comprobante')) docType = 'comprobante';
                    else if (originalName.includes('retencion')) docType = 'retencion';

                    // Crear nombre del archivo: proveedor_fecha_tipo.ext
                    const ext = path.extname(file.originalname);
                    const newFileName = `${providerName}_${currentDate}_${docType}${ext}`;
                    const finalPath = path.join(invoiceDir, newFileName);

                    // Mover archivo desde temp a la ubicación final
                    await fs.rename(file.path, finalPath);

                    // Comprimir si es necesario
                    const compressedFile = await invoiceController.compressFileInPlace(finalPath, file.mimetype);
                    
                    uploadedFiles.push({
                        originalName: file.originalname,
                        filename: compressedFile.filename,
                        path: compressedFile.path,
                        size: compressedFile.size,
                        mimetype: file.mimetype,
                        docType: docType,
                        uploadedAt: new Date()
                    });
                }
            }

            invoiceData.uploaded_files = uploadedFiles;

            // Crear factura
            const invoice = await Invoice.create(invoiceData, { transaction });

            // Crear registro de estado inicial
            const initialNote = role === 'proveedor' 
                ? 'Factura creada por proveedor - pendiente de procesamiento'
                : 'Factura creada por personal de contaduría';

            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: null,
                to_state: 'factura_subida',
                user_id: req.user.userId,
                notes: initialNote
            }, { transaction });

            // Auto-asignar a contaduría solo si fue creada por proveedor
            if (role === 'proveedor') {
                const assignedUserId = await invoiceController.autoAssignInvoice();
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
            }

            // Obtener factura completa para respuesta ANTES del commit
            const createdInvoice = await Invoice.findByPk(invoice.id, {
                include: [
                    { model: Supplier, as: 'supplier', attributes: ['id', 'business_name', 'nit', 'tipo_proveedor'] },
                    { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'], required: false },
                    { model: Payment, as: 'payment', required: false }
                ],
                transaction
            });

            await transaction.commit();

            // Enviar notificaciones por email (después del commit para asegurar que todo se guardó)
            try {
                const supplier = createdInvoice.supplier;
                const assignedUser = createdInvoice.assignedUser;
                
                console.log('🔍 CREACIÓN MANUAL DE FACTURA - Iniciando notificaciones...');
                console.log('🔍 Rol del usuario:', role);
                console.log('🔍 Factura creada:', { id: createdInvoice.id, number: createdInvoice.number });
                console.log('🔍 Supplier:', supplier ? { id: supplier.id, business_name: supplier.business_name } : 'No encontrado');
                console.log('🔍 Usuario asignado:', assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : 'No asignado');
                
                // Usar el nuevo servicio de notificaciones
                await statusNotificationService.processNotification('invoice_created', {
                    invoice: createdInvoice,
                    supplier: supplier,
                    assignedUser: assignedUser
                });
                
                console.log('✅ Notificaciones enviadas exitosamente');
            } catch (notificationError) {
                console.error('❌ Error enviando notificaciones:', notificationError);
                console.error('❌ Stack trace:', notificationError.stack);
                // No fallar la creación de factura si falla el email
            }

            const message = role === 'proveedor' 
                ? 'Archivo subido exitosamente. El personal de contaduría procesará los datos de la factura.'
                : 'Factura creada exitosamente';

            res.status(201).json({
                message,
                invoice: createdInvoice,
                created_by_role
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
            const { amount, description, due_date, priority, serie, numero_dte } = req.body;

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
            if (amount !== undefined) {
                const parsedAmount = parseFloat(amount);
                if (parsedAmount <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'El monto debe ser mayor a 0' });
                }
                updateData.amount = parsedAmount;
            }
            if (description !== undefined) updateData.description = description;
            if (due_date !== undefined) updateData.due_date = due_date;
            if (priority !== undefined) updateData.priority = priority;
            if (serie !== undefined) updateData.serie = serie || null;
            if (numero_dte !== undefined) updateData.numero_dte = numero_dte || null;

            // Determinar si necesita cambio de estado
            let newStatus = invoice.status;
            if (description !== undefined && invoice.status === 'factura_subida') {
                // Solo cambiar a 'asignada_contaduria' si se modifica la descripción y está en estado inicial
                newStatus = 'asignada_contaduria';
                updateData.status = newStatus;
            }

            await invoice.update(updateData, { transaction });

            // Verificar si la factura puede ser completada automáticamente después de la actualización
            let finalStatus = newStatus;
            if (newStatus !== 'proceso_completado') {
                const shouldComplete = await invoiceController.checkIfShouldComplete(invoice, transaction);
                if (shouldComplete) {
                    finalStatus = 'proceso_completado';
                    await invoice.update({ status: finalStatus }, { transaction });
                    
                    // Actualizar fecha de completado
                    const payment = await Payment.findOne({ 
                        where: { invoice_id: invoice.id },
                        transaction 
                    });
                    if (payment) {
                        await payment.update({ completion_date: new Date() }, { transaction });
                    }
                }
            }

            // Registrar cambio si es significativo
            if (Object.keys(updateData).length > 0) {
                const statusChanged = finalStatus !== invoice.status;
                await InvoiceState.create({
                    invoice_id: invoice.id,
                    from_state: invoice.status,
                    to_state: finalStatus,
                    user_id: req.user.userId,
                    notes: statusChanged ? 
                        `Estado cambiado a ${finalStatus} por actualización de descripción` :
                        `Factura actualizada: ${Object.keys(updateData).filter(key => key !== 'status').join(', ')}`
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

            // Solo usuarios con permiso de editar facturas pueden cambiar estados
            if (!req.user.hasPermission('facturas.editar')) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
            }

            // Validar que usuarios con permiso limitado solo cambien sus facturas asignadas
            if (req.user.hasPermission('facturas.ver_propias') && !req.user.hasPermission('facturas.ver_todas') 
                && req.user.role === 'trabajador_contaduria' && invoice.assigned_to !== req.user.userId) {
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

            // Validación especial para completar proceso
            if (status === 'proceso_completado') {
                // Validar que la factura tenga un monto válido
                if (!invoice.amount || parseFloat(invoice.amount) <= 0) {
                    await transaction.rollback();
                    return res.status(400).json({ 
                        error: 'No se puede completar el proceso. La factura debe tener un monto válido mayor a 0',
                        currentAmount: invoice.amount
                    });
                }

                const payment = await Payment.findOne({ 
                    where: { invoice_id: parseInt(id) },
                    transaction 
                });

                if (!payment || !payment.password_generated || !payment.isr_retention_file || !payment.iva_retention_file || !payment.payment_proof_file) {
                    await transaction.rollback();
                    return res.status(400).json({ 
                        error: 'No se puede completar el proceso. Faltan documentos obligatorios',
                        missing: {
                            password: !payment?.password_generated,
                            isr_retention: !payment?.isr_retention_file,
                            iva_retention: !payment?.iva_retention_file,
                            payment_proof: !payment?.payment_proof_file
                        }
                    });
                }

                // Actualizar fecha de completado
                await payment.update({ 
                    completion_date: new Date() 
                }, { transaction });
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

            // Enviar notificaciones por email (después del commit)
            try {
                const invoiceWithDetails = await Invoice.findByPk(id, {
                    include: [
                        { model: Supplier, as: 'supplier', attributes: ['id', 'business_name', 'tipo_proveedor'] }
                    ]
                });
                
                const changedBy = await User.findByPk(req.user.userId, {
                    attributes: ['id', 'name', 'email']
                });

                // Usar el nuevo servicio de notificaciones
                await statusNotificationService.processNotification('status_change', {
                    invoice: invoiceWithDetails,
                    fromStatus: currentStatus,
                    toStatus: status,
                    changedBy: changedBy,
                    supplier: invoiceWithDetails.supplier,
                    notes: notes // Pasar notas/reason para casos como 'rechazada'
                });
                
                console.log(`✅ Notificación de cambio de estado enviada: ${currentStatus} → ${status}`);
            } catch (notificationError) {
                console.error('❌ Error enviando notificación de cambio de estado:', notificationError);
                // No fallar la actualización si falla el email
            }
            
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

    /**
     * Rechaza una factura con una razón obligatoria.
     * Crea un InvoiceState con el campo notes/remarks para almacenar el motivo
     * y envía notificación al proveedor incluyendo la razón.
     */
    async rejectInvoice(req, res) {
        const transaction = await sequelize.transaction();
        try {
            const { id } = req.params;
            const { reason } = req.body;

            if (!reason || reason.trim() === '') {
                await transaction.rollback();
                return res.status(400).json({ error: 'Se requiere una razón para rechazar la factura' });
            }

            const invoice = await Invoice.findByPk(parseInt(id), { transaction });
            if (!invoice) {
                await transaction.rollback();
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Permisos: permitir a contaduría (admin_contaduria, trabajador_contaduria), super_admin
            // o a usuarios con permisos específicos ('facturas.editar' o 'facturas.reject')
            const role = req.user.role;
            const hasEditPerm = req.user.hasPermission && req.user.hasPermission('facturas.editar');
            const hasRejectPerm = req.user.hasPermission && req.user.hasPermission('facturas.reject');

            if (!(hasEditPerm || hasRejectPerm || ['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(role))) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
            }

            // Si es trabajador de contaduría, solo puede rechazar facturas que estén asignadas a él
            if (role === 'trabajador_contaduria' && invoice.assigned_to !== req.user.userId) {
                await transaction.rollback();
                return res.status(403).json({ error: 'Solo puede rechazar facturas asignadas a usted', code: 'ACCESS_DENIED' });
            }

            // Permitir rechazar facturas incluso si están en 'proceso_completado'.
            // Solo bloquear si ya están en 'rechazada'.
            if (invoice.status === 'rechazada') {
                await transaction.rollback();
                return res.status(400).json({ error: `No se puede rechazar una factura en estado '${invoice.status}'` });
            }

            const oldStatus = invoice.status;
            // Actualizar estado a rechazada
            await invoice.update({ status: 'rechazada' }, { transaction });

            // Crear registro de cambio de estado con la razón en notes
            await InvoiceState.create({
                invoice_id: invoice.id,
                from_state: oldStatus,
                to_state: 'rechazada',
                user_id: req.user.userId,
                notes: reason,
                timestamp: new Date()
            }, { transaction });

            await transaction.commit();

            // Enviar notificación al proveedor incluyendo la razón
            try {
                const invoiceWithDetails = await Invoice.findByPk(id, {
                    include: [ { model: Supplier, as: 'supplier' } ]
                });

                const changedBy = await User.findByPk(req.user.userId, { attributes: ['id','name','email'] });

                await statusNotificationService.processNotification('status_change', {
                    invoice: invoiceWithDetails,
                    fromStatus: oldStatus,
                    toStatus: 'rechazada',
                    changedBy,
                    supplier: invoiceWithDetails.supplier,
                    notes: reason
                });
            } catch (notificationError) {
                console.error('❌ Error enviando notificación de rechazo:', notificationError);
            }

            res.json({ message: 'Factura rechazada', invoice });
        } catch (error) {
            await transaction.rollback();
            console.error('Error al rechazar factura:', error);
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

            // Generar contraseña única con formato solicitado: CONTRA-AÑOMESDIA-#####
            // Usar la zona horaria de Guatemala para la parte de fecha
            const { year: yyyy, month: mm, day: dd } = getGuatemalaDateParts();
            const dateStr = `${yyyy}${mm}${dd}`;

            // Generar código numérico de 5 dígitos
            const randomFive = Math.floor(10000 + Math.random() * 90000); // 10000-99999
            const password = `CONTRA-${dateStr}-${randomFive}`;

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
            
            // Enviar notificación al proveedor y a contaduría sobre la contraseña generada
            try {
                const invoiceWithSupplier = await Invoice.findByPk(id, { include: [{ model: Supplier, as: 'supplier' }] });
                const proveedorUser = await User.findOne({ where: { supplier_id: invoiceWithSupplier.supplier_id } });
                const generatedBy = await User.findByPk(req.user.userId);
                if (proveedorUser) {
                    await invoiceNotificationService.notifyPasswordGenerated(invoiceWithSupplier, proveedorUser, generatedBy, password);
                }
            } catch (err) {
                console.error('❌ Error enviando notificación de contraseña generada:', err);
            }

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

            const validTypes = ['retention_isr', 'retention_iva', 'payment_proof', 'password_file'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: 'Tipo de documento no válido',
                    code: 'INVALID_DOCUMENT_TYPE'
                });
            }

            // Obtener información del proveedor para generar el nombre del archivo
            const invoiceWithSupplier = await Invoice.findByPk(invoice.id, {
                include: [{ model: Supplier, as: 'supplier' }]
            });

            if (!invoiceWithSupplier || !invoiceWithSupplier.supplier) {
                return res.status(400).json({
                    error: 'No se puede obtener información del proveedor',
                    code: 'SUPPLIER_NOT_FOUND'
                });
            }

            // VALIDAR QUE EL DOCUMENTO SEA REQUERIDO SEGÚN EL TIPO DE PROVEEDOR
            const fieldMapping = {
                'retention_isr': 'isr_retention_file',
                'retention_iva': 'iva_retention_file',
                'payment_proof': 'payment_proof_file',
                'password_file': 'password_file'
            };

            const tipoProveedor = invoiceWithSupplier.supplier.tipo_proveedor;
            const documentField = fieldMapping[type];

            if (!invoiceDocumentService.isDocumentRequired(documentField, tipoProveedor)) {
                const tipoLabels = {
                    'definitiva': 'Régimen Definitiva ISR',
                    'pagos_trimestrales': 'Pagos Trimestrales',
                    'pequeno_contribuyente': 'Pequeño Contribuyente',
                    'pagos_trimestrales_retencion': 'Pagos Trimestrales - Agente Retención'
                };

                return res.status(400).json({
                    error: `Este tipo de proveedor (${tipoLabels[tipoProveedor]}) no requiere este documento`,
                    code: 'DOCUMENT_NOT_REQUIRED',
                    tipoProveedor: tipoProveedor,
                    documentType: type
                });
            }

            // Crear directorio de uploads si no existe
            const invoiceDir = await createInvoiceFolder(
                invoiceWithSupplier.supplier.business_name,
                invoiceWithSupplier.number
            );

            const originalName = file.originalname;
            const extension = path.extname(originalName);
            
            // Generar nombre con formato: proveedor_fecha_tipoDocumento
            const today = new Date();
            const gp2 = getGuatemalaDateParts();
            const dateStr = `${gp2.year}${gp2.month}${gp2.day}`; // YYYYMMDD (Guatemala)
            const supplierName = invoiceWithSupplier.supplier.business_name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
                .toLowerCase();
            
            // Mapear tipos a nombres más descriptivos
            const typeMapping = {
                'retention_isr': 'retencion_isr',
                'retention_iva': 'retencion_iva',
                'payment_proof': 'comprobante_pago',
                'password_file': 'contrasena_documento'
            };
            
            const newFileName = `${supplierName}_${dateStr}_${typeMapping[type]}${extension}`;
            const uploadPath = path.join(invoiceDir, newFileName);

            console.log('📁 Upload paths:', {
                sourceFile: file.path,
                uploadPath: uploadPath,
                fileName: newFileName,
                type: type
            });

            // Si el archivo existe, lo eliminamos primero
            try {
                await fs.unlink(uploadPath);
                console.log('🗑️ Archivo anterior eliminado:', uploadPath);
            } catch (err) {
                console.log('ℹ️ No hay archivo anterior que eliminar');
            }

            // Asegurar que file.path sea absoluto
            const sourceFilePath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            console.log('📂 Moviendo archivo de:', sourceFilePath, 'a:', uploadPath);
            await fs.rename(sourceFilePath, uploadPath);

            // Actualizar la tabla de payments con la nueva información del documento
            const [payment] = await Payment.findOrCreate({
                where: { invoice_id: invoice.id },
                defaults: { invoice_id: invoice.id }
            });

            // Usar el mismo mapeo definido arriba
            const updateData = {
                [fieldMapping[type]]: newFileName
            };

            console.log('💾 Actualizando payment:', { paymentId: payment.id, updateData });
            await payment.update(updateData);
            console.log('✅ Payment actualizado exitosamente');

            // Actualizar el estado de la factura según el tipo de documento subido
            await invoiceController.updateInvoiceStatusAfterUpload(invoice, type, payment);

            // Registrar la acción en el log del sistema
            await SystemLog.create({
                action: 'DOCUMENT_UPLOAD',
                userId: req.user.userId,
                details: JSON.stringify({
                    invoiceId: invoice.id,
                    documentType: type,
                    fileName: newFileName
                })
            });

            // Recargar la factura con el estado actualizado
            const updatedInvoice = await Invoice.findByPk(invoice.id, {
                include: [
                    { model: Supplier, as: 'supplier' },
                    { model: User, as: 'assignedUser' },
                    { model: InvoiceState, as: 'states', include: [{ model: User, as: 'user' }] },
                    { model: Payment, as: 'payment' }
                ]
            });

            // Enviar notificación por correo al proveedor cuando se sube un documento
            try {
                console.log('📧 Enviando notificación de documento subido...');
                
                // Obtener TODOS los usuarios proveedores ACTIVOS de la factura
                const proveedorUsers = await User.findAll({
                    where: { 
                        supplier_id: updatedInvoice.supplier_id,
                        role: 'proveedor',
                        is_active: true  // ✅ Solo usuarios activos
                    },
                    include: [{ model: Supplier, as: 'supplier' }]
                });

                if (proveedorUsers.length > 0) {
                    const StatusNotificationService = require('../utils/statusNotificationService');
                    const statusService = new StatusNotificationService();
                    
                    // Usar el usuario que subió el documento como quien hizo el cambio
                    const uploaderUser = await User.findByPk(req.user.userId);
                    
                    // Crear un mensaje personalizado para documentos subidos
                    const documentTypeNames = {
                        'retention_isr': 'Retención ISR',
                        'retention_iva': 'Retención IVA',
                        'payment_proof': 'Comprobante de Pago',
                        'password_file': 'Documento de Contraseña'
                    };

                    // Notificar a TODOS los proveedores activos que se subió un documento
                    console.log(`📧 Enviando notificaciones a ${proveedorUsers.length} proveedores activos...`);
                    for (const proveedorUser of proveedorUsers) {
                        try {
                            await invoiceNotificationService.notifyDocumentUploaded(
                                updatedInvoice, 
                                proveedorUser, 
                                uploaderUser, 
                                type, 
                                documentTypeNames[type] || type
                            );
                            console.log('✅ Notificación enviada al proveedor:', proveedorUser.email);
                        } catch (error) {
                            console.error(`❌ Error enviando notificación a ${proveedorUser.email}:`, error);
                        }
                    }
                } else {
                    console.log('⚠️ No se encontraron usuarios proveedores activos para enviar notificación');
                }
            } catch (notificationError) {
                console.error('❌ Error enviando notificación de documento subido:', notificationError);
                // No fallar la operación principal
            }

            res.json({
                message: 'Documento subido correctamente',
                invoice: updatedInvoice
            });

        } catch (error) {
            // Si hay un error, intentamos limpiar el archivo temporal
            if (req.file && req.file.path) {
                try {
                    const sourceFilePath = path.isAbsolute(req.file.path) ? req.file.path : path.join(process.cwd(), req.file.path);
                    await fs.unlink(sourceFilePath);
                } catch (err) {
                    // Ignoramos errores al limpiar
                }
            }
            next(error);
        }
    },

    // Método para reemplazar documentos existentes
    async replaceDocument(req, res, next) {
        try {
            const { id, type } = req.params;
            const file = req.file;

            console.log(`🔄 ReplaceDocument request:`, {
                invoiceId: id,
                documentType: type,
                hasFile: !!file,
                fileName: file?.originalname,
                fileSize: file?.size
            });

            if (!file) {
                console.log(`❌ No file provided`);
                return res.status(400).json({
                    error: 'No se ha proporcionado ningún archivo',
                    code: 'NO_FILE_PROVIDED'
                });
            }

            const validTypes = ['retention_isr', 'retention_iva', 'payment_proof', 'password_file'];
            if (!validTypes.includes(type)) {
                console.log(`❌ Invalid document type: ${type}`);
                return res.status(400).json({
                    error: 'Tipo de documento no válido',
                    code: 'INVALID_DOCUMENT_TYPE'
                });
            }

            // Buscar el payment existente
            const payment = await Payment.findOne({
                where: { invoice_id: parseInt(id) }
            });

            if (!payment) {
                console.log(`❌ No payment found for invoice ${id}`);
                return res.status(404).json({
                    error: 'No hay información de pago para esta factura',
                    code: 'PAYMENT_NOT_FOUND'
                });
            }

            console.log(`✅ Payment found:`, {
                paymentId: payment.id,
                invoiceId: payment.invoice_id
            });

            // Mapear los tipos a los campos correctos de la base de datos
            const fieldMapping = {
                'retention_isr': 'isr_retention_file',
                'retention_iva': 'iva_retention_file',
                'payment_proof': 'payment_proof_file',
                'password_file': 'password_file'
            };

            console.log(`🔍 Checking field mapping:`, {
                type: type,
                field: fieldMapping[type],
                paymentFields: {
                    isr_retention_file: payment.isr_retention_file,
                    iva_retention_file: payment.iva_retention_file,
                    payment_proof_file: payment.payment_proof_file,
                    password_file: payment.password_file
                }
            });

            // Verificar que existe un archivo previo
            const currentFileName = payment[fieldMapping[type]];
            if (!currentFileName) {
                console.log(`❌ No previous file found for type ${type}`);
                return res.status(404).json({
                    error: 'No existe un archivo previo para reemplazar',
                    code: 'NO_PREVIOUS_FILE'
                });
            }

            console.log(`✅ Previous file found: ${currentFileName}`);

            // Obtener información del proveedor para generar el nombre del archivo
            const invoiceWithSupplier = await Invoice.findByPk(parseInt(id), {
                include: [{ model: Supplier, as: 'supplier' }]
            });

            if (!invoiceWithSupplier || !invoiceWithSupplier.supplier) {
                return res.status(400).json({
                    error: 'No se puede obtener información del proveedor',
                    code: 'SUPPLIER_NOT_FOUND'
                });
            }

            // Crear directorio de uploads si no existe
            const invoiceDir = await createInvoiceFolder(
                invoiceWithSupplier.supplier.business_name,
                invoiceWithSupplier.number
            );

            const originalName = file.originalname;
            const extension = path.extname(originalName);
            
            // Generar nombre con formato: proveedor_fecha_tipoDocumento
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
            const supplierName = invoiceWithSupplier.supplier.business_name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remover acentos
                .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres especiales con _
                .toLowerCase();
            
            // Mapear tipos a nombres más descriptivos
            const typeMapping = {
                'retention_isr': 'retencion_isr',
                'retention_iva': 'retencion_iva',
                'payment_proof': 'comprobante_pago'
            };
            
            const newFileName = `${supplierName}_${dateStr}_${typeMapping[type]}${extension}`;
            const uploadPath = path.join(invoiceDir, newFileName);
            
            // Para buscar el archivo anterior, necesitamos construir su path
            const oldFileDir = await createInvoiceFolder(
                invoiceWithSupplier.supplier.business_name,
                invoiceWithSupplier.number
            );
            const oldFilePath = path.join(oldFileDir, currentFileName);

            console.log('🔄 Reemplazando archivo:', {
                oldFile: currentFileName,
                newFile: newFileName,
                type: type
            });

            // Eliminar el archivo anterior si existe
            try {
                await fs.unlink(oldFilePath);
                console.log('🗑️ Archivo anterior eliminado:', oldFilePath);
            } catch (err) {
                console.log('⚠️ No se pudo eliminar archivo anterior:', err.message);
            }

            // Mover el nuevo archivo
            const sourceFilePath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            await fs.rename(sourceFilePath, uploadPath);

            // Actualizar la base de datos
            const updateData = {
                [fieldMapping[type]]: newFileName
            };

            await payment.update(updateData);

            // Recargar el payment con los datos actualizados para verificar completitud
            const updatedPayment = await Payment.findOne({
                where: { invoice_id: parseInt(id) }
            });
            
            // Verificar si después del reemplazo todos los documentos están completos
            console.log('🔍 Verificando estado después del reemplazo...');
            const allDocumentsComplete = updatedPayment.password_file && 
                                       updatedPayment.isr_retention_file && 
                                       updatedPayment.iva_retention_file && 
                                       updatedPayment.payment_proof_file;
            
            console.log('📋 Estado de documentos después del reemplazo:', {
                password_file: !!updatedPayment.password_file,
                isr_retention_file: !!updatedPayment.isr_retention_file,
                iva_retention_file: !!updatedPayment.iva_retention_file,
                payment_proof_file: !!updatedPayment.payment_proof_file,
                allComplete: allDocumentsComplete
            });

            // Obtener el estado actual de la factura
            const currentStatus = invoiceWithSupplier.status;
            let targetStatus;
            let statusChangeReason;
            
            if (allDocumentsComplete) {
                targetStatus = 'proceso_completado';
                statusChangeReason = `Documento ${type} reemplazado - proceso completado automáticamente`;
                
                // Actualizar fecha de completado
                await updatedPayment.update({
                    completion_date: new Date()
                });
                
                console.log('✅ Todos los documentos están completos - marcando como completado');
            } else {
                targetStatus = 'en_proceso';
                statusChangeReason = `Documento ${type} reemplazado - requiere nueva revisión`;
                console.log('⚠️ Faltan documentos - marcando como en proceso');
            }
            
            // Solo cambiar el estado si es diferente
            if (currentStatus !== targetStatus) {
                // Actualizar el estado de la factura
                await invoiceWithSupplier.update({ status: targetStatus });
                
                // Crear registro de cambio de estado
                await InvoiceState.create({
                    invoice_id: invoiceWithSupplier.id,
                    from_state: currentStatus,
                    to_state: targetStatus,
                    user_id: req.user.userId,
                    timestamp: new Date(),
                    notes: statusChangeReason
                });

                console.log(`🔄 Estado cambiado: ${currentStatus} → ${targetStatus}`);

                // Enviar notificación de cambio de estado
                try {
                    await statusNotificationService.processNotification('status_change', {
                        invoice: invoiceWithSupplier,
                        fromStatus: currentStatus,
                        toStatus: targetStatus,
                        changedBy: await User.findByPk(req.user.userId),
                        supplier: invoiceWithSupplier.supplier
                    });
                    console.log('✅ Notificación de cambio de estado enviada');
                } catch (notificationError) {
                    console.error('❌ Error enviando notificación de cambio de estado:', notificationError);
                    // No fallar la operación principal
                }
            } else {
                console.log(`ℹ️ Estado no cambió (sigue siendo ${currentStatus})`);
            }

            // Registrar la acción en el log del sistema
            await SystemLog.create({
                action: 'DOCUMENT_REPLACE',
                userId: req.user.userId,
                details: JSON.stringify({
                    invoiceId: id,
                    documentType: type,
                    oldFileName: currentFileName,
                    newFileName: newFileName,
                    statusChanged: currentStatus !== targetStatus ? `${currentStatus} → ${targetStatus}` : 'No cambió'
                })
            });

            // Enviar notificación específica de reemplazo de documento
            try {
                console.log('📧 Enviando notificación de documento reemplazado...');
                
                // Obtener el usuario proveedor de la factura
                const proveedorUser = await User.findOne({
                    where: { supplier_id: invoiceWithSupplier.supplier_id },
                    include: [{ model: Supplier, as: 'supplier' }]
                });

                if (proveedorUser) {
                    // Usar el usuario que reemplazó el documento
                    const uploaderUser = await User.findByPk(req.user.userId);
                    
                    // Crear un mensaje personalizado para documentos reemplazados
                    const documentTypeNames = {
                        'retention_isr': 'Retención ISR',
                        'retention_iva': 'Retención IVA',
                        'payment_proof': 'Comprobante de Pago',
                        'password_file': 'Documento de Contraseña'
                    };

                    // Crear método específico para notificar reemplazo
                    await invoiceNotificationService.notifyDocumentReplaced(
                        invoiceWithSupplier, 
                        proveedorUser, 
                        uploaderUser, 
                        type, 
                        documentTypeNames[type] || type,
                        currentFileName,
                        newFileName
                    );
                    
                    console.log('✅ Notificación de reemplazo enviada al proveedor:', proveedorUser.email);
                } else {
                    console.log('⚠️ No se encontró usuario proveedor para enviar notificación de reemplazo');
                }
            } catch (notificationError) {
                console.error('❌ Error enviando notificación de documento reemplazado:', notificationError);
                // No fallar la operación principal
            }

            // Verificar si después del reemplazo la factura debería completarse automáticamente
            try {
                console.log('🔍 Verificando si la factura debería completarse automáticamente...');
                
                // Recargar el payment con los datos actualizados
                const updatedPayment = await Payment.findOne({
                    where: { invoice_id: parseInt(id) }
                });
                
                // Recargar la factura con los datos actualizados
                const updatedInvoice = await Invoice.findByPk(parseInt(id));
                
                const shouldComplete = await invoiceController.checkIfShouldComplete(updatedInvoice);
                
                if (shouldComplete && updatedInvoice.status !== 'proceso_completado') {
                    console.log('✅ La factura puede completarse automáticamente después del reemplazo');
                    
                    const oldStatus = updatedInvoice.status;
                    await updatedInvoice.update({ status: 'proceso_completado' });
                    
                    // Actualizar fecha de completado en payment
                    await updatedPayment.update({
                        completion_date: new Date()
                    });
                    
                    // Crear registro de cambio de estado
                    await InvoiceState.create({
                        invoice_id: updatedInvoice.id,
                        from_state: oldStatus,
                        to_state: 'proceso_completado',
                        user_id: req.user.userId,
                        timestamp: new Date(),
                        notes: 'Proceso completado automáticamente después de reemplazar documento - todos los documentos están disponibles'
                    });
                    
                    console.log('🎉 Factura completada automáticamente después del reemplazo');
                }
            } catch (autoCompleteError) {
                console.error('❌ Error en verificación automática de completado:', autoCompleteError);
                // No fallar la operación principal
            }

            res.json({
                message: 'Documento reemplazado correctamente',
                fileName: newFileName,
                type: type
            });

        } catch (error) {
            // Si hay un error, intentamos limpiar el archivo temporal
            if (req.file && req.file.path) {
                try {
                    const sourceFilePath = path.isAbsolute(req.file.path) ? req.file.path : path.join(process.cwd(), req.file.path);
                    await fs.unlink(sourceFilePath);
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
                
                // Usar la ruta completa almacenada en la base de datos
                let filePath = file.path;
                
                // Si la ruta no es absoluta, construirla relativa al directorio de uploads
                if (!path.isAbsolute(filePath)) {
                    filePath = path.join(__dirname, '../uploads', filePath);
                }
                
                try {
                    await fs.access(filePath);
                    console.log('📁 Archivo encontrado:', filePath);
                    res.download(filePath, file.originalName);
                } catch (error) {
                    console.error('❌ Archivo no encontrado:', filePath);
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
                include: [{ 
                    model: Invoice, 
                    as: 'Invoice', 
                    attributes: ['number', 'supplier_id'],
                    include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }]
                }]
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
                // Buscar archivo en nueva estructura o estructura antigua
                const filePath = await findDocumentPath(
                    payment.Invoice.supplier.business_name,
                    payment.Invoice.number,
                    payment.isr_retention_file
                );
                
                const filename = `retencion-isr-${payment.Invoice.number}.pdf`;
                res.download(filePath, filename);
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
                include: [{ 
                    model: Invoice, 
                    as: 'Invoice', 
                    attributes: ['number', 'supplier_id'],
                    include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }]
                }]
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
                // Buscar archivo en nueva estructura o estructura antigua
                const filePath = await findDocumentPath(
                    payment.Invoice.supplier.business_name,
                    payment.Invoice.number,
                    payment.iva_retention_file
                );
                
                const filename = `retencion-iva-${payment.Invoice.number}.pdf`;
                res.download(filePath, filename);
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
                include: [{ 
                    model: Invoice, 
                    as: 'Invoice', 
                    attributes: ['number', 'supplier_id'],
                    include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }]
                }]
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
                // Buscar archivo en nueva estructura o estructura antigua
                const filePath = await findDocumentPath(
                    payment.Invoice.supplier.business_name,
                    payment.Invoice.number,
                    payment.payment_proof_file
                );
                
                const filename = `comprobante-pago-${payment.Invoice.number}.pdf`;
                res.download(filePath, filename);
            } catch (error) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
        } catch (error) {
            console.error('Error al descargar comprobante:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async downloadPasswordFile(req, res) {
        try {
            const { id } = req.params;
            const payment = await Payment.findOne({ 
                where: { invoice_id: parseInt(id) },
                include: [{ 
                    model: Invoice, 
                    as: 'Invoice', 
                    attributes: ['number', 'supplier_id'],
                    include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }]
                }]
            });

            if (!payment || !payment.password_file) {
                return res.status(404).json({ error: 'Documento de contraseña no disponible' });
            }

            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (payment.Invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'No tiene permisos para descargar este documento' });
                }
            }

            try {
                // Buscar archivo en nueva estructura o estructura antigua
                const filePath = await findDocumentPath(
                    payment.Invoice.supplier.business_name,
                    payment.Invoice.number,
                    payment.password_file
                );
                
                const filename = `documento-contrasena-${payment.Invoice.number}.pdf`;
                res.download(filePath, filename);
            } catch (error) {
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
        } catch (error) {
            console.error('Error al descargar documento de contraseña:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Función para visualizar archivos originales de la factura
    async viewInvoiceFile(req, res) {
        try {
            const { id, filename } = req.params;
            console.log(`🔍 ViewInvoiceFile request: id=${id}, filename=${filename}`);
            
            const invoice = await Invoice.findByPk(parseInt(id), {
                include: [{
                    model: Supplier,
                    as: 'supplier', // Usar el alias correcto
                    attributes: ['business_name', 'nit']
                }]
            });

            if (!invoice) {
                console.log(`❌ Factura no encontrada: ${id}`);
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            console.log(`📄 Factura encontrada: ${invoice.number}, Proveedor: ${invoice.supplier.business_name}`);
            console.log(`📁 Archivos uploaded_files:`, invoice.uploaded_files);

            // Buscar el archivo en uploaded_files
            const file = invoice.uploaded_files?.find(f => f.filename === filename);
            
            if (!file) {
                console.log(`❌ Archivo no encontrado en uploaded_files: ${filename}`);
                console.log(`📋 Archivos disponibles:`, invoice.uploaded_files?.map(f => f.filename));
                return res.status(404).json({ error: 'Archivo no encontrado' });
            }

            console.log(`✅ Archivo encontrado en BD:`, file);

            try {
                // Usar findDocumentPath para buscar en la estructura correcta
                console.log(`🔍 Buscando archivo físico...`);
                const filePath = await findDocumentPath(
                    invoice.supplier.business_name,
                    invoice.number,
                    file.filename
                );

                console.log(`📂 Ruta del archivo encontrada: ${filePath}`);

                // Verificar si el archivo está comprimido
                if (filePath.endsWith('.gz')) {
                    console.log(`📦 Archivo comprimido detectado, descomprimiendo...`);
                    // Leer y descomprimir el archivo
                    const compressedData = await fs.readFile(filePath);
                    const decompressedData = zlib.gunzipSync(compressedData);
                    
                    console.log(`✅ Archivo descomprimido exitosamente, tamaño: ${decompressedData.length} bytes`);
                    
                    // Configurar headers para visualización
                    res.setHeader('Content-Type', file.mimetype || 'application/pdf');
                    res.setHeader('Content-Disposition', 'inline; filename="' + file.originalName + '"');
                    res.setHeader('Content-Length', decompressedData.length);
                    
                    // Enviar el archivo descomprimido
                    res.send(decompressedData);
                } else {
                    console.log(`📄 Archivo sin comprimir, enviando directamente...`);
                    // Configurar headers para visualización
                    res.setHeader('Content-Type', file.mimetype || 'application/pdf');
                    res.setHeader('Content-Disposition', 'inline; filename="' + file.originalName + '"');
                    
                    // Enviar el archivo
                    res.sendFile(path.resolve(filePath));
                }
                
            } catch (error) {
                console.error('❌ Error buscando archivo:', error);
                console.error('❌ Stack trace:', error.stack);
                return res.status(404).json({ 
                    error: 'Archivo no encontrado en el servidor',
                    details: error.message
                });
            }
            
        } catch (error) {
            console.error('❌ Error al visualizar archivo:', error);
            console.error('❌ Stack trace:', error.stack);
            res.status(500).json({ 
                error: 'Error interno del servidor',
                details: error.message
            });
        }
    },

    // Función para descargar archivos específicos de la factura
    async downloadInvoiceFile(req, res) {
        try {
            const { id, filename } = req.params;
            const invoice = await Invoice.findByPk(parseInt(id), {
                include: [{
                    model: Supplier,
                    as: 'supplier', // Usar el alias correcto
                    attributes: ['business_name', 'nit']
                }]
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            // Buscar el archivo en uploaded_files
            const file = invoice.uploaded_files?.find(f => f.filename === filename);
            
            if (!file) {
                return res.status(404).json({ error: 'Archivo no encontrado' });
            }

            try {
                // Usar findDocumentPath para buscar en la estructura correcta
                const filePath = await findDocumentPath(
                    invoice.supplier.business_name,
                    invoice.number,
                    file.filename
                );

                // Verificar si el archivo está comprimido
                if (filePath.endsWith('.gz')) {
                    // Leer y descomprimir el archivo
                    const compressedData = await fs.readFile(filePath);
                    const decompressedData = zlib.gunzipSync(compressedData);
                    
                    // Configurar headers para descarga
                    res.setHeader('Content-Type', file.mimetype || 'application/pdf');
                    res.setHeader('Content-Disposition', 'attachment; filename="' + file.originalName + '"');
                    
                    // Enviar el archivo descomprimido
                    res.send(decompressedData);
                } else {
                    // Descargar archivo sin comprimir
                    res.download(filePath, file.originalName);
                }
                
            } catch (error) {
                console.error('Error buscando archivo para descarga:', error);
                return res.status(404).json({ error: 'Archivo no encontrado en el servidor' });
            }
            
        } catch (error) {
            console.error('Error al descargar archivo:', error);
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

            // Solo usuarios con permiso de eliminar facturas
            if (!req.user.hasPermission('facturas.eliminar')) {
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

    // Permite al proveedor reemplazar uno de los archivos originales que subió
    async replaceOriginalFile(req, res, next) {
        try {
            const { id } = req.params;
            const file = req.file;
            const originalFilename = req.body.original_filename; // opcional: nombre del archivo a reemplazar

            console.log('🔄 replaceOriginalFile request:', { invoiceId: id, hasFile: !!file, originalFilename });

            if (!file) {
                return res.status(400).json({ error: 'No se ha proporcionado ningún archivo', code: 'NO_FILE_PROVIDED' });
            }

            const invoice = await Invoice.findByPk(parseInt(id), { include: [{ model: Supplier, as: 'supplier' }] });
            if (!invoice) return res.status(404).json({ error: 'Factura no encontrada', code: 'INVOICE_NOT_FOUND' });

            // Si el usuario es proveedor, verificar que pertenece al supplier
            if (req.user.role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                if (invoice.supplier_id !== user.supplier_id) {
                    return res.status(403).json({ error: 'Acceso denegado', code: 'ACCESS_DENIED' });
                }
            }

            // Asegurarse de tener la carpeta de la factura
            const invoiceDir = await createInvoiceFolder(invoice.supplier.business_name, invoice.number);

            // Si proporcionaron originalFilename, buscar y reemplazar ese archivo
            let replacedFileRecord = null;
            if (originalFilename && invoice.uploaded_files && invoice.uploaded_files.length > 0) {
                replacedFileRecord = invoice.uploaded_files.find(f => f.filename === originalFilename || f.originalName === originalFilename);
            }

            // Si no encontraron el archivo a reemplazar, reemplazar el primero si existe
            if (!replacedFileRecord && invoice.uploaded_files && invoice.uploaded_files.length > 0) {
                replacedFileRecord = invoice.uploaded_files[0];
            }

            // Si no hay archivos originales en BD, añadiremos el nuevo como nuevo uploaded_file
            const extension = path.extname(file.originalname) || '.pdf';
            const uniqueName = `${invoice.supplier.business_name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.round(Math.random()*1e6)}${extension}`;
            const destinationPath = path.join(invoiceDir, uniqueName);

            const sourceFilePath = path.isAbsolute(file.path) ? file.path : path.join(process.cwd(), file.path);
            await fs.rename(sourceFilePath, destinationPath);

            if (replacedFileRecord) {
                // Eliminar archivo anterior si existe en FS
                try {
                    const oldFilePath = path.join(invoiceDir, replacedFileRecord.filename);
                    await fs.unlink(oldFilePath);
                    console.log('🗑️ Archivo original anterior eliminado:', oldFilePath);
                } catch (err) {
                    console.log('⚠️ No se pudo eliminar archivo anterior (puede que no exista):', err.message);
                }

                // Actualizar el registro en uploaded_files
                const newUploadedFiles = invoice.uploaded_files.map(f => {
                    if (f.filename === replacedFileRecord.filename) {
                        return {
                            ...f,
                            originalName: file.originalname,
                            filename: uniqueName,
                            path: path.relative(path.join(__dirname, '..'), destinationPath),
                            size: file.size,
                            mimetype: file.mimetype,
                            uploadedAt: new Date()
                        };
                    }
                    return f;
                });

                await invoice.update({ uploaded_files: newUploadedFiles });

                // Log y notificación
                await SystemLog.create({
                    action: 'ORIGINAL_FILE_REPLACE',
                    userId: req.user.userId,
                    details: JSON.stringify({ invoiceId: id, oldFile: replacedFileRecord.filename, newFile: uniqueName })
                });

                // Notificar proveedor del reemplazo (reutiliza notifyDocumentReplaced con tipo 'original')
                try {
                    const proveedorUser = await User.findOne({ where: { supplier_id: invoice.supplier_id } });
                    if (proveedorUser) {
                        await invoiceNotificationService.notifyDocumentReplaced(
                            invoice,
                            proveedorUser,
                            await User.findByPk(req.user.userId),
                            'original',
                            'Factura Original',
                            replacedFileRecord.filename,
                            uniqueName
                        );
                    }
                } catch (notifyErr) {
                    console.error('❌ Error enviando notificación de reemplazo original:', notifyErr);
                }

                return res.json({ message: 'Archivo original reemplazado', filename: uniqueName, invoice: await invoice.reload() });
            } else {
                // No había archivo previo, añade como nuevo
                const newFileRecord = {
                    originalName: file.originalname,
                    filename: uniqueName,
                    path: path.relative(path.join(__dirname, '..'), destinationPath),
                    size: file.size,
                    mimetype: file.mimetype,
                    docType: 'factura',
                    uploadedAt: new Date()
                };

                const newUploadedFiles = (invoice.uploaded_files || []).concat([newFileRecord]);
                await invoice.update({ uploaded_files: newUploadedFiles });

                await SystemLog.create({
                    action: 'ORIGINAL_FILE_ADD',
                    userId: req.user.userId,
                    details: JSON.stringify({ invoiceId: id, newFile: uniqueName })
                });

                return res.json({ message: 'Archivo original añadido', filename: uniqueName, invoice: await invoice.reload() });
            }

        } catch (error) {
            // limpieza
            if (req.file && req.file.path) {
                try { await fs.unlink(req.file.path) } catch (e) {}
            }
            next(error);
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
                return res.json({ invoices: [], total: 0 });
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
                include: [
                    { 
                        model: Payment, 
                        as: 'payment', 
                        required: false 
                    },
                    {
                        model: Supplier,
                        as: 'supplier',
                        attributes: ['id', 'business_name', 'nit']
                    }
                ],
                order: [['updated_at', 'DESC']]
            });
    
            const groupedInvoices = [];
            let totalDocuments = 0;
            
            invoices.forEach(invoice => {
                const documents = [];
                
                if (invoice.payment) {
                    if (invoice.payment.isr_retention_file) {
                        documents.push({
                            id: `isr-${invoice.id}`,
                            type: 'retention_isr',
                            title: 'Retención ISR',
                            filename: invoice.payment.isr_retention_file,
                            date: invoice.payment.created_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-retention-isr`
                        });
                        totalDocuments++;
                    }
    
                    if (invoice.payment.iva_retention_file) {
                        documents.push({
                            id: `iva-${invoice.id}`,
                            type: 'retention_iva',
                            title: 'Retención IVA',
                            filename: invoice.payment.iva_retention_file,
                            date: invoice.payment.created_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-retention-iva`
                        });
                        totalDocuments++;
                    }
    
                    if (invoice.payment.payment_proof_file && invoice.status === 'proceso_completado') {
                        documents.push({
                            id: `proof-${invoice.id}`,
                            type: 'payment_proof',
                            title: 'Comprobante de Pago',
                            filename: invoice.payment.payment_proof_file,
                            date: invoice.payment.completion_date || invoice.payment.updated_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-payment-proof`
                        });
                        totalDocuments++;
                    }

                    if (invoice.payment.password_file && ['pago_realizado', 'proceso_completado'].includes(invoice.status)) {
                        documents.push({
                            id: `password-${invoice.id}`,
                            type: 'password_file',
                            title: 'Archivo de Contraseña',
                            filename: invoice.payment.password_file,
                            date: invoice.payment.updated_at,
                            downloadUrl: `/api/invoices/${invoice.id}/download-password-file`
                        });
                        totalDocuments++;
                    }
                }
                
                // Solo incluir facturas que tengan al menos un documento
                if (documents.length > 0) {
                    groupedInvoices.push({
                        id: invoice.id,
                        number: invoice.number,
                        amount: parseFloat(invoice.amount),
                        description: invoice.description,
                        status: invoice.status,
                        supplier: invoice.supplier,
                        updated_at: invoice.updated_at,
                        documents: documents,
                        documentsCount: documents.length
                    });
                }
            });
    
            res.json({ 
                invoices: groupedInvoices,
                total: totalDocuments,
                invoicesCount: groupedInvoices.length,
                summary: {
                    isr_count: groupedInvoices.reduce((acc, inv) => acc + inv.documents.filter(d => d.type === 'retention_isr').length, 0),
                    iva_count: groupedInvoices.reduce((acc, inv) => acc + inv.documents.filter(d => d.type === 'retention_iva').length, 0),
                    proof_count: groupedInvoices.reduce((acc, inv) => acc + inv.documents.filter(d => d.type === 'payment_proof').length, 0)
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

            // Función auxiliar para calcular tiempo transcurrido
            const getTimeAgo = (date) => {
                const now = new Date();
                const diffMs = now - new Date(date);
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
            
                if (diffDays > 0) return `${diffDays}d`;
                if (diffHours > 0) return `${diffHours}h`;
                if (diffMinutes > 0) return `${diffMinutes}m`;
                return 'Ahora';
            };
    
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
                    timeAgo: getTimeAgo(invoice.created_at),
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
                include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }],
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
                    timeAgo: getTimeAgo(invoice.updated_at),
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
                include: [{ model: Supplier, as: 'supplier', attributes: ['business_name'] }],
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
                    timeAgo: getTimeAgo(invoice.updated_at),
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
    
            // Solo manejamos PDFs ahora
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
            }
    
            // Si no es PDF, retornar archivo sin cambios
            const stats = await fs.stat(inputPath);
            return {
                filename: path.basename(inputPath),
                path: inputPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Error al comprimir archivo PDF:', error);
            const stats = await fs.stat(file.path);
            return {
                filename: path.basename(file.path),
                path: file.path,
                size: stats.size
            };
        }
    },
    
    async compressFileInPlace(filePath, mimetype) {
        try {
            const inputPath = filePath;
            const ext = path.extname(inputPath);
            const baseName = path.basename(inputPath, ext);
            const dirName = path.dirname(inputPath);
            
            // DESHABILITAR COMPRESIÓN DE PDFs - Mantenemos archivos originales
            // La compresión estaba corrompiendo los PDFs
            const stats = await fs.stat(inputPath);
            return {
                filename: path.basename(inputPath),
                path: inputPath,
                size: stats.size
            };
        } catch (error) {
            console.error('Error al procesar archivo:', error);
            // Si hay error, retornar archivo original
            const stats = await fs.stat(filePath);
            return {
                filename: path.basename(filePath),
                path: filePath,
                size: stats.size
            };
        }
    },
    
    async autoAssignInvoice() {
        try {
            // Buscar ÚNICAMENTE trabajadores de contaduría activos
            const workers = await User.findAll({
                where: { 
                    role: 'trabajador_contaduria',
                    is_active: true 
                }
            });
    
            // Si no hay trabajadores disponibles, no asignar a nadie
            // Los administradores NO deben recibir asignaciones automáticas
            if (workers.length === 0) {
                console.warn('No hay trabajadores de contaduría disponibles para asignación automática');
                return null;
            }
    
            // Calcular carga de trabajo para cada trabajador
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
    
            // Asignar al trabajador con menor carga de trabajo
            const selectedWorker = workersWithCount.reduce((min, current) => 
                current.count < min.count ? current : min
            ).worker;
    
            console.log(`Auto-asignando factura a trabajador: ${selectedWorker.name} (${selectedWorker.email}) con ${workersWithCount.find(w => w.worker.id === selectedWorker.id).count} facturas pendientes`);
            return selectedWorker.id;
        } catch (error) {
            console.error('Error en auto-asignación:', error);
            return null;
        }
    },

    async getDashboardStats(req, res) {
        try {
            const { role } = req.user;
            let whereClause = {};
            
            // Filtrar por rol del usuario
            if (role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                whereClause.supplier_id = user.supplier_id;
            } else if (role === 'trabajador_contaduria') {
                whereClause.assigned_to = req.user.userId;
            }

            // Estadística 1: Facturas Pendientes
            const pendingCount = await Invoice.count({
                where: {
                    ...whereClause,
                    status: {
                        [Op.notIn]: ['proceso_completado', 'rechazada']
                    }
                }
            });

            // Estadística 2: Pagos Completados (último mes)
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            
            const completedPayments = await Invoice.findAll({
                where: {
                    ...whereClause,
                    status: 'proceso_completado',
                    updated_at: {
                        [Op.gte]: lastMonth
                    }
                },
                attributes: ['amount']
            });
            
            const totalCompleted = completedPayments.reduce((sum, invoice) => 
                sum + parseFloat(invoice.amount), 0
            );

            // Estadística 3: Proveedores Activos
            let suppliersCount;
            if (role === 'proveedor') {
                suppliersCount = 1; // Solo el proveedor actual
            } else {
                suppliersCount = await Supplier.count({
                    where: { is_active: true }
                });
            }

            // Calcular tendencias (comparar con mes anterior)
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            
            const previousPendingCount = await Invoice.count({
                where: {
                    ...whereClause,
                    status: {
                        [Op.notIn]: ['proceso_completado', 'rechazada']
                    },
                    created_at: {
                        [Op.between]: [twoMonthsAgo, lastMonth]
                    }
                }
            });

            const previousCompletedPayments = await Invoice.findAll({
                where: {
                    ...whereClause,
                    status: 'proceso_completado',
                    updated_at: {
                        [Op.between]: [twoMonthsAgo, lastMonth]
                    }
                },
                attributes: ['amount']
            });
            
            const previousTotal = previousCompletedPayments.reduce((sum, invoice) => 
                sum + parseFloat(invoice.amount), 0
            );

            // Calcular porcentajes de cambio
            const pendingChange = previousPendingCount > 0 
                ? ((pendingCount - previousPendingCount) / previousPendingCount * 100).toFixed(1)
                : '+100.0';

            const paymentsChange = previousTotal > 0 
                ? ((totalCompleted - previousTotal) / previousTotal * 100).toFixed(1)
                : '+100.0';

            // Crear array de estadísticas base para todos los roles
            const baseStats = [
                {
                    title: 'Facturas Pendientes',
                    value: pendingCount.toString(),
                    emoji: '⏳',
                    icon: 'mdi-clock-outline',
                    colorClass: 'warning',
                    change: `${pendingChange > 0 ? '+' : ''}${pendingChange}% vs mes anterior`,
                    trend: pendingChange > 0 ? 'up' : 'down'
                },
                {
                    title: 'Pagos Completados',
                    value: `Q${totalCompleted.toLocaleString('es-GT', { minimumFractionDigits: 0 })}`,
                    emoji: '💰',
                    icon: 'mdi-check-circle-outline',
                    colorClass: 'success',
                    change: `${paymentsChange > 0 ? '+' : ''}${paymentsChange}% vs mes anterior`,
                    trend: paymentsChange > 0 ? 'up' : 'down'
                }
            ];

            // Agregar estadísticas adicionales solo para roles no-proveedor
            if (role !== 'proveedor') {
                baseStats.push(
                    {
                        title: 'Proveedores Activos',
                        value: suppliersCount.toString(),
                        emoji: '🏢',
                        icon: 'mdi-account-outline',
                        colorClass: 'info',
                        change: `${suppliersCount} activos`,
                        trend: 'up'
                    }
                );
            }

            res.json({
                stats: baseStats,
                summary: {
                    total_invoices: await Invoice.count({ where: whereClause }),
                    user_role: role,
                    generated_at: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getInvoiceStatusStats(req, res) {
        try {
            const { role } = req.user;
            let whereClause = {};
            
            // Filtrar por rol del usuario
            if (role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                whereClause.supplier_id = user.supplier_id;
            } else if (role === 'trabajador_contaduria') {
                whereClause.assigned_to = req.user.userId;
            }

            // Contar por estado
            const statusCounts = await Invoice.findAll({
                where: whereClause,
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            const total = statusCounts.reduce((sum, item) => sum + parseInt(item.count), 0);

            // Mapear estados a nombres amigables con emojis
            const statusMapping = {
                'factura_subida': { name: 'Pendientes', emoji: '📤', class: 'pending' },
                'asignada_contaduria': { name: 'Asignadas', emoji: '👥', class: 'assigned' },
                'en_proceso': { name: 'En Proceso', emoji: '⚙️', class: 'processing' },
                'contrasena_generada': { name: 'Con Contraseña', emoji: '🔐', class: 'password' },
                'retencion_isr_generada': { name: 'Con ISR', emoji: '📊', class: 'isr' },
                'retencion_iva_generada': { name: 'Con IVA', emoji: '📈', class: 'iva' },
                'pago_realizado': { name: 'Pagadas', emoji: '💳', class: 'paid' },
                'proceso_completado': { name: 'Completadas', emoji: '✅', class: 'completed' },
                'rechazada': { name: 'Rechazadas', emoji: '❌', class: 'rejected' }
            };

            const formattedStatus = statusCounts.map(item => {
                const mapping = statusMapping[item.status] || { 
                    name: item.status, 
                    emoji: '📄', 
                    class: 'default' 
                };
                
                return {
                    status: item.status,
                    name: mapping.name,
                    emoji: mapping.emoji,
                    count: parseInt(item.count),
                    percentage: total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0,
                    class: mapping.class
                };
            });

            // Agregar estados faltantes con count 0
            Object.keys(statusMapping).forEach(status => {
                if (!formattedStatus.find(item => item.status === status)) {
                    const mapping = statusMapping[status];
                    formattedStatus.push({
                        status,
                        name: mapping.name,
                        emoji: mapping.emoji,
                        count: 0,
                        percentage: 0,
                        class: mapping.class
                    });
                }
            });

            // Ordenar por count descendente
            formattedStatus.sort((a, b) => b.count - a.count);

            res.json({
                invoiceStatus: formattedStatus.slice(0, 6), // Top 6 estados
                summary: {
                    total_invoices: total,
                    most_common_status: formattedStatus[0]?.name || 'Ninguno',
                    user_role: role
                }
            });
        } catch (error) {
            console.error('Error getting invoice status stats:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getPaymentTrends(req, res) {
        try {
            const { role } = req.user;
            let whereClause = {};
            
            // Filtrar por rol del usuario
            if (role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                whereClause.supplier_id = user.supplier_id;
            } else if (role === 'trabajador_contaduria') {
                whereClause.assigned_to = req.user.userId;
            }

            // Obtener últimos 6 meses
            const trends = [];
            const now = new Date();
            
            for (let i = 5; i >= 0; i--) {
                const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
                
                const monthlyPayments = await Invoice.findAll({
                    where: {
                        ...whereClause,
                        status: 'proceso_completado',
                        updated_at: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    attributes: ['amount', 'updated_at']
                });

                const monthTotal = monthlyPayments.reduce((sum, invoice) => 
                    sum + parseFloat(invoice.amount), 0
                );

                trends.push({
                    month: startDate.toLocaleDateString('es-GT', { 
                        year: 'numeric', 
                        month: 'short' 
                    }),
                    amount: monthTotal,
                    count: monthlyPayments.length,
                    formatted_amount: `Q${monthTotal.toLocaleString('es-GT')}`
                });
            }

            res.json({
                trends,
                summary: {
                    total_6_months: trends.reduce((sum, month) => sum + month.amount, 0),
                    average_monthly: trends.reduce((sum, month) => sum + month.amount, 0) / 6,
                    highest_month: trends.reduce((max, month) => 
                        month.amount > max.amount ? month : max, trends[0]
                    ),
                    user_role: role
                }
            });
        } catch (error) {
            console.error('Error getting payment trends:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getNotifications(req, res) {
        try {
            const { role } = req.user;
            
            // Por ahora, retornamos notificaciones mock básicas
            // En el futuro se puede implementar un sistema completo de notificaciones
            const mockNotifications = [
                {
                    id: 1,
                    type: 'invoice_uploaded',
                    title: 'Nueva factura subida',
                    message: 'Se ha subido una nueva factura para procesamiento',
                    created_at: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos atrás
                    read: false
                },
                {
                    id: 2,
                    type: 'payment_completed',
                    title: 'Pago completado',
                    message: 'El pago de la factura #12345 ha sido procesado exitosamente',
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 horas atrás
                    read: false
                },
                {
                    id: 3,
                    type: 'system',
                    title: 'Mantenimiento programado',
                    message: 'El sistema tendrá mantenimiento el próximo domingo',
                    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 día atrás
                    read: true
                }
            ];

            res.json({
                notifications: mockNotifications,
                total: mockNotifications.length,
                unread: mockNotifications.filter(n => !n.read).length
            });
        } catch (error) {
            console.error('Error getting notifications:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async getRecentInvoices(req, res) {
        try {
            const { role } = req.user;
            const { limit = 8 } = req.query;
            let whereClause = {};
            
            // Función auxiliar para formatear estados
            const formatStatus = (status) => {
                const statusMap = {
                    'factura_subida': 'Pendiente',
                    'asignada_contaduria': 'Asignada',
                    'en_proceso': 'En Proceso',
                    'contrasena_generada': 'Contraseña Lista',
                    'retencion_isr_generada': 'ISR Generado',
                    'retencion_iva_generada': 'IVA Generado',
                    'pago_realizado': 'Pagado',
                    'proceso_completado': 'Completada',
                    'rechazada': 'Rechazada'
                };
                return statusMap[status] || status;
            };
            
            // Filtrar por rol del usuario
            if (role === 'proveedor') {
                const user = await User.findByPk(req.user.userId);
                whereClause.supplier_id = user.supplier_id;
            } else if (role === 'trabajador_contaduria') {
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
                limit: parseInt(limit)
            });

            const formattedInvoices = invoices.map(invoice => ({
                id: invoice.id,
                number: invoice.number,
                supplier: invoice.supplier.business_name,
                amount: parseFloat(invoice.amount),
                status: formatStatus(invoice.status),
                date: (function(dt){
                    try {
                        const fmt = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' });
                        return fmt.format(new Date(dt));
                    } catch (e) {
                        return new Date(dt).toISOString().split('T')[0];
                    }
                })(invoice.created_at),
                rawStatus: invoice.status,
                assigned_to: invoice.assignedUser?.name || 'Sin asignar',
                canEdit: role === 'proveedor' && invoice.status === 'factura_subida',
                detailUrl: `/invoices/${invoice.id}`
            }));

            res.json({
                invoices: formattedInvoices,
                summary: {
                    total: formattedInvoices.length,
                    total_amount: formattedInvoices.reduce((sum, inv) => sum + inv.amount, 0),
                    user_role: role
                }
            });
        } catch (error) {
            console.error('Error getting recent invoices:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Método auxiliar para formatear estados
    formatStatus(status) {
        const statusMap = {
            'factura_subida': 'Pendiente',
            'asignada_contaduria': 'Asignada',
            'en_proceso': 'En Proceso',
            'contrasena_generada': 'Contraseña Lista',
            'retencion_isr_generada': 'ISR Generado',
            'retencion_iva_generada': 'IVA Generado',
            'pago_realizado': 'Pagado',
            'proceso_completado': 'Completada',
            'rechazada': 'Rechazada'
        };
        return statusMap[status] || status;
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
    },

    async getPendingInvoices(req, res) {
        try {
            if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
                return res.status(403).json({ error: 'Solo contaduría puede acceder' });
            }

            // Función auxiliar para calcular tiempo transcurrido
            const getTimeAgo = (date) => {
                const now = new Date();
                const diffMs = now - new Date(date);
                const diffMinutes = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffHours / 24);
            
                if (diffDays > 0) return `${diffDays}d`;
                if (diffHours > 0) return `${diffHours}h`;
                if (diffMinutes > 0) return `${diffMinutes}m`;
                return 'Ahora';
            };
    
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
                timeAgo: getTimeAgo(invoice.created_at),
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
    },

    // Marcar una notificación como leída
    markNotificationAsRead: async (req, res) => {
        try {
            const { id } = req.params;
            
            // En un sistema real, aquí actualizarías la base de datos
            // Por ahora retornamos éxito
            res.json({
                success: true,
                message: 'Notificación marcada como leída',
                notificationId: id
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Marcar todas las notificaciones como leídas
    markAllNotificationsAsRead: async (req, res) => {
        try {
            // En un sistema real, aquí actualizarías todas las notificaciones del usuario
            // Por ahora retornamos éxito
            res.json({
                success: true,
                message: 'Todas las notificaciones marcadas como leídas',
                userId: req.user.id
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Actualizar el estado de la factura después de subir documentos
    updateInvoiceStatusAfterUpload: async (invoice, documentType, payment) => {
        try {
            let newStatus = null;
            let statusNotes = null;

            // Recargar payment con datos actualizados
            await payment.reload();

            // Obtener información del supplier con su tipo de proveedor
            const invoiceWithSupplier = await Invoice.findByPk(invoice.id, {
                include: [{ model: Supplier, as: 'supplier' }]
            });

            if (!invoiceWithSupplier || !invoiceWithSupplier.supplier) {
                console.error('⚠️ No se pudo obtener información del proveedor');
                return;
            }

            const tipoProveedor = invoiceWithSupplier.supplier.tipo_proveedor;
            
            console.log('📋 Verificando documentos para tipo de proveedor:', {
                tipoProveedor,
                documentType,
                invoiceId: invoice.id
            });

            // Verificar si todos los documentos REQUERIDOS están completos según el tipo de proveedor
            const allDocumentsComplete = invoiceDocumentService.isInvoiceComplete(payment, tipoProveedor);

            const requiredDocs = invoiceDocumentService.getRequiredDocuments(tipoProveedor);
            const missingDocs = invoiceDocumentService.getMissingDocuments(payment, tipoProveedor);

            console.log('📋 Estado de documentos:', {
                tipoProveedor,
                requiredDocs,
                missingDocs,
                password_file: !!payment.password_file,
                isr_retention_file: !!payment.isr_retention_file,
                iva_retention_file: !!payment.iva_retention_file,
                payment_proof_file: !!payment.payment_proof_file,
                allComplete: allDocumentsComplete,
                currentStatus: invoice.status
            });

            // Si todos los documentos REQUERIDOS están completos, ir a proceso_completado
            if (allDocumentsComplete) {
                // Validar que la factura tenga un monto válido antes de completar
                if (!invoice.amount || parseFloat(invoice.amount) <= 0) {
                    console.warn('⚠️ No se puede completar proceso automáticamente: monto inválido', {
                        invoiceId: invoice.id,
                        amount: invoice.amount
                    });
                    
                    // Determinar estado basado en documentos subidos y tipo de proveedor
                    newStatus = invoiceDocumentService.determineNextState(payment, tipoProveedor);
                    statusNotes = `Documentos completos para ${tipoProveedor} - Pendiente: definir monto de factura`;
                } else {
                    // Todos los documentos completos Y monto válido = proceso completado
                    newStatus = 'proceso_completado';
                    statusNotes = `Proceso completado automáticamente - todos los documentos de ${tipoProveedor} subidos`;
                    
                    // Actualizar la fecha de completado
                    await payment.update({
                        completion_date: new Date()
                    });
                }
            } else {
                // No todos los documentos están completos, determinar siguiente estado según tipo de proveedor
                newStatus = invoiceDocumentService.determineNextState(payment, tipoProveedor);
                
                // Generar nota según documento subido
                const docNames = {
                    'retention_isr': 'Retención ISR',
                    'retention_iva': 'Retención IVA',
                    'password_file': 'Archivo de contraseña',
                    'payment_proof': 'Comprobante de pago'
                };
                
                statusNotes = `${docNames[documentType] || 'Documento'} subido - Tipo proveedor: ${tipoProveedor}`;
            }

            if (newStatus && newStatus !== invoice.status) {
                console.log('🔄 Actualizando estado de factura:', {
                    invoiceId: invoice.id,
                    oldStatus: invoice.status,
                    newStatus: newStatus,
                    tipoProveedor: tipoProveedor,
                    reason: statusNotes
                });

                const oldStatus = invoice.status;

                // Actualizar el estado de la factura
                await invoice.update({ status: newStatus });

                // Crear registro en el historial de estados
                await InvoiceState.create({
                    invoice_id: invoice.id,
                    from_state: oldStatus,
                    to_state: newStatus,
                    user_id: 1, // Sistema automático
                    notes: statusNotes,
                    timestamp: new Date()
                });

                console.log('✅ Estado de factura actualizado exitosamente');

                // Enviar notificaciones de cambio de estado
                try {
                    // Obtener datos completos de la factura para notificaciones
                    const completeInvoice = await Invoice.findByPk(invoice.id, {
                        include: [
                            { model: Supplier, as: 'supplier', attributes: ['id', 'business_name', 'nit'] }
                        ]
                    });

                    // Simular objeto de usuario que hizo el cambio (sistema automático)
                    const systemUser = { id: 1, name: 'Sistema Automático', email: 'sistema@recepcionfacturas.com' };

                    await statusNotificationService.processNotification('status_change', {
                        invoice: completeInvoice,
                        fromStatus: oldStatus,
                        toStatus: newStatus,
                        changedBy: systemUser,
                        supplier: completeInvoice.supplier
                    });

                    console.log('✅ Notificaciones de cambio de estado enviadas exitosamente');
                } catch (notificationError) {
                    console.error('❌ Error enviando notificaciones de cambio de estado:', notificationError);
                    // No fallar el proceso principal
                }
            }
        } catch (error) {
            console.error('❌ Error actualizando estado de factura:', error);
            // No lanzamos el error para no interrumpir el proceso de subida
        }
    },

    // Verificar si una factura debe ser completada automáticamente
    checkIfShouldComplete: async (invoice, transaction = null) => {
        try {
            // Solo verificar si la factura no está ya completada o rechazada
            if (['proceso_completado', 'rechazada'].includes(invoice.status)) {
                return false;
            }

            // Verificar que la factura tenga un monto válido
            if (!invoice.amount || parseFloat(invoice.amount) <= 0) {
                console.log('⚠️ Factura no puede completarse: monto inválido', {
                    invoiceId: invoice.id,
                    amount: invoice.amount
                });
                return false;
            }

            // Verificar que existan todos los documentos requeridos
            const payment = await Payment.findOne({ 
                where: { invoice_id: invoice.id },
                transaction 
            });

            if (!payment) {
                console.log('⚠️ Factura no puede completarse: no hay registro de payment');
                return false;
            }

            const hasAllDocuments = payment.password_generated && 
                                  payment.isr_retention_file && 
                                  payment.iva_retention_file && 
                                  payment.payment_proof_file;

            if (hasAllDocuments) {
                console.log('✅ Factura puede ser completada automáticamente:', {
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.number,
                    currentStatus: invoice.status
                });
                return true;
            } else {
                console.log('⚠️ Factura no puede completarse: faltan documentos', {
                    invoiceId: invoice.id,
                    missing: {
                        password: !payment.password_generated,
                        isr_retention: !payment.isr_retention_file,
                        iva_retention: !payment.iva_retention_file,
                        payment_proof: !payment.payment_proof_file
                    }
                });
                return false;
            }
        } catch (error) {
            console.error('❌ Error verificando si factura debe completarse:', error);
            return false;
        }
    },

    async createZipFromFiles(files, invoiceId) {
        try {
            const AdmZip = require('adm-zip');
            const zip = new AdmZip();
            
            for (const file of files) {
                let filePath = file.path;
                
                // Si la ruta no es absoluta, construirla relativa al directorio de uploads
                if (!path.isAbsolute(filePath)) {
                    filePath = path.join(__dirname, '../uploads', filePath);
                }
                
                try {
                    await fs.access(filePath);
                    const fileData = await fs.readFile(filePath);
                    zip.addFile(file.originalName, fileData);
                    console.log('📁 Archivo agregado al ZIP:', file.originalName);
                } catch (error) {
                    console.error('❌ Error agregando archivo al ZIP:', filePath, error.message);
                }
            }
            
            // Crear directorio temporal para el ZIP
            const tempDir = path.join(__dirname, '../uploads', 'temp');
            await fs.mkdir(tempDir, { recursive: true });
            
            // Guardar el ZIP
            const zipPath = path.join(tempDir, `invoice-${invoiceId}-files.zip`);
            zip.writeZip(zipPath);
            
            console.log('📦 ZIP creado:', zipPath);
            return zipPath;
        } catch (error) {
            console.error('❌ Error creando ZIP:', error);
            throw error;
        }
    },

    /**
     * Verifica y corrige facturas con estados inconsistentes
     * Busca facturas que tienen todos los documentos pero no están en proceso_completado
     * @async
     * @function fixInconsistentInvoiceStates
     */
    fixInconsistentInvoiceStates: async () => {
        try {
            console.log('🔍 Iniciando verificación de estados inconsistentes...');
            
            // Buscar facturas que no están completadas pero podrían estarlo
            const invoicesWithPayments = await Invoice.findAll({
                where: {
                    status: {
                        [Op.not]: ['proceso_completado', 'rechazada']
                    },
                    amount: {
                        [Op.gt]: 0
                    }
                },
                include: [{
                    model: Payment,
                    as: 'payment',
                    required: true
                }]
            });

            let correctedCount = 0;

            for (const invoice of invoicesWithPayments) {
                const payment = invoice.payment;
                
                // Verificar si todos los documentos están completos
                const allDocumentsComplete = payment.password_file && 
                                           payment.isr_retention_file && 
                                           payment.iva_retention_file && 
                                           payment.payment_proof_file;

                if (allDocumentsComplete && invoice.status !== 'proceso_completado') {
                    console.log(`🔧 Corrigiendo factura ${invoice.number} (ID: ${invoice.id})`);
                    console.log(`   Estado actual: ${invoice.status} → proceso_completado`);
                    
                    const oldStatus = invoice.status;
                    
                    // Actualizar estado de la factura
                    await invoice.update({ 
                        status: 'proceso_completado'
                    });
                    
                    // Actualizar fecha de completado si no existe
                    if (!payment.completion_date) {
                        await payment.update({
                            completion_date: new Date()
                        });
                    }
                    
                    // Crear registro en el historial de estados
                    await InvoiceState.create({
                        invoice_id: invoice.id,
                        from_state: oldStatus,
                        to_state: 'proceso_completado',
                        user_id: 1, // Sistema automático
                        notes: 'Corrección automática - todos los documentos estaban completos',
                        timestamp: new Date()
                    });
                    
                    correctedCount++;
                }
            }
            
            console.log(`✅ Verificación completada. ${correctedCount} facturas corregidas.`);
            return correctedCount;
            
        } catch (error) {
            console.error('❌ Error verificando estados inconsistentes:', error);
            throw error;
        }
    },

    /**
     * Endpoint para ejecutar la corrección de estados inconsistentes
     * @async
     * @function runStateCorrection
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     */
    runStateCorrection: async (req, res) => {
        try {
            console.log('🚀 Ejecutando corrección de estados iniciada por usuario:', req.user?.userId);
            
            const correctedCount = await invoiceController.fixInconsistentInvoiceStates();
            
            res.json({
                success: true,
                message: `Corrección completada exitosamente`,
                correctedInvoices: correctedCount,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error('❌ Error en endpoint de corrección:', error);
            res.status(500).json({
                success: false,
                error: 'Error ejecutando corrección de estados',
                details: error.message
            });
        }
    },

    /**
     * Obtener información de documentos requeridos según tipo de proveedor
     */
    async getRequiredDocuments(req, res, next) {
        try {
            const { id } = req.params;
            
            const invoice = await Invoice.findByPk(id, {
                include: [
                    { model: Supplier, as: 'supplier' },
                    { model: Payment, as: 'payment' }
                ]
            });

            if (!invoice) {
                return res.status(404).json({ error: 'Factura no encontrada' });
            }

            if (!invoice.supplier) {
                return res.status(400).json({ error: 'Proveedor no encontrado' });
            }

            const tipoProveedor = invoice.supplier.tipo_proveedor;
            const required = invoiceDocumentService.getRequiredDocuments(tipoProveedor);
            const missing = invoiceDocumentService.getMissingDocuments(invoice.payment, tipoProveedor);
            const progress = invoiceDocumentService.calculateProgress(invoice.payment, tipoProveedor);

            return res.json({
                tipo_proveedor: tipoProveedor,
                required,
                missing,
                progress,
                isComplete: missing.length === 0,
                documents: {
                    password_file: !!invoice.payment?.password_file,
                    isr_retention_file: !!invoice.payment?.isr_retention_file,
                    iva_retention_file: !!invoice.payment?.iva_retention_file,
                    payment_proof_file: !!invoice.payment?.payment_proof_file
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = {
    ...invoiceController
};