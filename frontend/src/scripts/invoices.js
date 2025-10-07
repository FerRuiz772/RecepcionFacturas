import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useInvoices() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  const exportToExcel = async () => {
  try {
    loading.value = true;
    
    // Construir query params con los filtros actuales
    const params = new URLSearchParams();
    if (filters.value.status) params.append('status', filters.value.status);
    if (filters.value.supplier_id) params.append('supplier_id', filters.value.supplier_id);
    if (filters.value.tipo_proveedor) params.append('tipo_proveedor', filters.value.tipo_proveedor);  // ✅ Cambiado
    if (filters.value.search) params.append('search', filters.value.search);
    if (filters.value.start_date) params.append('date_from', filters.value.start_date);
    if (filters.value.end_date) params.append('date_to', filters.value.end_date);

    const response = await fetch(`/api/invoices/export/excel?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al exportar');
    }

    // Descargar el archivo
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facturas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log('✅ Archivo Excel descargado exitosamente');
  } catch (error) {
    console.error('❌ Error exportando a Excel:', error);
    alert('Error al exportar a Excel: ' + error.message);
  } finally {
    loading.value = false;
  }
};

  // Estados reactivos
  const loading = ref(false)
  const invoices = ref([])
  const suppliers = ref([])
  const users = ref([])
  const totalInvoices = ref(0)
  const itemsPerPage = ref(10)

  const filters = ref({
    status: null,
    supplier_id: null,
    tipo_proveedor: null,  // ✅ Cambiado de assigned_to a tipo_proveedor
    search: '',
    start_date: '',
    end_date: ''
  })

  const regimenOptions = [
    { title: 'Régimen Definitiva ISR', value: 'definitiva' },
    { title: 'Pagos Trimestrales', value: 'pagos_trimestrales' },
    { title: 'Pequeño Contribuyente', value: 'pequeno_contribuyente' },
    { title: 'Pagos Trimestrales - Agente Retención', value: 'pagos_trimestrales_retencion' }
  ]

  const tipoProveedorLabels = {
    'definitiva': 'Régimen Definitiva ISR',
    'pagos_trimestrales': 'Pagos Trimestrales',
    'pequeno_contribuyente': 'Pequeño Contribuyente',
    'pagos_trimestrales_retencion': 'Pagos Trimestrales - Agente Retención'
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
      baseHeaders.splice(-1, 0, { title: 'Régimen', key: 'tipo_proveedor', width: '150px' })  // ✅ Cambiado de 'Asignado a' a 'Régimen'
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
             filters.value.tipo_proveedor ||  // ✅ Cambiado de assigned_to
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

  const hasPasswordFile = (invoice) => {
    return ['pago_realizado', 'proceso_completado'].includes(invoice.status)
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
      // Manejar diferentes estructuras de respuesta del API
      if (response.data.success && response.data.data) {
        suppliers.value = response.data.data.suppliers || []
      } else {
        suppliers.value = response.data.suppliers || response.data || []
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
      suppliers.value = []
    }
  }

  const loadUsers = async () => {
    if (authStore.isProveedor) return
    
    try {
      console.log('🔍 Cargando usuarios para filtro...')
      const response = await axios.get('/api/users?role=trabajador_contaduria,admin_contaduria')
      console.log('📊 Respuesta de usuarios:', response.data)
      
      // Manejar diferentes estructuras de respuesta del API
      if (response.data.success && response.data.data) {
        users.value = response.data.data.users || []
      } else {
        users.value = response.data.users || response.data || []
      }
      
      console.log('👥 Usuarios cargados para filtro:', users.value.length, users.value)
    } catch (error) {
      console.error('Error loading users:', error)
      users.value = []
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

  const downloadPasswordFile = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-password-file`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `contrasena-${invoice.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Archivo de contraseña descargado')
    } catch (error) {
      toast.error('Error al descargar archivo de contraseña')
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
    filters,
    statusOptions,
    regimenOptions,  // ✅ Agregado
    tipoProveedorLabels,  // ✅ Agregado
    
    // Computed
    headers,
    availableStatuses,
    hasActiveFilters,
    
    // Functions
    hasRetentionISR,
    hasRetentionIVA,
    hasPaymentProof,
    hasPasswordFile,
    canGeneratePassword,
    loadInvoices,
    loadSuppliers,
    loadUsers,
    downloadInvoiceFiles,
    downloadRetentionISR,
    downloadRetentionIVA,
    downloadPaymentProof,
    downloadPasswordFile,
    generatePassword,
    viewInvoice,
    manageInvoice,
    reassignInvoice,
    applyFilters,
    resetFilters,
    debounceSearch,
    getStatusColor,
    formatNumber,
    formatDate,
    getStatusText,
    exportToExcel,
    initializeInvoices
  }
}