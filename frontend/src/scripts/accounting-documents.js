import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useAccountingDocuments() {
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  // Estados reactivos
  const loading = ref(false)
  const invoice = ref(null)
  const generatingPassword = ref(false)
  const uploadingISR = ref(false)
  const uploadingIVA = ref(false)
  const uploadingProof = ref(false)
  const markingPayment = ref(false)

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

  // Verificar estado de pasos
  const isStepCompleted = (step) => {
    if (!invoice.value) return false
    
    switch (step) {
      case 'password':
        return ['contrasena_generada', 'retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'isr':
        return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'iva':
        return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'payment':
        return ['pago_realizado', 'proceso_completado'].includes(invoice.value.status)
      case 'proof':
        return invoice.value.status === 'proceso_completado'
      default:
        return false
    }
  }

  // Verificar permisos para cada paso
  const canGeneratePassword = () => {
    return invoice.value?.status === 'en_proceso'
  }

  const canUploadISR = () => {
    return ['contrasena_generada'].includes(invoice.value?.status)
  }

  const canUploadIVA = () => {
    return ['retencion_isr_generada'].includes(invoice.value?.status)
  }

  const canMarkPaid = () => {
    return ['retencion_iva_generada'].includes(invoice.value?.status)
  }

  const canUploadProof = () => {
    return ['pago_realizado'].includes(invoice.value?.status)
  }

  // Acciones del workflow
  const generatePassword = async () => {
    generatingPassword.value = true
    try {
      await axios.post(`/api/invoices/${route.params.id}/generate-password`)
      toast.success('Contraseña generada exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error generating password:', error)
      toast.error('Error al generar contraseña')
    } finally {
      generatingPassword.value = false
    }
  }

  const handleISRUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    uploadingISR.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_isr')

      await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención ISR subida exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading ISR:', error)
      toast.error('Error al subir retención ISR')
    } finally {
      uploadingISR.value = false
      event.target.value = ''
    }
  }

  const handleIVAUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    uploadingIVA.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_iva')

      await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención IVA subida exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading IVA:', error)
      toast.error('Error al subir retención IVA')
    } finally {
      uploadingIVA.value = false
      event.target.value = ''
    }
  }

  const markPaymentDone = async () => {
    markingPayment.value = true
    try {
      await axios.put(`/api/invoices/${route.params.id}/status`, {
        status: 'pago_realizado',
        notes: 'Pago marcado como realizado por contaduría'
      })
      
      toast.success('Pago marcado como realizado')
      await loadInvoice()
    } catch (error) {
      console.error('Error marking payment:', error)
      toast.error('Error al marcar pago')
    } finally {
      markingPayment.value = false
    }
  }

  const handleProofUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    uploadingProof.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'payment_proof')

      await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Cambiar estado a completado
      await axios.put(`/api/invoices/${route.params.id}/status`, {
        status: 'proceso_completado',
        notes: 'Proceso completado con comprobante de pago'
      })
      
      toast.success('¡Proceso completado exitosamente!')
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading proof:', error)
      toast.error('Error al subir comprobante')
    } finally {
      uploadingProof.value = false
      event.target.value = ''
    }
  }

  // Funciones de descarga
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
      toast.success('Comprobante descargado')
    } catch (error) {
      toast.error('Error al descargar comprobante')
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
      'factura_subida': 'Subida',
      'asignada_contaduria': 'Asignada',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña Generada',
      'retencion_isr_generada': 'Retención ISR',
      'retencion_iva_generada': 'Retención IVA',
      'pago_realizado': 'Pago Realizado',
      'proceso_completado': 'Completado',
      'rechazada': 'Rechazada'
    }
    return texts[status] || status
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT').format(number)
  }

  // Función de inicialización
  const initializeAccountingDocuments = async () => {
    await loadInvoice()
  }

  return {
    // Reactive state
    loading,
    invoice,
    generatingPassword,
    uploadingISR,
    uploadingIVA,
    uploadingProof,
    markingPayment,
    
    // Functions
    loadInvoice,
    isStepCompleted,
    canGeneratePassword,
    canUploadISR,
    canUploadIVA,
    canMarkPaid,
    canUploadProof,
    generatePassword,
    handleISRUpload,
    handleIVAUpload,
    markPaymentDone,
    handleProofUpload,
    downloadISR,
    downloadIVA,
    downloadProof,
    getStatusColor,
    getStatusText,
    formatNumber,
    initializeAccountingDocuments
  }
}
