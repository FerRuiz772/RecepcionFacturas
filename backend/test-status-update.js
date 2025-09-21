const sequelize = require('./src/config/database');
const { Invoice, Payment, Supplier, User } = require('./src/models');
const invoiceController = require('./src/controllers/invoiceController');

async function testStatusUpdate() {
    try {
        console.log('🔍 Iniciando prueba de actualización de estado...');
        
        // Buscar la factura específica
        const invoice = await Invoice.findOne({
            where: { number: 'REF-202509-8-481391' },
            include: [
                { model: Payment, as: 'payment' },
                { model: Supplier, as: 'supplier' },
                { model: User, as: 'assignedUser' }
            ]
        });
        
        if (!invoice) {
            console.log('❌ No se encontró la factura');
            return;
        }
        
        console.log('📋 Factura encontrada:', {
            id: invoice.id,
            number: invoice.number,
            status: invoice.status,
            payment: invoice.payment ? {
                password_file: invoice.payment.password_file,
                isr_retention_file: invoice.payment.isr_retention_file,
                iva_retention_file: invoice.payment.iva_retention_file,
                payment_proof_file: invoice.payment.payment_proof_file
            } : null
        });
        
        // Simular la llamada al método updateInvoiceStatusAfterUpload
        console.log('🔄 Llamando a updateInvoiceStatusAfterUpload...');
        await invoiceController.updateInvoiceStatusAfterUpload(invoice, 'password_file', invoice.payment);
        
        // Verificar el estado después del update
        const updatedInvoice = await Invoice.findByPk(invoice.id);
        console.log('✅ Estado después del update:', updatedInvoice.status);
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await sequelize.close();
    }
}

testStatusUpdate();