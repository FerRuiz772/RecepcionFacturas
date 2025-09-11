import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useInvoices() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()

  // Estados reactivos
  const loading = ref(false)
  const invoices = ref([])
  const suppliers = ref([])
  const users = ref([])
  const totalInvoices = ref(0)
  const itemsPerPage = ref(10)
  const statusDialog = ref(false)
  const selectedInvoice = ref(null)
  const newStatus = ref('')
  const statusNotes = ref('')

  const filters = ref({
    status: null,
    supplier_id: null,
    assigned_to: null,
    search: '',
    start_date: '',
    end_date: ''
  })

  // Funciones de exportación seguras sin dependencias externas
// Reemplazar las funciones en invoices.js

const exportToCSV = async () => {
  try {
    // Obtener todos los datos con filtros actuales
    const params = {
      ...filters.value,
      limit: 10000,
      export: true
    }

    // Filtrar parámetros vacíos
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await axios.get('/api/invoices', { params })
    const allInvoices = response.data.invoices

    // Crear headers CSV
    let headers = ['ID', 'No. Factura', 'Monto (Q)', 'Estado', 'Fecha Creación']
    
    if (!authStore.isProveedor) {
      headers.splice(2, 0, 'Proveedor', 'NIT', 'Asignado a')
    }
    
    headers.push('Descripción', 'Prioridad', 'Fecha Vencimiento')

    // Crear filas CSV
    const csvRows = [headers]
    
    allInvoices.forEach(invoice => {
      const row = [
        `ID-${invoice.id}`,
        invoice.number,
        parseFloat(invoice.amount).toFixed(2),
        getStatusText(invoice.status),
        formatDate(invoice.created_at)
      ]

      if (!authStore.isProveedor) {
        row.splice(2, 0, 
          invoice.supplier?.business_name || 'N/A',
          invoice.supplier?.nit || 'N/A',
          invoice.assignedUser?.name || 'Sin asignar'
        )
      }

      row.push(
        invoice.description || 'Sin descripción',
        invoice.priority || 'media',
        invoice.due_date ? formatDate(invoice.due_date) : 'Sin fecha'
      )

      csvRows.push(row)
    })

    // Convertir a CSV
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        // Escapar comillas y comas
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ).join('\n')

    // Agregar BOM para UTF-8 en Excel
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    
    // Descargar archivo
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `facturas_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`CSV exportado: ${allInvoices.length} facturas`)
  } catch (error) {
    console.error('Error exportando CSV:', error)
    toast.error('Error al exportar CSV')
  }
}

const exportToJSON = async () => {
  try {
    // Obtener datos
    const params = {
      ...filters.value,
      limit: 10000,
      export: true
    }

    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await axios.get('/api/invoices', { params })
    const allInvoices = response.data.invoices

    // Crear estructura JSON más limpia
    const exportData = {
      metadata: {
        exported_at: new Date().toISOString(),
        exported_by: authStore.user?.name || 'N/A',
        user_role: authStore.user?.role || 'N/A',
        total_invoices: allInvoices.length,
        total_amount: allInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0),
        filters_applied: {
          status: filters.value.status || 'Todos',
          supplier: suppliers.value.find(s => s.id === filters.value.supplier_id)?.business_name || 'Todos',
          assigned_to: users.value.find(u => u.id === filters.value.assigned_to)?.name || 'Todos',
          search: filters.value.search || null,
          date_range: {
            from: filters.value.start_date || null,
            to: filters.value.end_date || null
          }
        }
      },
      invoices: allInvoices.map(invoice => ({
        id: invoice.id,
        number: invoice.number,
        amount: parseFloat(invoice.amount),
        status: invoice.status,
        status_text: getStatusText(invoice.status),
        created_at: invoice.created_at,
        due_date: invoice.due_date,
        description: invoice.description,
        priority: invoice.priority,
        supplier: invoice.supplier ? {
          business_name: invoice.supplier.business_name,
          nit: invoice.supplier.nit
        } : null,
        assigned_user: invoice.assignedUser ? {
          name: invoice.assignedUser.name,
          email: invoice.assignedUser.email
        } : null
      }))
    }

    // Crear y descargar JSON
    const jsonContent = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json' })
    
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `facturas_${new Date().toISOString().slice(0, 10)}.json`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`JSON exportado: ${allInvoices.length} facturas`)
  } catch (error) {
    console.error('Error exportando JSON:', error)
    toast.error('Error al exportar JSON')
  }
}

const exportToPDF = async () => {
  try {
    toast.info('Generando reporte PDF...')
    
    const params = {
      ...filters.value,
      export_type: 'pdf'
    }

    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key]
      }
    })

    const response = await axios.get('/api/invoices/export/pdf', {
      params,
      responseType: 'blob'
    })

    const blob = new Blob([response.data], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    
    // Abrir en nueva ventana para que el usuario pueda imprimir/guardar como PDF
    const printWindow = window.open(url, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print()
        }, 500)
      }
    }
    
    window.URL.revokeObjectURL(url)
    toast.success('Reporte PDF generado - Use Ctrl+P para imprimir/guardar')
  } catch (error) {
    console.error('Error exportando PDF:', error)
    toast.error('Error al generar reporte PDF')
  }
}

// Función principal que ahora ofrece opciones
const exportInvoices = () => {
  // Esta función se reemplazará por los botones individuales
  toast.info('Use los botones específicos para exportar')
}

  const statusOptions = [
    { title: 'Factura Subida', value: 'factura_subida' },
    { title: 'Asignada Contaduría', value: 'asignada_contaduria' },
    { title: 'En Proceso', value: 'en_proceso' },
    { title: 'Contraseña Generada', value: 'contrasena_generada' },
    { title: 'Retención ISR', value: 'retencion_isr_generada' },
    { title: 'Retención IVA', value: 'retencion_iva_generada' },
    { title: 'Pago Realizado', value: 'pago_realizado' },
    { title: 'Proceso Completado', value: 'proceso_completado' },
    { title: 'Rechazada', value: 'rechazada' }
  ]

  const headers = computed(() => {
    const baseHeaders = [
      { title: 'ID', key: 'id', width: '80px' },
      { title: 'No. Factura', key: 'number', width: '140px' },
      { title: 'Monto', key: 'amount', width: '120px' },
      { title: 'Estado', key: 'status', width: '150px' },
      { title: 'Fecha', key: 'created_at', width: '120px' },
      { title: 'Acciones', key: 'actions', sortable: false, width: '320px' }
    ]

    if (!authStore.isProveedor) {
      baseHeaders.splice(2, 0, { title: 'Proveedor', key: 'supplier', width: '200px' })
      baseHeaders.splice(-1, 0, { title: 'Asignado a', key: 'assigned_to', width: '150px' })
    }

    return baseHeaders
  })

  const availableStatuses = computed(() => {
    if (!authStore.isContaduria && !authStore.isAdmin) return []
    
    return [
      { title: 'En Proceso', value: 'en_proceso' },
      { title: 'Contraseña Generada', value: 'contrasena_generada' },
      { title: 'Retención ISR', value: 'retencion_isr_generada' },
      { title: 'Retención IVA', value: 'retencion_iva_generada' },
      { title: 'Pago Realizado', value: 'pago_realizado' },
      { title: 'Proceso Completado', value: 'proceso_completado' },
      { title: 'Rechazada', value: 'rechazada' }
    ]
  })

  const hasActiveFilters = computed(() => {
    return !!(filters.value.status || 
             filters.value.supplier_id || 
             filters.value.assigned_to || 
             filters.value.search || 
             filters.value.start_date || 
             filters.value.end_date)
  })

  // Funciones para verificar disponibilidad de documentos (PROVEEDOR)
  const hasRetentionISR = (invoice) => {
    return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.status)
  }

  const hasRetentionIVA = (invoice) => {
    return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.status)
  }

  const hasPaymentProof = (invoice) => {
    return ['proceso_completado'].includes(invoice.status)
  }

  const canChangeStatus = (invoice) => {
    return authStore.isContaduria || authStore.isAdmin
  }

  const canGeneratePassword = (invoice) => {
    return ['en_proceso'].includes(invoice.status)
  }

  // Función principal para cargar facturas
  const loadInvoices = async (options = {}) => {
    loading.value = true
    try {
      const params = {
        page: options.page || 1,
        limit: options.itemsPerPage || itemsPerPage.value,
        ...filters.value
      }

      // Filtrar parámetros vacíos
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await axios.get('/api/invoices', { params })
      invoices.value = response.data.invoices
      totalInvoices.value = response.data.total
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Error al cargar las facturas')
    } finally {
      loading.value = false
    }
  }

  const loadSuppliers = async () => {
    if (authStore.isProveedor) return
    
    try {
      const response = await axios.get('/api/suppliers')
      suppliers.value = response.data.suppliers || response.data
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }

  const loadUsers = async () => {
    if (authStore.isProveedor) return
    
    try {
      const response = await axios.get('/api/users?role=trabajador_contaduria,admin_contaduria')
      users.value = response.data.users || response.data
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  // Funciones de descarga para PROVEEDOR
  const downloadInvoiceFiles = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${invoice.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Factura descargada')
    } catch (error) {
      toast.error('Error al descargar factura')
    }
  }

  const downloadRetentionISR = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-isr-${invoice.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención ISR descargada')
    } catch (error) {
      toast.error('Error al descargar retención ISR')
    }
  }

  const downloadRetentionIVA = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-iva-${invoice.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención IVA descargada')
    } catch (error) {
      toast.error('Error al descargar retención IVA')
    }
  }

  const downloadPaymentProof = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `comprobante-pago-${invoice.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Comprobante de pago descargado')
    } catch (error) {
      toast.error('Error al descargar comprobante de pago')
    }
  }

  // Funciones adicionales
  const generatePassword = async (invoice) => {
    try {
      await axios.post(`/api/invoices/${invoice.id}/generate-password`)
      toast.success('Contraseña generada exitosamente')
      loadInvoices()
    } catch (error) {
      toast.error('Error al generar contraseña')
    }
  }

  const viewInvoice = (invoice) => {
    router.push(`/invoices/${invoice.id}`)
  }

  const manageInvoice = (invoice) => {
    router.push(`/invoices/${invoice.id}/manage`)
  }

  const viewInvoiceHistory = (invoice) => {
    router.push(`/invoices/${invoice.id}/history`)
  }

  const changeStatus = (invoice) => {
    selectedInvoice.value = invoice
    newStatus.value = invoice.status
    statusNotes.value = ''
    statusDialog.value = true
  }

  const updateStatus = async () => {
    try {
      await axios.put(`/api/invoices/${selectedInvoice.value.id}/status`, {
        status: newStatus.value,
        notes: statusNotes.value
      })

      toast.success('Estado actualizado exitosamente')
      statusDialog.value = false
      loadInvoices()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar el estado')
    }
  }

  const reassignInvoice = (invoice) => {
    toast.info('Función de reasignación en desarrollo')
  }

  const applyFilters = () => {
    loadInvoices()
  }

  const resetFilters = () => {
    filters.value = {
      status: null,
      supplier_id: null,
      assigned_to: null,
      search: '',
      start_date: '',
      end_date: ''
    }
    loadInvoices()
  }

  let searchTimeout
  const debounceSearch = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      loadInvoices()
    }, 500)
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

  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT').format(number)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-GT')
  }

  const getStatusText = (status) => {
    const texts = {
      'factura_subida': 'Subida',
      'asignada_contaduria': 'Asignada',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña',
      'retencion_isr_generada': 'ISR',
      'retencion_iva_generada': 'IVA',
      'pago_realizado': 'Pagado',
      'proceso_completado': 'Completado',
      'rechazada': 'Rechazada'
    }
    return texts[status] || status
  }

  const initializeInvoices = async () => {
    await loadInvoices()
    if (!authStore.isProveedor) {
      await loadSuppliers()
      await loadUsers()
    }
  }

  // Exponer todo lo necesario
  return {
    // Reactive state
    loading,
    invoices,
    suppliers,
    users,
    totalInvoices,
    itemsPerPage,
    statusDialog,
    selectedInvoice,
    newStatus,
    statusNotes,
    filters,
    statusOptions,
    
    // Computed
    headers,
    availableStatuses,
    hasActiveFilters,
    
    // Functions
    hasRetentionISR,
    hasRetentionIVA,
    hasPaymentProof,
    canChangeStatus,
    canGeneratePassword,
    loadInvoices,
    loadSuppliers,
    loadUsers,
    downloadInvoiceFiles,
    downloadRetentionISR,
    downloadRetentionIVA,
    downloadPaymentProof,
    generatePassword,
    viewInvoice,
    manageInvoice,
    viewInvoiceHistory,
    changeStatus,
    updateStatus,
    reassignInvoice,
    exportInvoices,
    exportToCSV,
    exportToJSON,
    exportToPDF,
    applyFilters,
    resetFilters,
    debounceSearch,
    getStatusColor,
    formatNumber,
    formatDate,
    getStatusText,
    initializeInvoices
  }
}
