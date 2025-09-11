import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useNewInvoice() {
  const router = useRouter()
  const authStore = useAuthStore()
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

  const supplierInfo = computed(() => {
    return {
      business_name: authStore.user?.supplier_name || 'Nombre de la empresa',
      nit: authStore.user?.supplier_nit || 'NIT no disponible'
    }
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
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    const maxSize = 10 * 1024 * 1024 // 10MB
    const maxFiles = 5

    if (uploadedFiles.value.length + files.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`Tipo de archivo no válido: ${file.name}`)
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
    if (type.includes('pdf')) return 'mdi-file-pdf-box'
    if (type.includes('image')) return 'mdi-file-image'
    return 'mdi-file-document'
  }

  const getFileIconColor = (type) => {
    if (type.includes('pdf')) return '#ef4444'
    if (type.includes('image')) return '#10b981'
    return '#64748b'
  }

  const formatFileSize = (bytes) => {
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${kb.toFixed(1)} KB`
  }

  const submitInvoice = async () => {
    if (!valid.value) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    if (uploadedFiles.value.length === 0) {
      toast.error('Debe subir al menos un documento')
      return
    }

    submitting.value = true
    try {
      const formData = new FormData()
      formData.append('number', form.value.number)
      formData.append('amount', form.value.amount)
      formData.append('date', form.value.date)
      formData.append('due_date', form.value.due_date)
      formData.append('description', form.value.description)

      uploadedFiles.value.forEach((file, index) => {
        formData.append(`files`, file)
      })

      await axios.post('/api/invoices', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

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

  // Función de inicialización
  const initializeNewInvoice = () => {
    // Inicializar fecha actual
    form.value.date = new Date().toISOString().split('T')[0]
  }

  return {
    // Reactive state
    valid,
    submitting,
    isDragging,
    uploadedFiles,
    form,
    
    // Computed properties
    supplierInfo,
    
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
    initializeNewInvoice
  }
}
