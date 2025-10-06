import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useInvoiceDetail() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()

  // Estados reactivos
  const loading = ref(false)
  const invoice = ref(null)

  // Computed properties
  const canManage = computed(() => {
    return authStore.isContaduria || authStore.isAdmin
  })

  // Cargar datos de la factura
  const loadInvoice = async () => {
    loading.value = true
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}`)
      invoice.value = response.data
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast.error('Error al cargar la factura')
    } finally {
      loading.value = false
    }
  }

  // Verificar disponibilidad de documentos
  const hasDocument = (type) => {
    if (!invoice.value) return false
    
    switch (type) {
      case 'isr':
        return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'iva':
        return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'proof':
        return invoice.value.status === 'proceso_completado'
      case 'password':
        return ['pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      default:
        return false
    }
  }

  const hasAnyDocuments = () => {
    return hasDocument('isr') || hasDocument('iva') || hasDocument('proof') || hasDocument('password')
  }

  // Funciones de descarga
  const downloadOriginalFile = async (file) => {
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = file.originalName
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Archivo descargado')
    } catch (error) {
      toast.error('Error al descargar archivo')
    }
  }

  const downloadISR = async () => {
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-isr-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención ISR descargada')
    } catch (error) {
      toast.error('Error al descargar retención ISR')
    }
  }

  const downloadIVA = async () => {
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-iva-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención IVA descargada')
    } catch (error) {
      toast.error('Error al descargar retención IVA')
    }
  }

  const downloadProof = async () => {
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `comprobante-pago-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Comprobante descargado')
    } catch (error) {
      toast.error('Error al descargar comprobante')
    }
  }

  const downloadPassword = async () => {
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-password-file`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `contrasena-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Archivo de contraseña descargado')
    } catch (error) {
      toast.error('Error al descargar archivo de contraseña')
    }
  }

  // Reemplazo de documentos (para proveedores)
  const replacingFile = ref(false)

  const triggerReplaceISR = () => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.getElementById('replace-isr-input')
        if (input) input.click()
      }
    } catch (err) {
      console.error('Error al abrir selector ISR:', err)
    }
  }

  const triggerReplaceIVA = () => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.getElementById('replace-iva-input')
        if (input) input.click()
      }
    } catch (err) {
      console.error('Error al abrir selector IVA:', err)
    }
  }

  const triggerReplaceProof = () => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.getElementById('replace-proof-input')
        if (input) input.click()
      }
    } catch (err) {
      console.error('Error al abrir selector comprobante:', err)
    }
  }

  const triggerReplacePassword = () => {
    try {
      if (typeof document !== 'undefined') {
        const input = document.getElementById('replace-password-input')
        if (input) input.click()
      }
    } catch (err) {
      console.error('Error al abrir selector de contraseña:', err)
    }
  }

  const replaceGeneric = async (event, type) => {
    const file = event.target.files[0]
    if (!file) return

    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.put(`/api/invoices/${route.params.id}/replace-document/${type}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Recargar datos
      await loadInvoice()
      toast.success('Documento reemplazado exitosamente')
      return response.data
    } catch (error) {
      console.error('Error reemplazando documento:', error)
      toast.error('Error al reemplazar el documento')
      throw error
    } finally {
      replacingFile.value = false
      // limpiar input
      if (event && event.target) event.target.value = ''
    }
  }

  const replaceISR = async (event) => replaceGeneric(event, 'retention_isr')
  const replaceIVA = async (event) => replaceGeneric(event, 'retention_iva')
  const replaceProof = async (event) => replaceGeneric(event, 'payment_proof')
  const replacePassword = async (event) => replaceGeneric(event, 'password_file')

  // Reemplazar archivo original (proveedor)
  const replaceOriginal = async (fileObj, originalFilename = null) => {
    if (!fileObj) return
    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', fileObj)
    if (originalFilename) formData.append('original_filename', originalFilename)

    try {
      let response
      try {
        response = await axios.put(`/api/invoices/${route.params.id}/replace-original`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } catch (err) {
        // Si el servidor/proxy no soporta PUT para multipart, intentar POST como fallback
        if (err?.response?.status === 404) {
          console.warn('PUT not found for replace-original, trying POST as fallback');
          response = await axios.post(`/api/invoices/${route.params.id}/replace-original`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
        } else {
          throw err
        }
      }
      await loadInvoice()
      toast.success(response.data.message || 'Archivo reemplazado')
      return response.data
    } catch (error) {
      console.error('Error reemplazando archivo original:', error)
      toast.error('Error al reemplazar archivo original')
      throw error
    } finally {
      replacingFile.value = false
    }
  }

  // Funciones de utilidad
  const getStatusColor = (status) => {
    const colors = {
      'factura_subida': 'blue',
      'asignada_contaduria': 'orange',
      'en_proceso': 'purple',
      'contrasena_generada': 'indigo',
      'retencion_isr_generada': 'cyan',
      'retencion_iva_generada': 'teal',
      'pago_realizado': 'green',
      'proceso_completado': 'success',
      'rechazada': 'error'
    }
    return colors[status] || 'grey'
  }

  const getStatusText = (status) => {
    const texts = {
      'factura_subida': 'Factura Subida',
      'asignada_contaduria': 'Asignada a Contaduría',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña Generada',
      'retencion_isr_generada': 'Retención ISR Generada',
      'retencion_iva_generada': 'Retención IVA Generada',
      'pago_realizado': 'Pago Realizado',
      'proceso_completado': 'Proceso Completado',
      'rechazada': 'Rechazada'
    }
    return texts[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'baja': 'success',
      'media': 'warning',
      'alta': 'error',
      'urgente': 'purple'
    }
    return colors[priority] || 'grey'
  }

  const getPriorityText = (priority) => {
    const texts = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'urgente': 'Urgente'
    }
    return texts[priority] || priority
  }

  const getFileIcon = (mimetype) => {
    if (mimetype === 'application/pdf') return 'mdi-file-pdf-box'
    if (mimetype?.startsWith('image/')) return 'mdi-file-image'
    return 'mdi-file'
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT').format(number)
  }

  const formatDate = (dateString) => {
    try {
      return new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateString))
    } catch (e) {
      return new Date(dateString).toLocaleDateString('es-GT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const formatDateTime = (dateString) => {
    try {
      return new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(dateString))
    } catch (e) {
      return new Date(dateString).toLocaleString('es-GT', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const formatFileSize = (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Función de inicialización
  const initializeInvoiceDetail = async () => {
    await loadInvoice()
  }

  return {
    // Reactive state
    loading,
    invoice,
    
    // Stores
    authStore,
    
    // Computed properties
    canManage,
    
    // Functions
    loadInvoice,
    hasDocument,
    hasAnyDocuments,
    downloadOriginalFile,
    downloadISR,
    downloadIVA,
    downloadProof,
    downloadPassword,
  // Replace handlers for suppliers
  replacingFile,
  triggerReplaceISR,
  triggerReplaceIVA,
  triggerReplaceProof,
  triggerReplacePassword,
  replaceISR,
  replaceIVA,
  replaceProof,
  replacePassword,
  // Original replacement
  replaceOriginal,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    getFileIcon,
    formatNumber,
    formatDate,
    formatDateTime,
    formatFileSize,
    initializeInvoiceDetail
  }
}
