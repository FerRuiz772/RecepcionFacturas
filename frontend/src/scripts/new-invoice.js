import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useInvoicesStore } from '../stores/invoices'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useNewInvoice() {
  const router = useRouter()
  const authStore = useAuthStore()
  const invoicesStore = useInvoicesStore()
  const toast = useToast()

  const valid = ref(false)
  const submitting = ref(false)
  const isDragging = ref(false)
  const uploadedFiles = ref([])

  const form = ref({
    number: '',
    amount: '',
    date: '',
    due_date: '',
    description: ''
  })

  // Edit mode when loading an existing invoice
  const editMode = ref(false)
  const currentInvoiceId = ref(null)
  const rejectDialog = ref(false)
  const rejectReason = ref('')

  const supplierInfo = computed(() => {
    return {
      business_name: authStore.user?.supplier_name || 'Nombre de la empresa',
      nit: authStore.user?.supplier_nit || 'NIT no disponible'
    }
  })

  const isProvider = computed(() => {
    return authStore.user?.role === 'proveedor'
  })

  const goBack = () => {
    if (form.value.number || form.value.description || uploadedFiles.value.length > 0) {
      if (confirm('¿Estás seguro? Se perderán los cambios no guardados.')) {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    processFiles(files)
    event.target.value = ''
  }

  const handleDrop = (event) => {
    isDragging.value = false
    const files = Array.from(event.dataTransfer.files)
    processFiles(files)
  }

  const processFiles = (files) => {
    const validTypes = ['application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB
    const maxFiles = 5

    if (uploadedFiles.value.length + files.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`Solo se permiten archivos PDF: ${file.name}`)
        return
      }

      if (file.size > maxSize) {
        toast.error(`Archivo muy grande: ${file.name} (máximo 10MB)`)
        return
      }

      uploadedFiles.value.push(file)
    })
  }

  const removeFile = (index) => {
    uploadedFiles.value.splice(index, 1)
  }

  const getFileIcon = (type) => {
    return 'mdi-file-pdf-box' // Solo PDFs ahora
  }

  const getFileIconColor = (type) => {
    return '#ef4444' // Color rojo para PDFs
  }

  const formatFileSize = (bytes) => {
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${kb.toFixed(1)} KB`
  }

  const submitInvoice = async () => {
    // Para proveedores solo validar archivos, para contaduría validar formulario completo
    if (!isProvider.value && !valid.value) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    // Validar monto si no es proveedor
    if (!isProvider.value && (!form.value.amount || parseFloat(form.value.amount) <= 0)) {
      toast.error('El monto debe ser mayor a 0')
      return
    }

    if (uploadedFiles.value.length === 0) {
      toast.error('Debe subir al menos un documento')
      return
    }

    submitting.value = true
    try {
      const formData = new FormData()
      
      // Solo incluir datos del formulario si no es proveedor
      if (!isProvider.value) {
        formData.append('number', form.value.number)
        formData.append('amount', form.value.amount)
        formData.append('date', form.value.date)
        formData.append('due_date', form.value.due_date)
        formData.append('description', form.value.description)
      }

      uploadedFiles.value.forEach((file, index) => {
        formData.append(`files`, file)
      })

      await axios.post('/api/invoices', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      // Actualizar el store de facturas para que el dashboard se actualice
      await invoicesStore.loadInvoices()
      await invoicesStore.loadDashboardStats()

      toast.success('Factura enviada exitosamente')
      setTimeout(() => {
        router.push('/invoices')
      }, 1500)

    } catch (error) {
      console.error('Error al enviar factura:', error)
      toast.error(error.response?.data?.error || 'Error al enviar la factura')
    } finally {
      submitting.value = false
    }
  }

  // Cargar factura existente si vinimos en modo edición (query ?invoiceId=)
  const route = useRoute()
  const loadExistingInvoice = async () => {
    const invoiceId = route.query.invoiceId || route.params?.id
    if (!invoiceId) return
    try {
      const { data } = await axios.get(`/api/invoices/${invoiceId}`)
      const inv = data.invoice || data
      // Rellenar formulario con datos existentes
      form.value.number = inv.number || ''
      form.value.amount = inv.amount || ''
      form.value.date = inv.date ? inv.date.split('T')[0] : ''
      form.value.due_date = inv.due_date ? inv.due_date.split('T')[0] : ''
      form.value.description = inv.description || ''
      // Mapear archivos subidos para visualización (no son File objects)
      uploadedFiles.value = (inv.uploaded_files || []).map(f => ({
        name: f.originalName || f.filename || 'archivo.pdf',
        size: f.size || 0,
        type: f.mimetype || 'application/pdf',
        remote: true,
        id: f.id
      }))
      editMode.value = true
      currentInvoiceId.value = invoiceId
    } catch (err) {
      console.error('Error cargando factura existente:', err)
    }
  }

  const openRejectDialog = () => {
    rejectReason.value = ''
    rejectDialog.value = true
  }

  const confirmReject = async () => {
    if (!rejectReason.value || !rejectReason.value.trim()) {
      return toast.error('Debe proporcionar una razón para rechazar la factura')
    }
    if (!currentInvoiceId.value) {
      return toast.error('Factura no identificada')
    }
    try {
      await axios.put(`/api/invoices/${currentInvoiceId.value}/reject`, { reason: rejectReason.value })
      rejectDialog.value = false
      toast.success('Factura rechazada y proveedor notificado')
      // Actualizar listados
      await invoicesStore.loadInvoices()
      // Redirigir a lista de facturas
      router.push('/invoices')
    } catch (error) {
      console.error('Error rechazando factura:', error)
      toast.error(error.response?.data?.error || 'Error al rechazar la factura')
    }
  }

  // Función de inicialización
  const initializeNewInvoice = () => {
    // Inicializar fecha actual
    form.value.date = new Date().toISOString().split('T')[0]
    // Intentar cargar una factura existente si se pasó invoiceId
    loadExistingInvoice()
  }

  return {
    // Reactive state
    valid,
    submitting,
    isDragging,
    uploadedFiles,
    form,
    editMode,
    currentInvoiceId,
    rejectDialog,
    rejectReason,
    
    // Computed properties
    supplierInfo,
    isProvider,
    
    // Functions
    goBack,
    handleFileSelect,
    handleDrop,
    processFiles,
    removeFile,
    getFileIcon,
    getFileIconColor,
    formatFileSize,
    submitInvoice,
    openRejectDialog,
    confirmReject,
    initializeNewInvoice
  }
}
