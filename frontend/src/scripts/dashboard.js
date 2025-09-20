import { ref, onMounted, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useInvoicesStore } from '../stores/invoices'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import PaymentTrendsChart from '../components/PaymentTrendsChart.vue'

export function useDashboard() {
  const router = useRouter()
  const authStore = useAuthStore()
  const invoicesStore = useInvoicesStore()
  const toast = useToast()

  // Estados reactivos
  const availableDocuments = ref([])
  const workQueue = ref([])
  const stats = ref([])
  const paymentTrends = ref([])
  const loadingStats = ref(false)
  const refreshing = ref(false)
  
  // Auto-refresh interval
  let refreshInterval = null
  
  // Computed que se actualiza cuando cambian las estadísticas del dashboard
  const chartDataFromStats = computed(() => {
    const storeStats = invoicesStore.dashboardStats
    if (storeStats && storeStats.stats && Array.isArray(storeStats.stats)) {
      // Extraer datos para el gráfico desde las estadísticas del dashboard
      const paymentsCompleted = storeStats.stats.find(stat => stat.title === 'Pagos Completados')
      const totalInvoices = storeStats.stats.find(stat => stat.title === 'Total Facturas')
      
      if (paymentsCompleted && totalInvoices) {
        const paymentAmount = parseFloat(paymentsCompleted.value.replace(/[Q,]/g, '')) || 0
        const invoiceCount = parseInt(totalInvoices.value) || 0
        
        // Crear datos básicos para el gráfico basados en stats actuales
        return [
          { month: 'Jul', amount: Math.round(paymentAmount * 0.6), count: Math.round(invoiceCount * 0.6) },
          { month: 'Ago', amount: Math.round(paymentAmount * 0.8), count: Math.round(invoiceCount * 0.8) },
          { month: 'Sept', amount: paymentAmount, count: invoiceCount }
        ]
      }
    }
    return []
  })
  
  // Función para iniciar auto-refresh
  const startAutoRefresh = () => {
    // Limpiar intervalo existente si hay uno
    if (refreshInterval) {
      clearInterval(refreshInterval)
    }
    
    // Configurar nuevo intervalo (cada 15 segundos para mejor tiempo real)
    refreshInterval = setInterval(async () => {
      try {
        refreshing.value = true
        console.log('🔄 Auto-refresh iniciado...')
        await loadDashboardStats()
        await loadRecentInvoices()
        await loadPaymentTrends()
        
        // Actualizar datos específicos según el rol
        if (authStore.isProveedor) {
          await loadAvailableDocuments()
        } else if (authStore.isContaduria || authStore.isAdmin) {
          await loadWorkQueue()
          await loadPendingInvoices()
        }
        console.log('✅ Auto-refresh completado')
      } catch (error) {
        console.error('Error durante auto-refresh:', error)
      } finally {
        refreshing.value = false
      }
    }, 15000) // 15 segundos para mejor experiencia en tiempo real
  }
  
  // Función para detener auto-refresh
  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
  
  // Computed properties que se actualizan automáticamente desde el store
  const pendingInvoices = computed(() => {
    if (!invoicesStore.invoices || !Array.isArray(invoicesStore.invoices)) {
      return []
    }
    return invoicesStore.invoices
      .filter(invoice => 
        !['proceso_completado', 'rechazada'].includes(invoice.status)
      )
      .map(invoice => {
        const createdDate = new Date(invoice.created_at)
        const formattedDate = createdDate.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        
        return {
          ...invoice,
          supplier: invoice.supplier?.business_name || 'N/A',
          status: getStatusText(invoice.status),
          rawStatus: invoice.status,
          amount: parseFloat(invoice.amount || 0),
          date: formattedDate,
          supplier_name: invoice.supplier?.business_name || 'N/A',
          formatted_amount: parseFloat(invoice.amount || 0),
          formatted_date: formattedDate
        }
      })
  })
  
  const recentInvoices = computed(() => {
    if (!invoicesStore.invoices || !Array.isArray(invoicesStore.invoices)) {
      return []
    }
    return invoicesStore.invoices
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(invoice => {        
        const createdDate = new Date(invoice.created_at)
        const formattedDate = !isNaN(createdDate.getTime()) 
          ? createdDate.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
          : 'Fecha inválida'
        
        return {
          ...invoice,
          supplier: invoice.supplier?.business_name || 'N/A',
          status: getStatusText(invoice.status),
          rawStatus: invoice.status,
          amount: parseFloat(invoice.amount || 0),
          date: formattedDate,
          supplier_name: invoice.supplier?.business_name || 'N/A',
          formatted_amount: parseFloat(invoice.amount || 0),
          formatted_date: formattedDate
        }
      })
  })
  
  const dashboardStats = computed(() => invoicesStore.dashboardStats)
  const loadingRecentInvoices = ref(false)
  const loadingTrends = ref(false)

  // Headers de la tabla de facturas recientes
  const invoiceHeaders = [
    { title: 'No. Factura', key: 'number', width: '140px' },
    { title: 'Proveedor', key: 'supplier' },
    { title: 'Monto', key: 'amount', width: '120px' },
    { title: 'Estado', key: 'status', width: '120px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '180px' }
  ]

  // ================== FUNCIONES AUXILIARES ==================

  const getStatusText = (status) => {
    const statusLabels = {
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
    return statusLabels[status] || status
  }

  // ================== FUNCIONES DE CARGA DE DATOS ==================

  const loadDashboardStats = async () => {
    try {
      loadingStats.value = true
      console.log('📊 Cargando estadísticas dashboard...')
      
      // Cargar estadísticas desde el store
      await invoicesStore.loadDashboardStats()
      
      // También cargar las facturas para tener datos actualizados
      await invoicesStore.loadInvoices()
      
      // Usar estadísticas del store directamente - el backend devuelve stats como array
      const storeStats = invoicesStore.dashboardStats
      if (storeStats && storeStats.stats && Array.isArray(storeStats.stats)) {
        // Si el backend devuelve estadísticas estructuradas, usarlas directamente
        stats.value = storeStats.stats
      } else {
        // Datos de fallback en caso de error
        stats.value = [
          {
            title: 'Total Facturas',
            value: storeStats?.summary?.total_invoices?.toString() || '0',
            emoji: '📊',
            colorClass: 'primary'
          },
          {
            title: 'Pagos Completados',
            value: '0',
            emoji: '✅',
            colorClass: 'success'
          },
          {
            title: 'En Proceso',
            value: '0',
            emoji: '⏳',
            colorClass: 'warning'
          },
          {
            title: 'Rechazadas',
            value: '0',
            emoji: '❌',
            colorClass: 'error'
          }
        ]
      }
      console.log('✅ Estadísticas cargadas:', stats.value)
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
      toast.error('Error al cargar estadísticas')
    } finally {
      loadingStats.value = false
    }
  }

  // Función de refresco del dashboard
  const refreshDashboard = async () => {
    try {
      refreshing.value = true
      console.log('🔄 Refrescando dashboard...')
      
      await Promise.all([
        loadDashboardStats(),
        loadPaymentTrends()
      ])
      
      toast.success('Dashboard actualizado')
    } catch (error) {
      console.error('❌ Error refrescando dashboard:', error)
      toast.error('Error al actualizar el dashboard')
    } finally {
      refreshing.value = false
    }
  }

  const loadPaymentTrends = async () => {
    try {
      loadingTrends.value = true
      console.log('📊 Cargando tendencias de pagos...')
      const response = await axios.get('/api/dashboard/payment-trends', {
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      })
      
      if (response.data && response.data.trends && Array.isArray(response.data.trends)) {
        paymentTrends.value = response.data.trends
        console.log('✅ Tendencias API cargadas:', paymentTrends.value)
      } else {
        // Fallback usando datos calculados desde stats
        console.log('🔄 Usando datos calculados desde stats del dashboard')
        paymentTrends.value = chartDataFromStats.value.length > 0 ? chartDataFromStats.value : [
          { month: 'Ene', amount: 15000, count: 5 },
          { month: 'Feb', amount: 18000, count: 6 },
          { month: 'Mar', amount: 22000, count: 7 },
          { month: 'Abr', amount: 25000, count: 8 },
          { month: 'May', amount: 28000, count: 9 },
          { month: 'Jun', amount: 32000, count: 10 }
        ]
      }
      console.log('✅ Tendencias finales:', paymentTrends.value)
    } catch (error) {
      console.error('Error loading payment trends:', error)
      // Usar datos calculados en caso de error
      paymentTrends.value = chartDataFromStats.value.length > 0 ? chartDataFromStats.value : [
        { month: 'Jul', amount: 0, count: 0 },
        { month: 'Ago', amount: 0, count: 0 },
        { month: 'Sept', amount: 0, count: 0 }
      ]
      console.log('🔧 Fallback trends aplicado:', paymentTrends.value)
    } finally {
      loadingTrends.value = false
    }
  }

  const loadRecentInvoices = async () => {
    try {
      loadingRecentInvoices.value = true
      console.log('🧾 Cargando facturas recientes...')
      
      // Cargar facturas en el store si no están cargadas
      if (invoicesStore.invoices.length === 0) {
        await invoicesStore.loadInvoices()
      }
      
      console.log('✅ Facturas recientes cargadas:', recentInvoices.value.length)
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
      availableDocuments.value = response.data.invoices || []
    } catch (error) {
      console.error('Error loading available documents:', error)
      // Datos de fallback
      availableDocuments.value = []
    }
  }

  const downloadDocument = async (doc, invoice) => {
    try {
      const response = await axios.get(doc.downloadUrl, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `${doc.title}-${invoice.number}.pdf`
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
      // Cargar facturas en el store si no están cargadas
      if (invoicesStore.invoices.length === 0) {
        await invoicesStore.loadInvoices()
      }
      
      console.log('✅ Facturas pendientes cargadas:', pendingInvoices.value.length)
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
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Fecha inválida'
    
    return date.toLocaleDateString('es-ES', { 
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
    
    try {
      // Cargar estadísticas generales
      await loadDashboardStats()
      await loadRecentInvoices()
      await loadPaymentTrends()
      
      // Cargar datos específicos según el rol
      if (authStore.isProveedor) {
        await loadAvailableDocuments()
      } else if (authStore.isContaduria || authStore.isAdmin) {
        await loadWorkQueue()
        await loadPendingInvoices()
      }
      
      // Iniciar auto-refresh después de la carga inicial
      startAutoRefresh()
      
      console.log('✅ Dashboard carga completa')
    } catch (error) {
      console.error('❌ Error durante la inicialización del dashboard:', error)
      toast.error('Error al cargar los datos del dashboard')
    }
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
    recentInvoices,
    paymentTrends,
    chartDataFromStats,
    loadingStats,
    loadingRecentInvoices,
    loadingTrends,
    invoiceHeaders,
    
    // Functions
    loadDashboardStats,
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
    getStatusText,
    getStatusInitials,
    viewAllInvoices,
    viewInvoice,
    editInvoice,
    canEdit,
    getStatusClass,
    formatDate,
    formatNumber,
    initializeDashboard,
    startAutoRefresh,
    stopAutoRefresh,
    refreshing
  }
}
