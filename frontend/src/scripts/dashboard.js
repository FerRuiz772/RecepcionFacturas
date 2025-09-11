import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import PaymentTrendsChart from '../components/PaymentTrendsChart.vue'

export function useDashboard() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()

  // Estados reactivos
  const availableDocuments = ref([])
  const workQueue = ref([])
  const pendingInvoices = ref([])
  const stats = ref([])
  const invoiceStatus = ref([])
  const recentInvoices = ref([])
  const paymentTrends = ref([])
  const loadingStats = ref(false)
  const loadingRecentInvoices = ref(false)
  const loadingTrends = ref(false)

  // Headers de la tabla de facturas recientes
  const invoiceHeaders = [
    { title: 'No. Factura', key: 'number', width: '140px' },
    { title: 'Proveedor', key: 'supplier' },
    { title: 'Monto', key: 'amount', width: '120px' },
    { title: 'Estado', key: 'status', width: '120px' },
    { title: 'Fecha', key: 'date', width: '100px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '180px' }
  ]

  // ================== FUNCIONES DE CARGA DE DATOS ==================

  const loadDashboardStats = async () => {
    try {
      loadingStats.value = true
      console.log('📊 Cargando estadísticas dashboard...')
      const response = await axios.get('/api/dashboard/stats')
      stats.value = response.data.stats || [
        {
          title: 'Total Facturas',
          value: '24',
          emoji: '📊',
          colorClass: 'primary',
          trend: 'up',
          change: '+12%'
        },
        {
          title: 'Pagos Completados',
          value: '18',
          emoji: '✅',
          colorClass: 'success',
          trend: 'up',
          change: '+8%'
        },
        {
          title: 'En Proceso',
          value: '4',
          emoji: '⏳',
          colorClass: 'warning',
          trend: 'down',
          change: '-2%'
        },
        {
          title: 'Pendientes',
          value: '2',
          emoji: '📄',
          colorClass: 'info',
          trend: 'down',
          change: '-5%'
        }
      ]
      console.log('✅ Estadísticas cargadas:', stats.value)
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      loadingStats.value = false
    }
  }

  const loadInvoiceStatus = async () => {
    try {
      console.log('📈 Cargando estado de facturas...')
      const response = await axios.get('/api/dashboard/invoice-status')
      invoiceStatus.value = response.data.invoiceStatus || [
        {
          name: 'Pendientes',
          count: 5,
          percentage: 20,
          emoji: '⏳',
          class: 'pending'
        },
        {
          name: 'En Proceso',
          count: 8,
          percentage: 32,
          emoji: '🔄',
          class: 'processing'
        },
        {
          name: 'Completadas',
          count: 12,
          percentage: 48,
          emoji: '✅',
          class: 'completed'
        }
      ]
      console.log('✅ Estados cargados:', invoiceStatus.value)
    } catch (error) {
      console.error('Error loading invoice status:', error)
    }
  }

  const loadPaymentTrends = async () => {
    try {
      loadingTrends.value = true
      console.log('📊 Cargando tendencias de pagos...')
      const response = await axios.get('/api/dashboard/payment-trends')
      paymentTrends.value = response.data.trends || [
        { month: 'Ene', amount: 15000 },
        { month: 'Feb', amount: 18000 },
        { month: 'Mar', amount: 22000 },
        { month: 'Abr', amount: 25000 },
        { month: 'May', amount: 28000 },
        { month: 'Jun', amount: 32000 }
      ]
      console.log('✅ Tendencias cargadas:', paymentTrends.value)
    } catch (error) {
      console.error('Error loading payment trends:', error)
      toast.error('Error al cargar tendencias de pagos')
    } finally {
      loadingTrends.value = false
    }
  }

  const loadRecentInvoices = async () => {
    try {
      loadingRecentInvoices.value = true
      console.log('🧾 Cargando facturas recientes...')
      const response = await axios.get('/api/dashboard/recent-invoices?limit=8')
      recentInvoices.value = response.data.invoices || [
        {
          id: 1,
          number: 'F-2024-001',
          supplier: 'Proveedor ABC',
          amount: 15000,
          status: 'Completado',
          rawStatus: 'proceso_completado',
          date: new Date().toISOString(),
          canEdit: false
        },
        {
          id: 2,
          number: 'F-2024-002',
          supplier: 'Empresa XYZ',
          amount: 8500,
          status: 'En Proceso',
          rawStatus: 'en_proceso',
          date: new Date(Date.now() - 86400000).toISOString(),
          canEdit: true
        },
        {
          id: 3,
          number: 'F-2024-003',
          supplier: 'Servicios DEF',
          amount: 12000,
          status: 'Pendiente',
          rawStatus: 'factura_subida',
          date: new Date(Date.now() - 172800000).toISOString(),
          canEdit: true
        }
      ]
      console.log('✅ Facturas recientes cargadas:', recentInvoices.value)
    } catch (error) {
      console.error('Error loading recent invoices:', error)
    } finally {
      loadingRecentInvoices.value = false
    }
  }

  // Funciones específicas para proveedores
  const loadAvailableDocuments = async () => {
    if (!authStore.isProveedor) return
    
    try {
      const response = await axios.get('/api/dashboard/available-documents')
      availableDocuments.value = response.data.documents || [
        {
          id: 1,
          title: 'Retención ISR',
          type: 'retention_isr',
          invoiceNumber: 'F-2024-001',
          date: new Date().toISOString(),
          downloadUrl: '/api/documents/1/download'
        },
        {
          id: 2,
          title: 'Comprobante de Pago',
          type: 'payment_proof',
          invoiceNumber: 'F-2024-002',
          date: new Date(Date.now() - 86400000).toISOString(),
          downloadUrl: '/api/documents/2/download'
        }
      ]
    } catch (error) {
      console.error('Error loading available documents:', error)
    }
  }

  const downloadDocument = async (doc) => {
    try {
      const response = await axios.get(doc.downloadUrl, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.title}-${doc.invoiceNumber}.pdf`
      link.click()
      toast.success('Documento descargado')
    } catch (error) {
      toast.error('Error al descargar documento')
    }
  }

  // Funciones específicas para contaduría
  const loadWorkQueue = async () => {
    if (!authStore.isContaduria && !authStore.isAdmin) return
    
    try {
      const response = await axios.get('/api/dashboard/work-queue')
      workQueue.value = response.data.tasks || [
        {
          id: 1,
          action: 'Revisar factura nueva',
          supplier: 'ABC Servicios',
          invoiceNumber: 'F-2024-005',
          priority: 'Alta',
          timeAgo: '2h',
          invoiceId: 5
        },
        {
          id: 2,
          action: 'Generar retención ISR',
          supplier: 'XYZ Corp',
          invoiceNumber: 'F-2024-004',
          priority: 'Media',
          timeAgo: '4h',
          invoiceId: 4
        },
        {
          id: 3,
          action: 'Procesar pago',
          supplier: 'DEF Ltd',
          invoiceNumber: 'F-2024-003',
          priority: 'Baja',
          timeAgo: '1d',
          invoiceId: 3
        }
      ]
    } catch (error) {
      console.error('Error loading work queue:', error)
    }
  }

  const loadPendingInvoices = async () => {
    if (!authStore.isContaduria && !authStore.isAdmin) return
    
    try {
      const response = await axios.get('/api/dashboard/pending-invoices')
      pendingInvoices.value = response.data.invoices || [
        {
          id: 1,
          supplier: 'Proveedor ABC',
          number: 'F-2024-001',
          amount: 15000,
          status: 'asignada_contaduria'
        },
        {
          id: 2,
          supplier: 'Empresa XYZ',
          number: 'F-2024-002',
          amount: 8500,
          status: 'en_proceso'
        },
        {
          id: 3,
          supplier: 'Servicios DEF',
          number: 'F-2024-003',
          amount: 12000,
          status: 'factura_subida'
        }
      ]
    } catch (error) {
      console.error('Error loading pending invoices:', error)
    }
  }

  const goToInvoiceManagement = (invoiceId) => {
    router.push(`/invoices/${invoiceId}/manage`)
  }

  const downloadInvoiceFiles = async (invoiceId) => {
    try {
      const response = await axios.get(`/api/invoices/${invoiceId}/download-invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${invoiceId}.pdf`
      link.click()
      toast.success('Facturas descargadas')
    } catch (error) {
      toast.error('Error al descargar facturas')
    }
  }

  // ================== FUNCIONES DE UTILIDAD ==================

  const getDocumentEmoji = (type) => {
    const emojis = {
      'retention_isr': '📊',
      'retention_iva': '📈',
      'payment_proof': '💳'
    }
    return emojis[type] || '📄'
  }

  const getTaskPriorityColor = (priority) => {
    const colors = {
      'Alta': 'error',
      'Media': 'warning',
      'Baja': 'success'
    }
    return colors[priority] || 'grey'
  }

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

  const getStatusInitials = (status) => {
    const initials = {
      'factura_subida': 'FS',
      'asignada_contaduria': 'AC',
      'en_proceso': 'EP',
      'contrasena_generada': 'CG',
      'retencion_isr_generada': 'IR',
      'retencion_iva_generada': 'IV',
      'pago_realizado': 'PR',
      'proceso_completado': 'PC',
      'rechazada': 'RX'
    }
    return initials[status] || 'XX'
  }

  const viewAllInvoices = () => {
    router.push('/invoices')
  }

  const viewInvoice = (invoice) => {
    router.push(`/invoices/${invoice.id}`)
  }

  const editInvoice = (invoice) => {
    router.push(`/invoices/${invoice.id}/edit`)
  }

  const canEdit = (invoice) => {
    if (authStore.isProveedor) {
      return invoice.canEdit
    }
    return authStore.isContaduria || authStore.isAdmin
  }

  const getStatusClass = (status) => {
    const classes = {
      'en_proceso': 'processing-chip',
      'proceso_completado': 'completed-chip',
      'factura_subida': 'pending-chip',
      'asignada_contaduria': 'assigned-chip',
      'rechazada': 'rejected-chip'
    }
    return classes[status] || 'default-chip'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-GT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatNumber = (num) => {
    if (num == null || num === undefined) return '0.00'
    const number = parseFloat(num)
    if (isNaN(number)) return '0.00'
    return number.toLocaleString('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const initializeDashboard = async () => {
    console.log('🚀 Dashboard onMounted iniciado')
    
    // Cargar estadísticas generales
    await loadDashboardStats()
    await loadInvoiceStatus()
    await loadRecentInvoices()
    await loadPaymentTrends()
    
    // Cargar datos específicos según el rol
    if (authStore.isProveedor) {
      await loadAvailableDocuments()
    } else if (authStore.isContaduria || authStore.isAdmin) {
      await loadWorkQueue()
      await loadPendingInvoices()
    }
    
    console.log('✅ Dashboard carga completa')
  }

  // Exponer todo lo necesario
  return {
    // Components
    PaymentTrendsChart,
    
    // Reactive state
    availableDocuments,
    workQueue,
    pendingInvoices,
    stats,
    invoiceStatus,
    recentInvoices,
    paymentTrends,
    loadingStats,
    loadingRecentInvoices,
    loadingTrends,
    invoiceHeaders,
    
    // Functions
    loadDashboardStats,
    loadInvoiceStatus,
    loadPaymentTrends,
    loadRecentInvoices,
    loadAvailableDocuments,
    downloadDocument,
    loadWorkQueue,
    loadPendingInvoices,
    goToInvoiceManagement,
    downloadInvoiceFiles,
    getDocumentEmoji,
    getTaskPriorityColor,
    getStatusColor,
    getStatusInitials,
    viewAllInvoices,
    viewInvoice,
    editInvoice,
    canEdit,
    getStatusClass,
    formatDate,
    formatNumber,
    initializeDashboard
  }
}
