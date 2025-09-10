const express = require('express');
const router = express.Router();
const { authenticate, requireContaduria, requireProveedor } = require('../middleware/auth');
const invoiceController = require('../controllers/invoiceController');

// Todas las rutas protegidas
router.use(authenticate);

// ===== NUEVAS RUTAS DE ESTADÍSTICAS =====
// Estadísticas generales del dashboard
router.get('/stats', invoiceController.getDashboardStats);

// Estado de facturas con porcentajes
router.get('/invoice-status', invoiceController.getInvoiceStatusStats);

// Tendencias de pagos (últimos 6 meses)
router.get('/payment-trends', invoiceController.getPaymentTrends);

// Facturas recientes para la tabla
router.get('/recent-invoices', invoiceController.getRecentInvoices);

// ===== RUTAS EXISTENTES =====
// Ruta para cola de trabajo
router.get('/work-queue', requireContaduria, invoiceController.getWorkQueue);

// Ruta para facturas pendientes
router.get('/pending-invoices', requireContaduria, invoiceController.getPendingInvoices);

// Ruta para documentos disponibles (proveedores)
router.get('/available-documents', requireProveedor, invoiceController.getAvailableDocuments);

// Ruta para notificaciones del usuario
router.get('/notifications', invoiceController.getNotifications);

// Rutas para marcar notificaciones como leídas
router.patch('/notifications/:id/read', invoiceController.markNotificationAsRead);
router.patch('/notifications/mark-all-read', invoiceController.markAllNotificationsAsRead);

module.exports = router;