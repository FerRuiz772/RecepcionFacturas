import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import { useAuthStore } from '@/stores/auth'
import { useInvoicesStore } from '@/stores/invoices'
import axios from 'axios'

export function useAccountingDocuments() {
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()
  const authStore = useAuthStore()
  const invoicesStore = useInvoicesStore()

  // Estados reactivos
  const loading = ref(false)
  const invoice = ref(null)
  const uploadingISR = ref(false)
  const uploadingIVA = ref(false)
  const uploadingProof = ref(false)
  const completingProcess = ref(false)
  const selectedFileIndex = ref(0)
  
  // Estados para edición
  const editMode = ref(false)
  const editForm = ref({
    amount: '',
    description: '',
    due_date: '',
    priority: 'media'
  })
  const saving = ref(false)

  // Computed para manejo de archivos
  const fileOptions = computed(() => {
    if (!invoice.value?.uploaded_files) return []
    return invoice.value.uploaded_files.map((file, index) => ({
      title: file.originalName,
      value: index
    }))
  })

  const currentFile = computed(() => {
    if (!invoice.value?.uploaded_files) return null
    return invoice.value.uploaded_files[selectedFileIndex.value]
  })

  const currentFileUrl = computed(() => {
    if (!currentFile.value) return null
    // Construir URL para visualización del archivo con token
    const baseUrl = `http://localhost:3000/api/invoices/${route.params.id}/view-file/${currentFile.value.filename}`
    const token = authStore.token
    return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl
  })

  // Computed properties para verificar estado de documentos
  const hasISRRetention = computed(() => {
    return invoice.value?.payment?.isr_retention_file != null
  })

  const hasIVARetention = computed(() => {
    return invoice.value?.payment?.iva_retention_file != null
  })

  const hasPaymentProof = computed(() => {
    return invoice.value?.payment?.payment_proof_file != null
  })

  const documentsProgress = computed(() => {
    let completedSteps = 0
    let totalSteps = 0

    // Verificar si tiene monto y descripción
    if (invoice.value?.amount && invoice.value?.amount > 0) completedSteps++
    totalSteps++

    if (invoice.value?.description && invoice.value?.description.trim()) completedSteps++
    totalSteps++

    // Verificar documentos subidos
    if (hasISRRetention.value) completedSteps++
    totalSteps++

    if (hasIVARetention.value) completedSteps++
    totalSteps++

    if (hasPaymentProof.value) completedSteps++
    totalSteps++

    return Math.round((completedSteps / totalSteps) * 100)
  })

  // Cargar datos de la factura
  const loadInvoice = async () => {
    loading.value = true
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}`)
      invoice.value = response.data
      
      // Si hay archivos, seleccionar el primero por defecto
      if (invoice.value.uploaded_files && invoice.value.uploaded_files.length > 0) {
        selectedFileIndex.value = 0
      }
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast.error('Error al cargar la factura')
    } finally {
      loading.value = false
    }
  }

  // Verificar si tiene un documento específico
  const hasDocument = (type) => {
    if (!invoice.value?.payment) return false
    
    switch (type) {
      case 'isr':
        return !!invoice.value.payment.isr_retention_file
      case 'iva':
        return !!invoice.value.payment.iva_retention_file
      case 'proof':
        return !!invoice.value.payment.payment_proof_file
      default:
        return false
    }
  }

  // Calcular progreso usando computed properties
  const getProgressPercentage = () => {
    return documentsProgress.value
  }

  const getProgressColor = () => {
    const percentage = documentsProgress.value
    if (percentage === 100) return 'success'
    if (percentage >= 80) return 'primary'
    if (percentage >= 60) return 'info'
    if (percentage >= 40) return 'warning'
    return 'error'
  }

  const getCompletionText = () => {
    const percentage = documentsProgress.value
    if (percentage === 100) return 'Proceso Completo'
    if (percentage >= 80) return 'Casi Completo'
    if (percentage >= 60) return 'En Progreso Avanzado'
    if (percentage >= 40) return 'En Progreso'
    return 'Iniciando'
  }

  const getCompletionColor = () => {
    const percentage = documentsProgress.value
    if (percentage === 100) return 'success'
    if (percentage >= 80) return 'primary'
    if (percentage >= 60) return 'info'
    if (percentage >= 40) return 'warning'
    return 'error'
  }

  // Verificar si se puede completar el proceso
  const canCompleteProcess = () => {
    return hasISRRetention.value && hasIVARetention.value
  }

  // Funciones de subida de documentos
  const handleISRUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    uploadingISR.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_isr')

      const response = await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención ISR subida exitosamente')
      
      // Actualizar la factura local
      await loadInvoice()
      
      // Actualizar el store global con la factura actualizada
      if (response.data.invoice) {
        invoicesStore.updateInvoiceInList(response.data.invoice)
        console.log('📊 Store actualizado con estado:', response.data.invoice.status)
      }
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

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    uploadingIVA.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_iva')

      const response = await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención IVA subida exitosamente')
      
      // Actualizar la factura local
      await loadInvoice()
      
      // Actualizar el store global con la factura actualizada
      if (response.data.invoice) {
        invoicesStore.updateInvoiceInList(response.data.invoice)
        console.log('📊 Store actualizado con estado:', response.data.invoice.status)
      }
    } catch (error) {
      console.error('Error uploading IVA:', error)
      toast.error('Error al subir retención IVA')
    } finally {
      uploadingIVA.value = false
      event.target.value = ''
    }
  }

  const handleProofUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    uploadingProof.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'payment_proof')

      const response = await axios.post(`/api/invoices/${route.params.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Comprobante de pago subido exitosamente')
      
      // Actualizar la factura local
      await loadInvoice()
      
      // Actualizar el store global con la factura actualizada
      if (response.data.invoice) {
        invoicesStore.updateInvoiceInList(response.data.invoice)
        console.log('📊 Store actualizado con estado:', response.data.invoice.status)
        
        // Si se completó el proceso, mostrar notificación especial
        if (response.data.invoice.status === 'proceso_completado') {
          toast.success('🎉 ¡Proceso completado! Todos los documentos han sido subidos.', {
            timeout: 5000
          })
        }
      }
    } catch (error) {
      console.error('Error uploading proof:', error)
      toast.error('Error al subir comprobante')
    } finally {
      uploadingProof.value = false
      event.target.value = ''
    }
  }

  // Funciones para activar los inputs de reemplazo
  const triggerReplaceISR = () => {
    const input = document.getElementById('replace-isr-input')
    if (input) input.click()
  }

  const triggerReplaceIVA = () => {
    const input = document.getElementById('replace-iva-input')
    if (input) input.click()
  }

  const triggerReplaceProof = () => {
    const input = document.getElementById('replace-proof-input')
    if (input) input.click()
  }

  // Funciones para reemplazar documentos
  const replaceISR = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    if (!hasISRRetention.value) {
      toast.error('No hay archivo previo para reemplazar')
      return
    }

    uploadingISR.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_isr')

      await axios.put(`/api/invoices/${route.params.id}/replace-document/retention_isr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención ISR reemplazada exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing ISR:', error)
      toast.error('Error al reemplazar retención ISR')
    } finally {
      uploadingISR.value = false
      // Limpiar el input
      event.target.value = ''
    }
  }

  const replaceIVA = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    if (!hasIVARetention.value) {
      toast.error('No hay archivo previo para reemplazar')
      return
    }

    uploadingIVA.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'retention_iva')

      await axios.put(`/api/invoices/${route.params.id}/replace-document/retention_iva`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Retención IVA reemplazada exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing IVA:', error)
      toast.error('Error al reemplazar retención IVA')
    } finally {
      uploadingIVA.value = false
      // Limpiar el input
      event.target.value = ''
    }
  }

  const replaceProof = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      return
    }

    if (!hasPaymentProof.value) {
      toast.error('No hay archivo previo para reemplazar')
      return
    }

    uploadingProof.value = true
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'payment_proof')

      await axios.put(`/api/invoices/${route.params.id}/replace-document/payment_proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success('Comprobante de pago reemplazado exitosamente')
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing proof:', error)
      toast.error('Error al reemplazar comprobante de pago')
    } finally {
      uploadingProof.value = false
      // Limpiar el input
      event.target.value = ''
    }
  }

  // Completar proceso
  const completeProcess = async () => {
    if (!canCompleteProcess()) {
      toast.error('Faltan documentos obligatorios por subir')
      return
    }

    completingProcess.value = true
    try {
      await axios.put(`/api/invoices/${route.params.id}/status`, {
        status: 'proceso_completado',
        notes: 'Proceso completado - Todos los documentos obligatorios subidos'
      })
      
      toast.success('¡Proceso completado exitosamente!')
      await loadInvoice()
    } catch (error) {
      console.error('Error completing process:', error)
      toast.error('Error al completar el proceso')
    } finally {
      completingProcess.value = false
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

  // Funciones para manejo de archivos originales
  const downloadCurrentFile = async () => {
    if (!currentFile.value) return

    try {
      const response = await axios.get(`/api/invoices/${route.params.id}/download-file/${currentFile.value.filename}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = currentFile.value.originalName
      link.click()
      toast.success('Archivo descargado')
    } catch (error) {
      toast.error('Error al descargar archivo')
    }
  }

  const openInNewTab = () => {
    if (currentFileUrl.value) {
      window.open(currentFileUrl.value, '_blank')
    }
  }

  const handleFrameError = () => {
    toast.warning('No se puede visualizar este archivo. Puedes descargarlo para verlo.')
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

  // Funciones de edición
  const startEdit = () => {
    if (!invoice.value) return
    
    editForm.value = {
      amount: invoice.value.amount?.toString() || '',
      description: invoice.value.description || '',
      due_date: invoice.value.due_date ? invoice.value.due_date.split('T')[0] : '',
      priority: invoice.value.priority || 'media'
    }
    editMode.value = true
  }

  const cancelEdit = () => {
    editMode.value = false
    editForm.value = {
      amount: '',
      description: '',
      due_date: '',
      priority: 'media'
    }
  }

  const saveEdit = async () => {
    if (!invoice.value || saving.value) return
    
    saving.value = true
    try {
      const updateData = {
        amount: parseFloat(editForm.value.amount),
        description: editForm.value.description,
        priority: editForm.value.priority
      }
      
      if (editForm.value.due_date) {
        updateData.due_date = editForm.value.due_date
      }

      await axios.put(`/api/invoices/${route.params.id}`, updateData)
      
      // Recargar datos de la factura
      await loadInvoice()
      
      editMode.value = false
      toast.success('Factura actualizada exitosamente')
      
    } catch (error) {
      console.error('Error updating invoice:', error)
      toast.error('Error al actualizar la factura')
    } finally {
      saving.value = false
    }
  }

  return {
    // Reactive state
    loading,
    invoice,
    uploadingISR,
    uploadingIVA,
    uploadingProof,
    completingProcess,
    selectedFileIndex,
    
    // Edit state
    editMode,
    editForm,
    saving,
    
    // Computed properties
    fileOptions,
    currentFile,
    currentFileUrl,
    
    // Functions
    loadInvoice,
    hasDocument,
    getProgressPercentage,
    getProgressColor,
    getCompletionText,
    getCompletionColor,
    canCompleteProcess,
    handleISRUpload,
    handleIVAUpload,
    handleProofUpload,
    triggerReplaceISR,
    triggerReplaceIVA,
    triggerReplaceProof,
    replaceISR,
    replaceIVA,
    replaceProof,
    completeProcess,
    downloadISR,
    downloadIVA,
    downloadProof,
    downloadCurrentFile,
    openInNewTab,
    handleFrameError,
    getStatusColor,
    getStatusText,
    formatNumber,
    initializeAccountingDocuments,
    
    // Edit functions
    startEdit,
    cancelEdit,
    saveEdit,
    
    // Document state
    hasISRRetention,
    hasIVARetention,
    hasPaymentProof,
    documentsProgress
  }
}
