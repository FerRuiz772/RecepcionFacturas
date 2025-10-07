import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import { useInvoiceDocuments } from '../composables/useInvoiceDocuments.js'
import axios from 'axios'

export function useInvoiceManage() {
  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  // Composable para manejo de documentos dinámicos
  const { calculateProgress: calculateDocumentProgress } = useInvoiceDocuments()

  // Estados reactivos
  const loading = ref(false)
  const invoice = ref(null)
  const isrFile = ref([])
  const ivaFile = ref([])
  const proofFile = ref([])
  const uploadingPassword = ref(false)
  const replaceFile = ref([])
  const replaceDialog = ref(false)
  const replaceFileInfo = ref(null)
  const selectedFileIndex = ref(0)
  
  // Edit state
  const editMode = ref(false)
  const editForm = ref({})
  const saving = ref(false)
  
  // Estados de carga
  const generatingPassword = ref(false)
  const uploadingISR = ref(false)
  const uploadingIVA = ref(false)
  const uploadingProof = ref(false)
  const replacingFile = ref(false)

  // Computed properties para permisos
  const canGeneratePassword = computed(() => {
    if (!invoice.value) return false
    return authStore.isContaduria || authStore.isAdmin
  })

  const canUploadISR = computed(() => {
    if (!invoice.value) return false
    const validStatuses = ['contrasena_generada', 'retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado']
    return (authStore.isContaduria || authStore.isAdmin) && validStatuses.includes(invoice.value.status)
  })

  const canUploadIVA = computed(() => {
    if (!invoice.value) return false
    const validStatuses = ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado']
    return (authStore.isContaduria || authStore.isAdmin) && validStatuses.includes(invoice.value.status)
  })

  const canUploadProof = computed(() => {
    if (!invoice.value) return false
    const validStatuses = ['retencion_iva_generada', 'pago_realizado', 'proceso_completado']
    return (authStore.isContaduria || authStore.isAdmin) && validStatuses.includes(invoice.value.status)
  })

  // Computed properties adicionales para el template
  const fileOptions = computed(() => {
    if (!invoice.value?.uploaded_files || !invoice.value.uploaded_files.length) return []
    return invoice.value.uploaded_files.map((file, index) => ({
      title: file.originalName,
      value: index
    }))
  })

  const currentFile = computed(() => {
    if (!invoice.value?.uploaded_files || !invoice.value.uploaded_files.length) return null
    return invoice.value.uploaded_files[selectedFileIndex.value] || invoice.value.uploaded_files[0]
  })

  const currentFileUrl = computed(() => {
    if (!currentFile.value) return null
    const token = localStorage.getItem('token')
    return `/api/invoices/${invoice.value.id}/view-file/${currentFile.value.filename}?token=${token}`
  })

  const hasPasswordFile = computed(() => {
    return invoice.value?.payment?.password_file ? true : false
  })

  const documentsProgress = computed(() => {
    if (!invoice.value) return 0
    
    // Usar el servicio de documentos para calcular el progreso según el tipo de proveedor
    const tipoProveedor = invoice.value.supplier?.tipo_proveedor || 'definitiva'
    const payment = invoice.value.payment || {}
    
    return calculateDocumentProgress(payment, tipoProveedor)
  })

  // Cargar datos de la factura
  const loadInvoice = async () => {
    loading.value = true
    try {
      const response = await axios.get(`/api/invoices/${route.params.id}`)
      invoice.value = response.data
      
      // Inicializar formulario de edición
      editForm.value = {
        amount: invoice.value.amount,
        description: invoice.value.description,
        priority: invoice.value.priority,
        due_date: invoice.value.due_date ? invoice.value.due_date.split('T')[0] : '',
        serie: invoice.value.serie || '',
        numero_dte: invoice.value.numero_dte || ''
      }
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast.error('Error al cargar la factura')
      if (error.response?.status === 404) {
        router.push('/invoices')
      }
    } finally {
      loading.value = false
    }
  }

  // Función para verificar si tiene documento
  const hasDocument = (type) => {
    if (!invoice.value) return false
    
    switch (type) {
      case 'isr':
        return invoice.value.payment?.isr_retention_file ? true : false
      case 'iva':
        return invoice.value.payment?.iva_retention_file ? true : false
      case 'proof':
        return invoice.value.payment?.payment_proof_file ? true : false
      default:
        return false
    }
  }

  // Funciones de manejo de archivos con inputs ocultos
  const handleISRUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      uploadISRFile(file)
    }
  }

  const handleIVAUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      uploadIVAFile(file)
    }
  }

  const handleProofUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      uploadProofFile(file)
    }
  }

  const handlePasswordUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      uploadPasswordFile(file)
    }
  }

  // Funciones de upload
  const uploadISRFile = async (file) => {
    uploadingISR.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'retention_isr')
    
    try {
      const response = await axios.post(`/api/invoices/${invoice.value.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Retención ISR subida exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading ISR:', error)
      toast.error('Error al subir la retención ISR')
    } finally {
      uploadingISR.value = false
    }
  }

  const uploadIVAFile = async (file) => {
    uploadingIVA.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'retention_iva')
    
    try {
      const response = await axios.post(`/api/invoices/${invoice.value.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Retención IVA subida exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading IVA:', error)
      toast.error('Error al subir la retención IVA')
    } finally {
      uploadingIVA.value = false
    }
  }

  const uploadProofFile = async (file) => {
    uploadingProof.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'payment_proof')
    
    try {
      const response = await axios.post(`/api/invoices/${invoice.value.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Comprobante de pago subido exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading payment proof:', error)
      toast.error('Error al subir el comprobante de pago')
    } finally {
      uploadingProof.value = false
    }
  }

  const uploadPasswordFile = async (file) => {
    if (!invoice.value || !invoice.value.id) {
      toast.error('Error: ID de factura no disponible')
      console.error('Invoice ID is undefined:', invoice.value)
      return
    }

    uploadingPassword.value = true
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', 'password_file')
    
    try {
      const response = await axios.post(`/api/invoices/${invoice.value.id}/upload-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Documento de contraseña subido exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error uploading password file:', error)
      toast.error('Error al subir el documento de contraseña')
    } finally {
      uploadingPassword.value = false
    }
  }

  // Funciones de reemplazo
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

  const triggerReplacePassword = () => {
    const input = document.getElementById('replace-password-input')
    if (input) input.click()
  }

  const replaceISR = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.put(`/api/invoices/${invoice.value.id}/replace-document/retention_isr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Retención ISR reemplazada exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing ISR:', error)
      toast.error('Error al reemplazar la retención ISR')
    } finally {
      replacingFile.value = false
      event.target.value = ''
    }
  }

  const replaceIVA = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.put(`/api/invoices/${invoice.value.id}/replace-document/retention_iva`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Retención IVA reemplazada exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing IVA:', error)
      toast.error('Error al reemplazar la retención IVA')
    } finally {
      replacingFile.value = false
      event.target.value = ''
    }
  }

  const replaceProof = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.put(`/api/invoices/${invoice.value.id}/replace-document/payment_proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Comprobante de pago reemplazado exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing payment proof:', error)
      toast.error('Error al reemplazar el comprobante de pago')
    } finally {
      replacingFile.value = false
      event.target.value = ''
    }
  }

  const replacePassword = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    replacingFile.value = true
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.put(`/api/invoices/${invoice.value.id}/replace-document/password_file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Documento de contraseña reemplazado exitosamente')
      // Recargar datos completos de la factura
      await loadInvoice()
    } catch (error) {
      console.error('Error replacing password file:', error)
      toast.error('Error al reemplazar el documento de contraseña')
    } finally {
      replacingFile.value = false
      event.target.value = ''
    }
  }

  // Generar contraseña
  const generatePassword = async () => {
    generatingPassword.value = true
    try {
      const response = await axios.post(`/api/invoices/${invoice.value.id}/generate-password`)
      invoice.value.payment = response.data.payment
      invoice.value.status = response.data.status
      toast.success('Contraseña generada exitosamente')
    } catch (error) {
      console.error('Error generating password:', error)
      toast.error('Error al generar la contraseña')
    } finally {
      generatingPassword.value = false
    }
  }

  // Copiar contraseña al portapapeles
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(invoice.value.payment.password_generated)
      toast.success('Contraseña copiada al portapapeles')
    } catch (error) {
      console.error('Error copying password:', error)
      toast.error('Error al copiar la contraseña')
    }
  }

  // Funciones de edición
  const startEdit = () => {
    editMode.value = true
  }

  const cancelEdit = () => {
    editMode.value = false
    // Restaurar valores originales
    editForm.value = {
      amount: invoice.value.amount,
      description: invoice.value.description,
      priority: invoice.value.priority,
      due_date: invoice.value.due_date ? invoice.value.due_date.split('T')[0] : ''
    }
  }

  const saveEdit = async () => {
    saving.value = true
    try {
      const response = await axios.put(`/api/invoices/${invoice.value.id}`, editForm.value)
      // El servidor devuelve {message: string, invoice: object}
      invoice.value = response.data.invoice
      editMode.value = false
      toast.success('Factura actualizada exitosamente')
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      saving.value = false
    }
  }

  // Funciones de descarga
  const downloadOriginalFile = async (file) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-file/${file.filename}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.originalName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast.error('Error al descargar el archivo')
    }
  }

  const downloadCurrentFile = async () => {
    if (currentFile.value) {
      await downloadOriginalFile(currentFile.value)
    }
  }

  const downloadISR = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `retencion_isr_${invoice.value.number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading ISR:', error)
      toast.error('Error al descargar la retención ISR')
    }
  }

  const downloadIVA = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `retencion_iva_${invoice.value.number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading IVA:', error)
      toast.error('Error al descargar la retención IVA')
    }
  }

  const downloadProof = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `comprobante_pago_${invoice.value.number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading payment proof:', error)
      toast.error('Error al descargar el comprobante de pago')
    }
  }

  const downloadPassword = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-password-file`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `password_${invoice.value.number}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading password file:', error)
      toast.error('Error al descargar el documento de contraseña')
    }
  }

  const openInNewTab = () => {
    if (currentFileUrl.value) {
      window.open(currentFileUrl.value, '_blank')
    }
  }

  const handleFrameError = () => {
    console.warn('Error loading file in iframe')
  }

  // Funciones de progreso y estado
  const getProgressColor = () => {
    const progress = documentsProgress.value
    if (progress === 100) return 'success'
    if (progress >= 66) return 'warning'
    return 'error'
  }

  const getCompletionText = () => {
    const progress = documentsProgress.value
    if (progress === 100) return 'Completado'
    if (progress >= 66) return 'Casi Completado'
    if (progress >= 33) return 'En Progreso'
    return 'Iniciando'
  }

  const getCompletionColor = () => {
    return getProgressColor()
  }

  // Funciones utilitarias
  const getStatusColor = (status) => {
    const colors = {
      'factura_subida': 'blue',
      'asignada_contaduria': 'orange',
      'en_proceso': 'purple',
      'contrasena_generada': 'cyan',
      'retencion_isr_generada': 'indigo',
      'retencion_iva_generada': 'teal',
      'pago_realizado': 'green',
      'proceso_completado': 'success'
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
      'proceso_completado': 'Proceso Completado'
    }
    return texts[status] || status
  }

  const getPriorityColor = (priority) => {
    const colors = {
      'baja': 'green',
      'media': 'orange',
      'alta': 'red'
    }
    return colors[priority] || 'grey'
  }

  const getPriorityText = (priority) => {
    const texts = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta'
    }
    return texts[priority] || priority
  }

  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf':
        return 'mdi-file-pdf-box'
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'mdi-file-image'
      default:
        return 'mdi-file-document'
    }
  }

  const getFileName = (filepath) => {
    if (!filepath) return ''
    return filepath.split('/').pop()
  }

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(number)
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Función de inicialización
  const initializeInvoiceManage = async () => {
    await loadInvoice()
  }

  return {
    // Estado reactivo
    loading,
    invoice,
    isrFile,
    ivaFile,
    proofFile,
    uploadingPassword,
    replaceFile,
    replaceDialog,
    selectedFileIndex,
    generatingPassword,
    uploadingISR,
    uploadingIVA,
    uploadingProof,
    replacingFile,
    
    // Edit state
    editMode,
    editForm,
    saving,
    
    // Computed properties
    canGeneratePassword,
    canUploadISR,
    canUploadIVA,
    canUploadProof,
    fileOptions,
    currentFile,
    currentFileUrl,
    hasPasswordFile,
    documentsProgress,
    
    // Funciones
    loadInvoice,
    hasDocument,
    generatePassword,
    copyPassword,
    uploadISRFile,
    uploadIVAFile,
    uploadProofFile,
    uploadPasswordFile,
    handleISRUpload,
    handleIVAUpload,
    handleProofUpload,
    handlePasswordUpload,
    triggerReplaceISR,
    triggerReplaceIVA,
    triggerReplaceProof,
    triggerReplacePassword,
    replaceISR,
    replaceIVA,
    replaceProof,
    replacePassword,
    downloadOriginalFile,
    downloadCurrentFile,
    downloadISR,
    downloadIVA,
    downloadProof,
    downloadPassword,
    openInNewTab,
    handleFrameError,
    getProgressColor,
    getCompletionText,
    getCompletionColor,
    getStatusColor,
    getStatusText,
    getPriorityColor,
    getPriorityText,
    getFileIcon,
    getFileName,
    formatNumber,
    formatFileSize,
    startEdit,
    cancelEdit,
    saveEdit,
    initializeInvoiceManage
  }
}