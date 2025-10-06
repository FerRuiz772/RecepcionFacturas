const { InvoiceComment, User, Invoice } = require('../models');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Obtener comentarios de una factura
 * @route GET /api/invoices/:invoiceId/comments
 * @access Proveedor (solo sus facturas) / Contaduría (todas)
 */
exports.getComments = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const user = req.user;

    // Verificar que la factura existe
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return sendError(res, 'Factura no encontrada', 404);
    }

    // Verificar permisos: proveedor solo puede ver sus facturas
    if (user.role === 'proveedor') {
      if (invoice.supplier_id !== user.supplier_id) {
        return sendError(res, 'No tienes permiso para ver estos comentarios', 403);
      }
    }

    // Obtener comentarios con información del usuario
    const comments = await InvoiceComment.findAll({
      where: { invoice_id: invoiceId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'role']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    logger.info(`Comentarios obtenidos para factura ${invoiceId}`, {
      userId: user.id,
      count: comments.length
    });

    return sendSuccess(res, comments);
  } catch (error) {
    logger.error('Error al obtener comentarios:', error);
    return sendError(res, 'Error al obtener comentarios', 500);
  }
};

/**
 * Crear un nuevo comentario
 * @route POST /api/invoices/:invoiceId/comments
 * @access Proveedor (solo sus facturas) / Contaduría (todas)
 */
exports.createComment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { comment } = req.body;
    const user = req.user;

    // Validar que el comentario no esté vacío
    if (!comment || comment.trim().length === 0) {
      return sendError(res, 'El comentario no puede estar vacío', 400);
    }

    // Verificar que la factura existe
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      return sendError(res, 'Factura no encontrada', 404);
    }

    // Verificar permisos: proveedor solo puede comentar sus facturas
    if (user.role === 'proveedor') {
      if (invoice.supplier_id !== user.supplier_id) {
        return sendError(res, 'No tienes permiso para comentar esta factura', 403);
      }
    }

    // Crear el comentario
    const newComment = await InvoiceComment.create({
      invoice_id: invoiceId,
      user_id: user.id,
      comment: comment.trim()
    });

    // Obtener el comentario con información del usuario
    const commentWithUser = await InvoiceComment.findByPk(newComment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'role']
        }
      ]
    });

    logger.info(`Comentario creado en factura ${invoiceId}`, {
      userId: user.id,
      commentId: newComment.id
    });

    return sendSuccess(res, commentWithUser, 'Comentario creado exitosamente', 201);
  } catch (error) {
    logger.error('Error al crear comentario:', error);
    return sendError(res, 'Error al crear comentario', 500);
  }
};
