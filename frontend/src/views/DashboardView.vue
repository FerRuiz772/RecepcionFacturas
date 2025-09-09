<template>
    <div class="dashboard-layout">
      <!-- Sidebar -->
      <v-navigation-drawer app v-model="drawer" class="sidebar" width="280">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <div class="sidebar-logo">
              <v-icon size="18" color="#0f172a">mdi-file-document-multiple</v-icon>
            </div>
            <div>
              <div class="sidebar-title">Recepción Facturas</div>
            </div>
          </div>
          <p class="sidebar-subtitle">Sistema de Gestión de Pagos</p>
        </div>
        
        <v-list nav class="pt-4">
          <v-list-item
            v-for="item in filteredMenuItems"
            :key="item.title"
            :to="item.to"
            class="nav-item"
            rounded="lg"
            :active="$route.path === item.to"
          >
            <template v-slot:prepend>
              <v-icon>{{ item.icon }}</v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-navigation-drawer>
  
      <!-- App Bar -->
      <v-app-bar app class="app-bar" height="64" elevation="0">
        <v-app-bar-nav-icon 
          @click="drawer = !drawer" 
          color="#0f172a"
          class="ml-2"
        ></v-app-bar-nav-icon>
        
        <v-spacer></v-spacer>
        
        <!-- Notificaciones -->
        <v-btn icon class="notification-btn">
          <v-badge color="#ef4444" content="3" offset-x="12" offset-y="12">
            <v-icon color="#64748b">mdi-bell-outline</v-icon>
          </v-badge>
        </v-btn>
        
        <!-- Menú de usuario -->
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <div v-bind="props" class="user-menu-trigger d-flex align-center">
              <v-avatar size="32" style="background: #0f172a;">
                <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
              </v-avatar>
              <div class="user-info d-none d-sm-block">
                <div class="user-name">{{ authStore.userName }}</div>
                <div class="user-role">{{ roleDisplayName }}</div>
              </div>
              <v-icon color="#64748b" class="ml-2">mdi-chevron-down</v-icon>
            </div>
          </template>
          <v-list>
            <v-list-item @click="goToProfile">
              <template v-slot:prepend>
                <v-icon color="#64748b">mdi-account-outline</v-icon>
              </template>
              <v-list-item-title>Mi Perfil</v-list-item-title>
            </v-list-item>
            <v-list-item @click="goToSettings">
              <template v-slot:prepend>
                <v-icon color="#64748b">mdi-cog-outline</v-icon>
              </template>
              <v-list-item-title>Configuración</v-list-item-title>
            </v-list-item>
            <v-divider></v-divider>
            <v-list-item @click="logout">
              <template v-slot:prepend>
                <v-icon color="#ef4444">mdi-logout</v-icon>
              </template>
              <v-list-item-title>Cerrar Sesión</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-app-bar>
  
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
                  <v-icon size="24">{{ stat.icon }}</v-icon>
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
                          <v-icon :color="getDocumentIconColor(doc.type)">
                            {{ getDocumentIcon(doc.type) }}
                          </v-icon>
                        </template>
                        <v-list-item-title>{{ doc.title }}</v-list-item-title>
                        <v-list-item-subtitle>
                          Factura {{ doc.invoiceNumber }} • {{ formatDate(doc.date) }}
                        </v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn
                            icon
                            color="primary"
                            @click="downloadDocument(doc)"
                          >
                            <v-icon>mdi-download</v-icon>
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
                    <v-list>
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
                              icon
                              size="small"
                              color="success"
                              @click.stop="downloadInvoiceFiles(invoice.id)"
                              title="Descargar facturas"
                            >
                              <v-icon size="16">mdi-download</v-icon>
                            </v-btn>
                            <v-btn
                              icon
                              size="small"
                              color="primary"
                              @click.stop="goToInvoiceManagement(invoice.id)"
                              title="Gestionar"
                            >
                              <v-icon size="16">mdi-cog</v-icon>
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
                <div class="chart-placeholder">
                  <div class="chart-placeholder-content">
                    <v-icon size="64" color="#e2e8f0">mdi-chart-areaspline</v-icon>
                    <div class="chart-text">
                      <div class="chart-title">Gráfico de Tendencias</div>
                      <div class="chart-subtitle">Integración con Chart.js en desarrollo</div>
                    </div>
                  </div>
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
                    <div class="status-label">{{ status.name }}</div>
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
                >
                  <template v-slot:item.status="{ item }">
                    <span :class="['table-chip', getStatusClass(item.status)]">
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
                      icon
                      size="small"
                      variant="text"
                      color="#64748b"
                      @click="viewInvoice(item)"
                    >
                      <v-icon size="18">mdi-eye-outline</v-icon>
                    </v-btn>
                    <v-btn
                      v-if="canEdit(item)"
                      icon
                      size="small"
                      variant="text"
                      color="#64748b"
                      @click="editInvoice(item)"
                    >
                      <v-icon size="18">mdi-pencil-outline</v-icon>
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
  
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const drawer = ref(true)
  const availableDocuments = ref([])
  const workQueue = ref([])
  const pendingInvoices = ref([])
  
  const menuItems = [
    { title: 'Dashboard', icon: 'mdi-view-dashboard-outline', to: '/dashboard', roles: ['all'] },
    { title: 'Facturas', icon: 'mdi-receipt-text-outline', to: '/invoices', roles: ['all'] },
    { title: 'Proveedores', icon: 'mdi-account-group-outline', to: '/suppliers', roles: ['super_admin', 'admin_contaduria'] },
    { title: 'Usuarios', icon: 'mdi-account-multiple-outline', to: '/users', roles: ['super_admin', 'admin_contaduria'] }
  ]
  
  const stats = ref([
    {
      title: 'Facturas Pendientes',
      value: '24',
      icon: 'mdi-clock-outline',
      colorClass: 'warning',
      change: '+12% vs mes anterior',
      trend: 'up'
    },
    {
      title: 'Pagos Completados',
      value: 'Q485,220',
      icon: 'mdi-check-circle-outline',
      colorClass: 'success',
      change: '+8.5% vs mes anterior',
      trend: 'up'
    },
    {
      title: 'Proveedores Activos',
      value: '156',
      icon: 'mdi-account-outline',
      colorClass: 'info',
      change: '+3 nuevos este mes',
      trend: 'up'
    },
    {
      title: 'Tiempo Promedio',
      value: '3.2 días',
      icon: 'mdi-timer-outline',
      colorClass: 'primary',
      change: '-0.8 días vs mes anterior',
      trend: 'down'
    }
  ])
  
  const invoiceStatus = ref([
    { name: 'Pendientes', count: 18, percentage: 35, class: 'pending' },
    { name: 'En Proceso', count: 15, percentage: 29, class: 'processing' },
    { name: 'Completadas', count: 16, percentage: 31, class: 'completed' },
    { name: 'Rechazadas', count: 3, percentage: 5, class: 'rejected' }
  ])
  
  const invoiceHeaders = [
    { title: 'No. Factura', key: 'number', width: '140px' },
    { title: 'Proveedor', key: 'supplier' },
    { title: 'Monto', key: 'amount', width: '120px' },
    { title: 'Estado', key: 'status', width: '120px' },
    { title: 'Fecha', key: 'date', width: '100px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '100px' }
  ]
  
  const recentInvoices = ref([
    {
      number: 'FAC-2025-001',
      supplier: 'Tecnología Avanzada SA',
      amount: 25500,
      status: 'En Proceso',
      date: '2025-01-08'
    },
    {
      number: 'FAC-2025-002',
      supplier: 'Suministros Industriales XYZ',
      amount: 12300,
      status: 'Completada',
      date: '2025-01-07'
    },
    {
      number: 'FAC-2025-003',
      supplier: 'Servicios Profesionales ABC',
      amount: 8750,
      status: 'Pendiente',
      date: '2025-01-06'
    }
  ])
  
  const filteredMenuItems = computed(() => {
    return menuItems.filter(item => {
      if (item.roles.includes('all')) return true
      return item.roles.includes(authStore.userRole)
    })
  })
  
  const userInitials = computed(() => {
    return authStore.userName
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U'
  })
  
  const roleDisplayName = computed(() => {
    const roles = {
      'super_admin': 'Super Admin',
      'admin_contaduria': 'Admin Contaduría',
      'trabajador_contaduria': 'Trabajador Contaduría',
      'proveedor': 'Proveedor'
    }
    return roles[authStore.userRole] || authStore.userRole
  })
  
  // Funciones específicas para proveedores
  const loadAvailableDocuments = async () => {
    if (!authStore.isProveedor) return
    
    try {
      const response = await axios.get('/api/invoices/available-documents')
      availableDocuments.value = response.data.documents
    } catch (error) {
      console.error('Error loading available documents:', error)
    }
  }
  
  const downloadDocument = async (doc) => {
    try {
      let endpoint = ''
      let filename = ''
      
      switch (doc.type) {
        case 'retention_isr':
          endpoint = `/api/invoices/${doc.invoiceId}/download-retention-isr`
          filename = `retencion-isr-${doc.invoiceNumber}.pdf`
          break
        case 'retention_iva':
          endpoint = `/api/invoices/${doc.invoiceId}/download-retention-iva`
          filename = `retencion-iva-${doc.invoiceNumber}.pdf`
          break
        case 'payment_proof':
          endpoint = `/api/invoices/${doc.invoiceId}/download-payment-proof`
          filename = `comprobante-pago-${doc.invoiceNumber}.pdf`
          break
      }
      
      const response = await axios.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
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
      workQueue.value = response.data.tasks
    } catch (error) {
      console.error('Error loading work queue:', error)
    }
  }
  
  const loadPendingInvoices = async () => {
    if (!authStore.isContaduria && !authStore.isAdmin) return
    
    try {
      const response = await axios.get('/api/dashboard/pending-invoices')
      pendingInvoices.value = response.data.invoices
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
  
  // Funciones de utilidad
  const getDocumentIcon = (type) => {
    const icons = {
      'retention_isr': 'mdi-file-document',
      'retention_iva': 'mdi-file-certificate',
      'payment_proof': 'mdi-receipt'
    }
    return icons[type] || 'mdi-file'
  }
  
  const getDocumentIconColor = (type) => {
    const colors = {
      'retention_isr': 'blue',
      'retention_iva': 'cyan',
      'payment_proof': 'green'
    }
    return colors[type] || 'grey'
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
  
  const logout = async () => {
    await authStore.logout()
    router.push('/login')
  }
  
  const goToProfile = () => {
    console.log('Ir al perfil')
  }
  
  const goToSettings = () => {
    console.log('Ir a configuración')
  }
  
  const viewAllInvoices = () => {
    router.push('/invoices')
  }
  
  const viewInvoice = (invoice) => {
    console.log('Ver factura:', invoice)
  }
  
  const editInvoice = (invoice) => {
    console.log('Editar factura:', invoice)
  }
  
  const canEdit = (invoice) => {
    if (authStore.isProveedor) {
      return invoice.status === 'Pendiente'
    }
    return authStore.isContaduria || authStore.isAdmin
  }
  
  const getStatusClass = (status) => {
    const classes = {
      'En Proceso': 'processing-chip',
      'Completada': 'completed-chip',
      'Pendiente': 'pending-chip',
      'Rechazada': 'rejected-chip'
    }
    return classes[status] || 'default-chip'
  }
  
  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT').format(number)
  }
  
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-GT', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  onMounted(() => {
    // Cargar datos específicos según el rol
    if (authStore.isProveedor) {
      loadAvailableDocuments()
    } else if (authStore.isContaduria || authStore.isAdmin) {
      loadWorkQueue()
      loadPendingInvoices()
    }
  })
  </script>
  
  <style scoped>
  .dashboard-layout {
    height: 100vh;
  }
  
  .app-bar {
    background: #ffffff !important;
    border-bottom: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
  }
  
  .sidebar {
    background: #f8fafc !important;
    border-right: 1px solid #e2e8f0;
  }
  
  .sidebar-header {
    background: #0f172a;
    color: white;
    padding: 24px 20px;
    border-radius: 0;
  }
  
  .sidebar-brand {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .sidebar-logo {
    width: 32px;
    height: 32px;
    background: white;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
  }
  
  .sidebar-title {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.025em;
  }
  
  .sidebar-subtitle {
    font-size: 13px;
    opacity: 0.7;
    margin: 0;
  }
  
  .nav-item {
    margin: 4px 12px;
    border-radius: 8px;
    color: #475569;
    font-weight: 500;
  }
  
  .nav-item.v-list-item--active {
    background: #0f172a !important;
    color: white !important;
  }
  
  .nav-item:hover {
    background: #e2e8f0;
  }
  
  .nav-item.v-list-item--active:hover {
    background: #1e293b !important;
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
  
  .stats-icon.primary {
    background: rgba(15, 23, 42, 0.1);
    color: #0f172a;
  }
  
  .stats-icon.success {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }
  
  .stats-icon.warning {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
  }
  
  .stats-icon.info {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
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
    gap: 4px;
  }
  
  .chart-placeholder {
    height: 320px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border-radius: 8px;
    margin: 20px;
    border: 2px dashed #e2e8f0;
  }
  
  .chart-placeholder-content {
    text-align: center;
    color: #64748b;
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
  
  .status-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 4px;
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
  
  .user-menu-trigger {
    background: #f1f5f9;
    border-radius: 8px;
    padding: 8px 12px;
    transition: all 0.2s ease;
    cursor: pointer;
  }
  
  .user-menu-trigger:hover {
    background: #e2e8f0;
  }
  
  .user-info {
    margin-left: 12px;
  }
  
  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    line-height: 1.2;
  }
  
  .user-role {
    font-size: 12px;
    color: #64748b;
  }
  
  .notification-btn {
    background: #f1f5f9;
    border-radius: 8px;
    margin-right: 12px;
  }
  
  .notification-btn:hover {
    background: #e2e8f0;
  }
  
  .view-all-button {
    text-transform: none;
    font-weight: 500;
  }
</style>
