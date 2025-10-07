import { ref, computed } from 'vue'
import axios from '@/utils/axios'

/**
 * Composable para gestionar documentos requeridos según tipo de proveedor
 */
export function useInvoiceDocuments() {
  
  // Mapeo de documentos requeridos por tipo de proveedor
  const DOCS_BY_TYPE = {
    definitiva: ['payment_proof_file', 'password_file', 'iva_retention_file', 'isr_retention_file'],
    pagos_trimestrales: ['payment_proof_file', 'password_file', 'iva_retention_file'],
    pequeno_contribuyente: ['payment_proof_file', 'password_file', 'iva_retention_file'],
    pagos_trimestrales_retencion: ['payment_proof_file', 'password_file']
  }

  // Labels para tipos de proveedor
  const TIPO_PROVEEDOR_LABELS = {
    definitiva: 'Régimen Definitiva ISR',
    pagos_trimestrales: 'Pagos Trimestrales',
    pequeno_contribuyente: 'Pequeño Contribuyente',
    pagos_trimestrales_retencion: 'Pagos Trimestrales - Agente Retención'
  }

  // Labels para documentos
  const DOCUMENT_LABELS = {
    payment_proof_file: 'Comprobante de Pago',
    password_file: 'Documento de Contraseña',
    iva_retention_file: 'Retención IVA',
    isr_retention_file: 'Retención ISR'
  }

  // Tipos de documentos para API
  const DOCUMENT_API_TYPES = {
    payment_proof_file: 'payment_proof',
    password_file: 'password_file',
    iva_retention_file: 'retention_iva',
    isr_retention_file: 'retention_isr'
  }

  /**
   * Verificar si un documento es requerido
   */
  const isDocumentRequired = (documentField, tipoProveedor) => {
    if (!tipoProveedor) return false
    return DOCS_BY_TYPE[tipoProveedor]?.includes(documentField) || false
  }

  /**
   * Obtener documentos requeridos
   */
  const getRequiredDocuments = (tipoProveedor) => {
    return DOCS_BY_TYPE[tipoProveedor] || []
  }

  /**
   * Calcular progreso
   */
  const calculateProgress = (payment, tipoProveedor) => {
    if (!payment || !tipoProveedor) return 0
    
    const required = getRequiredDocuments(tipoProveedor)
    const uploaded = required.filter(doc => payment[doc]).length
    
    return Math.round((uploaded / required.length) * 100)
  }

  /**
   * Obtener documentos faltantes
   */
  const getMissingDocuments = (payment, tipoProveedor) => {
    if (!payment) {
      return getRequiredDocuments(tipoProveedor)
    }
    
    const required = getRequiredDocuments(tipoProveedor)
    return required.filter(doc => !payment[doc])
  }

  /**
   * Obtener label de tipo de proveedor
   */
  const getTipoProveedorLabel = (tipo) => {
    return TIPO_PROVEEDOR_LABELS[tipo] || tipo
  }

  /**
   * Obtener label de documento
   */
  const getDocumentLabel = (docField) => {
    return DOCUMENT_LABELS[docField] || docField
  }

  /**
   * Obtener tipo de API para documento
   */
  const getDocumentApiType = (docField) => {
    return DOCUMENT_API_TYPES[docField] || docField
  }

  /**
   * Obtener información de documentos desde API
   */
  const fetchRequiredDocuments = async (invoiceId) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}/required-documents`)
      return response.data
    } catch (error) {
      console.error('Error obteniendo documentos requeridos:', error)
      throw error
    }
  }

  return {
    // Constantes
    DOCS_BY_TYPE,
    TIPO_PROVEEDOR_LABELS,
    DOCUMENT_LABELS,
    DOCUMENT_API_TYPES,
    
    // Métodos
    isDocumentRequired,
    getRequiredDocuments,
    calculateProgress,
    getMissingDocuments,
    getTipoProveedorLabel,
    getDocumentLabel,
    getDocumentApiType,
    fetchRequiredDocuments
  }
}
