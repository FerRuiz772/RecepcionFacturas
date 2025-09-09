const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const multer = require('multer');

// Configurar multer para subida de archivos individuales
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = `uploads/${req.params.id || 'temp'}`;
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${file.fieldname}-${uniqueSuffix}.${file.originalname.split('.').pop()}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF e imágenes'));
    }
  }
});

// Proteger todas las rutas
router.use(authenticate);

// ========== RUTAS BÁSICAS DE FACTURAS ==========
router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);

// Crear nueva factura (solo proveedores)
router.post('/', 
  invoiceController.uploadMiddleware, // Multer middleware para múltiples archivos
  [
    body('number').notEmpty().trim().withMessage('Número de factura requerido'),
    body('amount').isNumeric().isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
    body('description').notEmpty().trim().withMessage('Descripción requerida')
  ], 
  invoiceController.createInvoice
);

// Actualizar factura
router.put('/:id', invoiceController.updateInvoice);

// Cambiar estado de factura
router.put('/:id/status', [
  body('status').notEmpty().withMessage('Estado requerido'),
  body('notes').optional().trim()
], invoiceController.updateInvoiceStatus);

// Eliminar factura (solo super admin)
router.delete('/:id', invoiceController.deleteInvoice);

// ========== RUTAS PARA CONTADURÍA ==========

// Generar contraseña de pago
router.post('/:id/generate-password', invoiceController.generatePassword);

// Subir documentos (retenciones, comprobantes)
router.post('/:id/upload-document', 
  upload.single('file'), // Un archivo a la vez
  [
    body('type').isIn(['retention_isr', 'retention_iva', 'payment_proof'])
      .withMessage('Tipo de documento inválido')
  ],
  invoiceController.uploadDocument
);

// ========== RUTAS DE DESCARGA ==========

// Descargar facturas originales del proveedor
router.get('/:id/download-invoice', invoiceController.downloadInvoiceFiles);

// Descargar todos los archivos (ZIP)
router.get('/:id/download-all-files', invoiceController.downloadInvoiceFiles);

// Descargar retención ISR
router.get('/:id/download-retention-isr', invoiceController.downloadRetentionISR);

// Descargar retención IVA
router.get('/:id/download-retention-iva', invoiceController.downloadRetentionIVA);

// Descargar comprobante de pago
router.get('/:id/download-payment-proof', invoiceController.downloadPaymentProof);

// ========== RUTAS PARA DASHBOARD ==========

// Obtener documentos disponibles para proveedores
router.get('/dashboard/available-documents', async (req, res) => {
  try {
    if (req.user.role !== 'proveedor') {
      return res.status(403).json({ error: 'Solo proveedores pueden acceder' });
    }

    const { Invoice, Payment, Supplier, User } = require('../models');
    
    const user = await User.findByPk(req.user.userId);
    if (!user.supplier_id) {
      return res.json({ documents: [] });
    }

    const invoices = await Invoice.findAll({
      where: { 
        supplier_id: user.supplier_id,
        status: {
          [require('sequelize').Op.in]: [
            'retencion_isr_generada', 
            'retencion_iva_generada', 
            'proceso_completado'
          ]
        }
      },
      include: [{
        model: Payment,
        as: 'payment',
        required: false
      }]
    });

    const documents = [];
    
    invoices.forEach(invoice => {
      if (invoice.payment) {
        // Retención ISR disponible
        if (invoice.payment.isr_retention_file && 
            ['retencion_isr_generada', 'retencion_iva_generada', 'proceso_completado'].includes(invoice.status)) {
          documents.push({
            id: `isr-${invoice.id}`,
            type: 'retention_isr',
            title: 'Retención ISR',
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            date: invoice.payment.created_at
          });
        }

        // Retención IVA disponible
        if (invoice.payment.iva_retention_file && 
            ['retencion_iva_generada', 'proceso_completado'].includes(invoice.status)) {
          documents.push({
            id: `iva-${invoice.id}`,
            type: 'retention_iva',
            title: 'Retención IVA',
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            date: invoice.payment.created_at
          });
        }

        // Comprobante de pago disponible
        if (invoice.payment.payment_proof_file && invoice.status === 'proceso_completado') {
          documents.push({
            id: `proof-${invoice.id}`,
            type: 'payment_proof',
            title: 'Comprobante de Pago',
            invoiceId: invoice.id,
            invoiceNumber: invoice.number,
            date: invoice.payment.completion_date || invoice.payment.updated_at
          });
        }
      }
    });

    res.json({ documents });
  } catch (error) {
    console.error('Error getting available documents:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener cola de trabajo para contaduría
router.get('/dashboard/work-queue', async (req, res) => {
  try {
    if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Solo contaduría puede acceder' });
    }

    const { Invoice, Supplier } = require('../models');
    
    const workQueue = [];
    
    // Facturas que necesitan generar contraseña
    const needPassword = await Invoice.findAll({
      where: { status: 'en_proceso' },
      include: [{ model: Supplier, attributes: ['business_name'] }],
      limit: 10,
      order: [['created_at', 'ASC']]
    });

    needPassword.forEach(invoice => {
      workQueue.push({
        id: `password-${invoice.id}`,
        invoiceId: invoice.id,
        action: 'Generar Contraseña',
        supplier: invoice.Supplier.business_name,
        invoiceNumber: invoice.number,
        priority: 'Alta',
        timeAgo: getTimeAgo(invoice.created_at)
      });
    });

    // Facturas que necesitan retención ISR
    const needISR = await Invoice.findAll({
      where: { status: 'contrasena_generada' },
      include: [{ model: Supplier, attributes: ['business_name'] }],
      limit: 10,
      order: [['updated_at', 'ASC']]
    });

    needISR.forEach(invoice => {
      workQueue.push({
        id: `isr-${invoice.id}`,
        invoiceId: invoice.id,
        action: 'Subir Retención ISR',
        supplier: invoice.Supplier.business_name,
        invoiceNumber: invoice.number,
        priority: 'Media',
        timeAgo: getTimeAgo(invoice.updated_at)
      });
    });

    // Ordenar por prioridad y tiempo
    const priorityOrder = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
    workQueue.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    res.json({ tasks: workQueue.slice(0, 15) });
  } catch (error) {
    console.error('Error getting work queue:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener facturas pendientes para contaduría
router.get('/dashboard/pending-invoices', async (req, res) => {
  try {
    if (!['admin_contaduria', 'trabajador_contaduria', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Solo contaduría puede acceder' });
    }

    const { Invoice, Supplier } = require('../models');
    
    let whereClause = {
      status: {
        [require('sequelize').Op.notIn]: ['proceso_completado', 'rechazada']
      }
    };

    // Si es trabajador, solo sus facturas asignadas
    if (req.user.role === 'trabajador_contaduria') {
      whereClause.assigned_to = req.user.userId;
    }

    const invoices = await Invoice.findAll({
      where: whereClause,
      include: [{ model: Supplier, attributes: ['business_name'] }],
      order: [['created_at', 'DESC']],
      limit: 20
    });

    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      supplier: invoice.Supplier.business_name,
      amount: invoice.amount,
      status: invoice.status,
      created_at: invoice.created_at
    }));

    res.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error('Error getting pending invoices:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Función auxiliar para calcular tiempo transcurrido
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d`;
  } else if (diffHours > 0) {
    return `${diffHours}h`;
  } else {
    return 'Reciente';
  }
}

module.exports = router;