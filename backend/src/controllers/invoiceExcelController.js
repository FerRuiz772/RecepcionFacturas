/**
 * Controlador para generaciÃ³n de reportes Excel de facturas
 * Sistema PayQuetzal
 */

const ExcelJS = require('exceljs');
const { Invoice, Supplier, User, Payment } = require('../models');
const { Op } = require('sequelize');

const invoiceExcelController = {
    /**
     * Genera un archivo Excel con las facturas filtradas
     * @route GET /api/invoices/export/excel
     */
    async exportToExcel(req, res) {
        try {
            const { status, supplier_id, assigned_to, search, date_from, date_to } = req.query;
            
            console.log('ðŸ“Š Iniciando exportaciÃ³n a Excel con filtros:', {
                status, supplier_id, assigned_to, search, date_from, date_to
            });

            // Construir whereClause igual que en getAllInvoices
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
                    const endDate = new Date(date_to);
                    endDate.setHours(23, 59, 59, 999);
                    where.created_at[Op.lte] = endDate;
                }
            }

            // BÃºsqueda por nÃºmero de factura o descripciÃ³n
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

            console.log('ðŸ” Where clause para exportaciÃ³n:', where);

            // Configurar includes basado en el rol del usuario
            const includes = [
                {
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['id', 'business_name', 'nit', 'contact_phone']
                },
                {
                    model: Payment,
                    as: 'payment',
                    required: false
                }
            ];

            // Solo incluir informaciÃ³n del usuario asignado si NO es proveedor
            if (req.user.role !== 'proveedor') {
                includes.push({
                    model: User,
                    as: 'assignedUser',
                    attributes: ['id', 'name', 'email'],
                    required: false
                });
            }

            // Obtener facturas con los filtros aplicados
            const invoices = await Invoice.findAll({
                where,
                include: includes,
                order: [['created_at', 'DESC']]
            });

            console.log(`âœ… ${invoices.length} facturas encontradas para exportar`);

            if (invoices.length === 0) {
                return res.status(404).json({ 
                    error: 'No se encontraron facturas con los filtros aplicados',
                    code: 'NO_INVOICES_FOUND' 
                });
            }

            // Crear libro de Excel
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Sistema PayQuetzal';
            workbook.created = new Date();
            
            const worksheet = workbook.addWorksheet('Facturas', {
                properties: { tabColor: { argb: 'FF1976D2' } }
            });

            // Definir columnas segÃºn el rol
            const columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'No. Factura', key: 'number', width: 20 },
                { header: 'Proveedor', key: 'supplier', width: 30 },
                { header: 'NIT', key: 'nit', width: 15 },
                { header: 'Monto', key: 'amount', width: 15 },
                { header: 'DescripciÃ³n', key: 'description', width: 40 },
                { header: 'Estado', key: 'status', width: 20 },
                { header: 'Prioridad', key: 'priority', width: 12 },
                { header: 'Fecha CreaciÃ³n', key: 'created_at', width: 18 },
                { header: 'Fecha Vencimiento', key: 'due_date', width: 18 }
            ];

            // Agregar columnas especÃ­ficas segÃºn rol
            if (req.user.role !== 'proveedor') {
                columns.push(
                    { header: 'Asignado a', key: 'assigned_to', width: 25 },
                    { header: 'Email Asignado', key: 'assigned_email', width: 30 }
                );
            }

            // Columnas de documentos
            columns.push(
                { header: 'Tiene ContraseÃ±a', key: 'has_password', width: 15 },
                { header: 'Tiene ISR', key: 'has_isr', width: 12 },
                { header: 'Tiene IVA', key: 'has_iva', width: 12 },
                { header: 'Tiene Comprobante', key: 'has_payment_proof', width: 18 }
            );

            worksheet.columns = columns;

            // Estilo del encabezado
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1976D2' }
            };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 25;

            // Mapeo de estados a nombres amigables
            const statusMap = {
                'factura_subida': 'Factura Subida',
                'asignada_contaduria': 'Asignada',
                'en_proceso': 'En Proceso',
                'contrasena_generada': 'ContraseÃ±a Generada',
                'retencion_isr_generada': 'ISR Generado',
                'retencion_iva_generada': 'IVA Generado',
                'pago_realizado': 'Pago Realizado',
                'proceso_completado': 'Completado',
                'rechazada': 'Rechazada'
            };

            const priorityMap = {
                'alta': 'Alta',
                'media': 'Media',
                'baja': 'Baja'
            };

            // Agregar datos de facturas
            invoices.forEach((invoice, index) => {
                const rowData = {
                    id: invoice.id,
                    number: invoice.number || 'N/A',
                    supplier: invoice.supplier?.business_name || 'N/A',
                    nit: invoice.supplier?.nit || 'N/A',
                    amount: parseFloat(invoice.amount) || 0,
                    description: invoice.description || 'Sin descripciÃ³n',
                    status: statusMap[invoice.status] || invoice.status,
                    priority: priorityMap[invoice.priority] || invoice.priority,
                    created_at: invoice.created_at ? new Date(invoice.created_at) : null,
                    due_date: invoice.due_date ? new Date(invoice.due_date) : null
                };

                // Agregar datos especÃ­ficos segÃºn rol
                if (req.user.role !== 'proveedor') {
                    rowData.assigned_to = invoice.assignedUser?.name || 'Sin asignar';
                    rowData.assigned_email = invoice.assignedUser?.email || 'N/A';
                }

                // Estado de documentos
                rowData.has_password = invoice.payment?.password_generated ? 'SÃ­' : 'No';
                rowData.has_isr = invoice.payment?.isr_retention_file ? 'SÃ­' : 'No';
                rowData.has_iva = invoice.payment?.iva_retention_file ? 'SÃ­' : 'No';
                rowData.has_payment_proof = invoice.payment?.payment_proof_file ? 'SÃ­' : 'No';

                const row = worksheet.addRow(rowData);

                // Formatear monto como moneda
                row.getCell('amount').numFmt = 'Q#,##0.00';

                // Formatear fechas
                if (rowData.created_at) {
                    row.getCell('created_at').numFmt = 'dd/mm/yyyy hh:mm';
                }
                if (rowData.due_date) {
                    row.getCell('due_date').numFmt = 'dd/mm/yyyy';
                }

                // Aplicar estilo alternado a las filas
                if (index % 2 === 0) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF5F5F5' }
                    };
                }

                // Color segÃºn estado
                const statusCell = row.getCell('status');
                switch (invoice.status) {
                    case 'proceso_completado':
                        statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
                        break;
                    case 'rechazada':
                        statusCell.font = { color: { argb: 'FFC62828' }, bold: true };
                        break;
                    case 'en_proceso':
                        statusCell.font = { color: { argb: 'FFED6C02' }, bold: true };
                        break;
                }

                // AlineaciÃ³n
                row.alignment = { vertical: 'middle', wrapText: true };
            });

            // Agregar bordes a todas las celdas
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                    };
                });
            });

            // Agregar fila de resumen al final
            const summaryRow = worksheet.addRow({
                id: '',
                number: 'TOTAL',
                supplier: '',
                nit: '',
                amount: invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0),
                description: `${invoices.length} facturas`,
            });
            
            summaryRow.font = { bold: true };
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE3F2FD' }
            };
            summaryRow.getCell('amount').numFmt = 'Q#,##0.00';

            // Auto-filtro para todas las columnas
            worksheet.autoFilter = {
                from: 'A1',
                to: worksheet.lastColumn.letter + '1'
            };

            // Generar nombre de archivo con fecha
            const fecha = new Date().toISOString().split('T')[0];
            const filename = `facturas_${fecha}_${Date.now()}.xlsx`;

            // Configurar headers para descarga
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filename}"`
            );

            // Enviar archivo
            await workbook.xlsx.write(res);
            
            console.log(`âœ… Archivo Excel generado exitosamente: ${filename}`);
            res.end();

        } catch (error) {
            console.error('âŒ Error generando Excel:', error);
            res.status(500).json({ 
                error: 'Error generando archivo Excel',
                details: error.message 
            });
        }
    }
};

module.exports = invoiceExcelController;