<template>
  <div class="dashboard-layout">
    <!-- Usar componente AppSidebar -->
    <AppSidebar v-model="drawer" />

    <!-- Usar componente AppTopBar -->
    <AppTopBar v-model:sidebar-model="drawer" />

    <!-- Contenido principal -->
    <v-main class="main-content">
      <!-- Header de página -->
      <div class="page-header">
        <v-container>
          <div class="d-flex align-center justify-space-between">
            <div>
              <h1 class="page-title">Dashboard</h1>
              <p class="page-subtitle">Bienvenido de vuelta, {{ authStore.userName }}</p>
            </div>
            <div v-if="authStore.isProveedor">
              <v-btn 
                color="#0f172a" 
                variant="flat"
                prepend-icon="mdi-plus"
                class="action-button"
                @click="$router.push('/invoices/new')"
              >
                Nueva Factura
              </v-btn>
            </div>
          </div>
        </v-container>
      </div>

      <v-container>
        <!-- Tarjetas de estadísticas -->
        <v-row class="mb-8">
          <v-col cols="12" sm="6" lg="3" v-for="(stat, index) in stats" :key="index">
            <div class="stats-card">
              <div :class="['stats-icon', stat.colorClass]">
                <div class="stats-emoji">{{ stat.emoji }}</div>
              </div>
              <div class="stats-value">{{ stat.value }}</div>
              <div class="stats-label">{{ stat.title }}</div>
              <div :class="['stats-change', stat.trend === 'up' ? 'positive' : 'negative']">
                <v-icon size="14">{{ stat.trend === 'up' ? 'mdi-trending-up' : 'mdi-trending-down' }}</v-icon>
                {{ stat.change }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- SECCIÓN ESPECÍFICA POR ROL -->
        <!-- Dashboard del Proveedor -->
        <div v-if="authStore.isProveedor">
          <v-row class="mb-6">
            <!-- Acciones Rápidas -->
            <v-col cols="12" lg="4">
              <div class="content-card">
                <div class="card-header">
                  <div class="card-title">
                    <v-icon>mdi-lightning-bolt</v-icon>
                    Acciones Rápidas
                  </div>
                </div>
                <div class="quick-actions">
                  <v-btn
                    block
                    color="primary"
                    size="large"
                    class="mb-3"
                    @click="$router.push('/invoices/new')"
                  >
                    <v-icon class="mr-2">mdi-plus</v-icon>
                    Subir Nueva Factura
                  </v-btn>
                  <v-btn
                    block
                    variant="outlined"
                    size="large"
                    @click="$router.push('/invoices')"
                  >
                    <v-icon class="mr-2">mdi-history</v-icon>
                    Ver Mi Historial
                  </v-btn>
                </div>
              </div>
            </v-col>

            <!-- Documentos Disponibles para Descarga -->
            <v-col cols="12" lg="8">
              <div class="content-card">
                <div class="card-header">
                  <div class="card-title">
                    <v-icon>mdi-download</v-icon>
                    Documentos Disponibles
                  </div>
                </div>
                <div class="documents-section">
                  <div v-if="availableDocuments.length === 0" class="no-documents">
                    <v-icon size="48" color="#e2e8f0">mdi-file-outline</v-icon>
                    <p>No hay documentos disponibles para descargar</p>
                  </div>
                  <v-list v-else>
                    <v-list-item 
                      v-for="doc in availableDocuments" 
                      :key="doc.id"
                      class="document-item"
                    >
                      <template v-slot:prepend>
                        <div class="document-emoji">{{ getDocumentEmoji(doc.type) }}</div>
                      </template>
                      <v-list-item-title>{{ doc.title }}</v-list-item-title>
                      <v-list-item-subtitle>
                        Factura {{ doc.invoiceNumber }} • {{ formatDate(doc.date) }}
                      </v-list-item-subtitle>
                      <template v-slot:append>
                        <v-btn
                          variant="elevated"
                          color="primary"
                          size="small"
                          @click="downloadDocument(doc)"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Dashboard de Contaduría -->
        <div v-if="authStore.isContaduria || authStore.isAdmin">
          <v-row class="mb-6">
            <!-- Cola de Trabajo -->
            <v-col cols="12" lg="6">
              <div class="content-card">
                <div class="card-header">
                  <div class="card-title">
                    <v-icon>mdi-clipboard-list</v-icon>
                    Cola de Trabajo
                  </div>
                </div>
                <div class="work-queue">
                  <div v-if="workQueue.length === 0" class="no-work">
                    <v-icon size="48" color="#e2e8f0">mdi-check-all</v-icon>
                    <p>¡No hay tareas pendientes!</p>
                  </div>
                  <v-list v-else>
                    <v-list-item 
                      v-for="task in workQueue" 
                      :key="task.id"
                      class="work-item"
                      @click="goToInvoiceManagement(task.invoiceId)"
                    >
                      <template v-slot:prepend>
                        <v-chip 
                          :color="getTaskPriorityColor(task.priority)" 
                          size="small"
                          class="task-priority"
                        >
                          {{ task.priority }}
                        </v-chip>
                      </template>
                      <v-list-item-title>{{ task.action }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ task.supplier }} • Factura {{ task.invoiceNumber }}
                      </v-list-item-subtitle>
                      <template v-slot:append>
                        <div class="task-time">{{ task.timeAgo }}</div>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </div>
            </v-col>

            <!-- Facturas Pendientes de Procesar -->
            <v-col cols="12" lg="6">
              <div class="content-card">
                <div class="card-header">
                  <div class="card-title">
                    <v-icon>mdi-clock-outline</v-icon>
                    Facturas Pendientes
                  </div>
                </div>
                <div class="pending-invoices">
                  <div v-if="pendingInvoices.length === 0" class="no-work">
                    <v-icon size="48" color="#e2e8f0">mdi-check-all</v-icon>
                    <p>¡No hay facturas pendientes!</p>
                  </div>
                  <v-list v-else>
                    <v-list-item 
                      v-for="invoice in pendingInvoices" 
                      :key="invoice.id"
                      class="pending-item"
                      @click="goToInvoiceManagement(invoice.id)"
                    >
                      <template v-slot:prepend>
                        <v-avatar size="40" :color="getStatusColor(invoice.status)">
                          <span class="text-white text-caption">{{ getStatusInitials(invoice.status) }}</span>
                        </v-avatar>
                      </template>
                      <v-list-item-title>{{ invoice.supplier }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ invoice.number }} • Q{{ formatNumber(invoice.amount) }}
                      </v-list-item-subtitle>
                      <template v-slot:append>
                        <div class="invoice-actions">
                          <v-btn
                            variant="outlined"
                            color="success"
                            size="small"
                            @click.stop="downloadInvoiceFiles(invoice.id)"
                          >
                            <v-icon class="mr-1">mdi-download</v-icon>
                            Descargar
                          </v-btn>
                          <v-btn
                            variant="elevated"
                            color="primary"
                            size="small"
                            class="ml-2"
                            @click.stop="goToInvoiceManagement(invoice.id)"
                          >
                            <v-icon class="mr-1">mdi-cog</v-icon>
                            Gestionar
                          </v-btn>
                        </div>
                      </template>
                    </v-list-item>
                  </v-list>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Gráficos y métricas (común para todos) -->
        <v-row>
          <!-- Gráfico principal -->
          <v-col cols="12" lg="8">
            <div class="content-card">
              <div class="card-header">
                <div class="card-title">
                  <v-icon>mdi-chart-line</v-icon>
                  Tendencia de Pagos (Últimos 6 meses)
                </div>
              </div>
              <div class="chart-section">
                <div v-if="loadingTrends" class="chart-loading">
                  <v-progress-circular
                    color="primary"
                    indeterminate
                    size="48"
                  ></v-progress-circular>
                  <p class="mt-4">Cargando tendencias...</p>
                </div>
                <div v-else-if="paymentTrends.length === 0" class="chart-placeholder">
                  <v-icon size="64" color="#e2e8f0">mdi-chart-areaspline</v-icon>
                  <div class="chart-text">
                    <div class="chart-title">Sin datos disponibles</div>
                    <div class="chart-subtitle">No hay pagos registrados en los últimos 6 meses</div>
                  </div>
                </div>
                <PaymentTrendsChart 
                  v-else
                  :chart-data="paymentTrends"
                  :loading="loadingTrends"
                  class="chart-wrapper"
                />
              </div>
            </div>
          </v-col>

          <!-- Estado de facturas -->
          <v-col cols="12" lg="4">
            <div class="content-card">
              <div class="card-header">
                <div class="card-title">
                  <v-icon>mdi-file-document-outline</v-icon>
                  Estado de Facturas
                </div>
              </div>
              <div class="status-container">
                <div v-for="(status, index) in invoiceStatus" :key="index" :class="['status-indicator', status.class]">
                  <div class="status-header">
                    <span class="status-emoji">{{ status.emoji }}</span>
                    <div class="status-label">{{ status.name }}</div>
                  </div>
                  <div class="d-flex align-center justify-space-between">
                    <div class="status-count">{{ status.count }}</div>
                    <div class="status-percentage">{{ status.percentage }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Tabla de facturas recientes -->
        <v-row>
          <v-col cols="12">
            <div class="content-card">
              <div class="card-header">
                <div class="d-flex align-center justify-space-between">
                  <div class="card-title">
                    <v-icon>mdi-receipt-text-outline</v-icon>
                    Facturas Recientes
                  </div>
                  <v-btn 
                    variant="outlined" 
                    color="#64748b"
                    class="view-all-button"
                    @click="viewAllInvoices"
                  >
                    Ver Todas
                  </v-btn>
                </div>
              </div>
              <v-data-table
                :headers="invoiceHeaders"
                :items="recentInvoices"
                :items-per-page="8"
                class="data-table"
                hide-default-footer
                :loading="loadingRecentInvoices"
              >
                <template v-slot:item.status="{ item }">
                  <span :class="['table-chip', getStatusClass(item.rawStatus)]">
                    {{ item.status }}
                  </span>
                </template>
                <template v-slot:item.amount="{ item }">
                  <span class="amount-text">Q{{ formatNumber(item.amount) }}</span>
                </template>
                <template v-slot:item.date="{ item }">
                  <span class="date-text">{{ formatDate(item.date) }}</span>
                </template>
                <template v-slot:item.actions="{ item }">
                  <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    @click="viewInvoice(item)"
                  >
                    <v-icon class="mr-1">mdi-eye-outline</v-icon>
                    Ver
                  </v-btn>
                  <v-btn
                    v-if="canEdit(item)"
                    variant="text"
                    color="warning"
                    size="small"
                    @click="editInvoice(item)"
                  >
                    <v-icon class="mr-1">mdi-pencil-outline</v-icon>
                    Editar
                  </v-btn>
                </template>
              </v-data-table>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'
import PaymentTrendsChart from '../components/PaymentTrendsChart.vue'
import AppSidebar from '../components/AppSidebar.vue'
import AppTopBar from '../components/AppTopBar.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Estados reactivos
const drawer = ref(true)
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

onMounted(async () => {
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
})
</script>

<style scoped>
.dashboard-layout {
  height: 100vh;
}

.main-content {
  background: #f8fafc;
  min-height: calc(100vh - 64px);
}

.page-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  padding: 32px 0;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

.action-button {
  text-transform: none;
  font-weight: 600;
}

.stats-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stats-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.stats-emoji {
  font-size: 24px;
}

.stats-icon.primary {
  background: rgba(15, 23, 42, 0.1);
}

.stats-icon.success {
  background: rgba(16, 185, 129, 0.1);
}

.stats-icon.warning {
  background: rgba(245, 158, 11, 0.1);
}

.stats-icon.info {
  background: rgba(59, 130, 246, 0.1);
}

.stats-value {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}

.stats-change {
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
}

.stats-change.positive {
  color: #10b981;
}

.stats-change.negative {
  color: #ef4444;
}

.content-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-header {
  padding: 20px 24px 0 24px;
  border-bottom: none;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.card-title .v-icon {
  margin-right: 8px;
  color: #64748b;
}

/* Estilos específicos para secciones por rol */
.quick-actions {
  padding: 20px;
}

.documents-section {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.no-documents, .no-work {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.document-item {
  border-bottom: 1px solid #f1f5f9;
}

.document-item:last-child {
  border-bottom: none;
}

.document-emoji {
  font-size: 20px;
  margin-right: 12px;
}

.work-queue {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.work-item {
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.2s;
}

.work-item:hover {
  background-color: #f8fafc;
}

.work-item:last-child {
  border-bottom: none;
}

.task-priority {
  margin-right: 12px;
}

.task-time {
  font-size: 12px;
  color: #64748b;
}

.pending-invoices {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.pending-item {
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pending-item:hover {
  background-color: #f8fafc;
}

.pending-item:last-child {
  border-bottom: none;
}

.invoice-actions {
  display: flex;
  align-items: center;
}

.chart-section {
  padding: 20px;
  height: 360px;
}

.chart-wrapper {
  height: 100%;
  width: 100%;
}

.chart-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
  color: #64748b;
}

.chart-placeholder {
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px dashed #e2e8f0;
}

.chart-text {
  margin-left: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  color: #64748b;
  margin-top: 12px;
}

.chart-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin-top: 4px;
}

.status-container {
  padding: 20px;
}

.status-indicator {
  padding: 16px 20px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid;
  transition: all 0.2s ease;
}

.status-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.status-emoji {
  font-size: 16px;
  margin-right: 8px;
}

.status-indicator.pending {
  background: rgba(245, 158, 11, 0.05);
  border-left-color: #f59e0b;
}

.status-indicator.processing {
  background: rgba(59, 130, 246, 0.05);
  border-left-color: #3b82f6;
}

.status-indicator.completed {
  background: rgba(16, 185, 129, 0.05);
  border-left-color: #10b981;
}

.status-indicator.rejected {
  background: rgba(239, 68, 68, 0.05);
  border-left-color: #ef4444;
}

.status-indicator.assigned {
  background: rgba(168, 85, 247, 0.05);
  border-left-color: #a855f7;
}

.status-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.status-count {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.status-percentage {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.data-table {
  border-radius: 0 0 12px 12px;
}

.table-chip {
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 6px;
}

.processing-chip {
  background: rgba(59, 130, 246, 0.1) !important;
  color: #3b82f6 !important;
}

.completed-chip {
  background: rgba(16, 185, 129, 0.1) !important;
  color: #10b981 !important;
}

.pending-chip {
  background: rgba(245, 158, 11, 0.1) !important;
  color: #f59e0b !important;
}

.assigned-chip {
  background: rgba(168, 85, 247, 0.1) !important;
  color: #a855f7 !important;
}

.rejected-chip {
  background: rgba(239, 68, 68, 0.1) !important;
  color: #ef4444 !important;
}

.amount-text {
  font-weight: 600;
  color: #0f172a;
}

.date-text {
  color: #64748b;
}

.view-all-button {
  text-transform: none;
  font-weight: 500;
}

/* Transiciones suaves para las tarjetas */
.stats-card,
.content-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.stats-card:hover {
  transform: translateY(-2px);
}

/* Estilos para estados de carga */
.loading-shimmer {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Mejoras de accesibilidad */
.work-item:focus,
.pending-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Scrollbar personalizado para las listas */
.documents-section::-webkit-scrollbar,
.work-queue::-webkit-scrollbar,
.pending-invoices::-webkit-scrollbar {
  width: 6px;
}

.documents-section::-webkit-scrollbar-track,
.work-queue::-webkit-scrollbar-track,
.pending-invoices::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.documents-section::-webkit-scrollbar-thumb,
.work-queue::-webkit-scrollbar-thumb,
.pending-invoices::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.documents-section::-webkit-scrollbar-thumb:hover,
.work-queue::-webkit-scrollbar-thumb:hover,
.pending-invoices::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>