/**
 * Servicio para gestionar documentos requeridos según tipo de proveedor
 * Define qué documentos debe subir cada tipo de proveedor y maneja el flujo de estados
 */

// Mapeo de documentos requeridos por tipo de proveedor
const DOCUMENTOS_POR_TIPO = {
  definitiva: ['payment_proof_file', 'password_file', 'iva_retention_file', 'isr_retention_file'],
  pagos_trimestrales: ['payment_proof_file', 'password_file', 'iva_retention_file'],
  pequeno_contribuyente: ['payment_proof_file', 'password_file', 'iva_retention_file'],
  pagos_trimestrales_retencion: ['payment_proof_file', 'password_file']
};

// Mapeo de estados según documentos subidos
const ESTADOS_DOCUMENTOS = {
  password_file: 'contrasena_generada',
  isr_retention_file: 'retencion_isr_generada',
  iva_retention_file: 'retencion_iva_generada',
  payment_proof_file: 'pago_realizado'
};

module.exports = {
  /**
   * Obtener documentos requeridos para un tipo de proveedor
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {Array} Array con nombres de campos de documentos requeridos
   */
  getRequiredDocuments(tipoProveedor) {
    return DOCUMENTOS_POR_TIPO[tipoProveedor] || [];
  },
  
  /**
   * Calcular progreso de documentos subidos
   * @param {Object} payment - Objeto payment con documentos
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {number} Porcentaje de progreso (0-100)
   */
  calculateProgress(payment, tipoProveedor) {
    if (!payment) return 0;
    
    const required = this.getRequiredDocuments(tipoProveedor);
    const uploaded = required.filter(doc => payment[doc]).length;
    
    return Math.round((uploaded / required.length) * 100);
  },
  
  /**
   * Determinar próximo estado según documentos subidos
   * @param {Object} payment - Objeto payment con documentos
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {string} Próximo estado de la factura
   */
  determineNextState(payment, tipoProveedor) {
    if (!payment) {
      return 'en_proceso'; // Estado inicial
    }
    
    const required = this.getRequiredDocuments(tipoProveedor);
    
    // Verificar cada documento en orden de prioridad
    if (!payment.password_file) {
      return 'en_proceso'; // Esperando contraseña
    }
    
    if (required.includes('isr_retention_file') && !payment.isr_retention_file) {
      return 'contrasena_generada'; // Tiene contraseña, falta ISR
    }
    
    if (required.includes('iva_retention_file') && !payment.iva_retention_file) {
      // Si requiere ISR y ya lo tiene, o no requiere ISR
      if (!required.includes('isr_retention_file') || payment.isr_retention_file) {
        return 'retencion_isr_generada'; // Falta IVA
      }
      return 'contrasena_generada'; // Falta ISR e IVA
    }
    
    if (!payment.payment_proof_file) {
      return 'retencion_iva_generada'; // Falta comprobante
    }
    
    // Todos los documentos subidos
    return 'pago_realizado';
  },
  
  /**
   * Verificar si la factura está completa (todos los documentos subidos)
   * @param {Object} payment - Objeto payment con documentos
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {boolean} True si todos los documentos están subidos
   */
  isInvoiceComplete(payment, tipoProveedor) {
    if (!payment) return false;
    
    const required = this.getRequiredDocuments(tipoProveedor);
    return required.every(doc => payment[doc]);
  },
  
  /**
   * Obtener documentos faltantes
   * @param {Object} payment - Objeto payment con documentos
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {Array} Array con nombres de documentos faltantes
   */
  getMissingDocuments(payment, tipoProveedor) {
    if (!payment) {
      return this.getRequiredDocuments(tipoProveedor);
    }
    
    const required = this.getRequiredDocuments(tipoProveedor);
    return required.filter(doc => !payment[doc]);
  },
  
  /**
   * Verificar si un documento es requerido para un tipo de proveedor
   * @param {string} documentName - Nombre del documento
   * @param {string} tipoProveedor - Tipo de proveedor
   * @returns {boolean} True si el documento es requerido
   */
  isDocumentRequired(documentName, tipoProveedor) {
    const required = this.getRequiredDocuments(tipoProveedor);
    return required.includes(documentName);
  }
};
