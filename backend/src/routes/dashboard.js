const express = require('express');
const router = express.Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const { readRateLimit, writeRateLimit } = require('../middleware/rateLimiting');
const invoiceController = require('../controllers/invoiceController');

// Todas las rutas protegidas
router.use(authenticate);

// ===== NUEVAS RUTAS DE ESTADÍSTICAS =====
// Estadísticas generales del dashboard (todos pueden ver sus estadísticas)
router.get('/stats', readRateLimit, invoiceController.getDashboardStats);

// Estado de facturas con porcentajes
router.get('/invoice-status', readRateLimit, invoiceController.getInvoiceStatusStats);

// Tendencias de pagos (últimos 6 meses)
router.get('/payment-trends', readRateLimit, invoiceController.getPaymentTrends);

// Facturas recientes para la tabla
router.get('/recent-invoices', readRateLimit, invoiceController.getRecentInvoices);

// ===== RUTAS EXISTENTES =====
// Ruta para cola de trabajo (solo contaduría)
router.get('/work-queue', readRateLimit, requirePermission(['invoices.view']), invoiceController.getWorkQueue);

// Ruta para facturas pendientes (solo contaduría)
router.get('/pending-invoices', readRateLimit, requirePermission(['invoices.view']), invoiceController.getPendingInvoices);

// Ruta para documentos disponibles (proveedores)
router.get('/available-documents', readRateLimit, requirePermission(['documents.view']), invoiceController.getAvailableDocuments);

// Ruta para notificaciones del usuario
router.get('/notifications', readRateLimit, invoiceController.getNotifications);

// Rutas para marcar notificaciones como leídas
router.patch('/notifications/:id/read', writeRateLimit, invoiceController.markNotificationAsRead);
router.patch('/notifications/mark-all-read', writeRateLimit, invoiceController.markAllNotificationsAsRead);

module.exports = router;