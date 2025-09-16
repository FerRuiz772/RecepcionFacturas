<template>
  <div class="dashboard-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <span class="breadcrumb-item active">Dashboard</span>
        </div>
      </v-container>
    </div>

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
                <div v-else>
                  <div 
                    v-for="invoice in availableDocuments" 
                    :key="invoice.id"
                    class="invoice-group mb-4"
                  >
                    <!-- Header de la factura -->
                    <div class="invoice-header">
                      <div class="invoice-info">
                        <h4>{{ invoice.number }}</h4>
                        <p class="text-subtitle-2 text-medium-emphasis">
                          {{ invoice.description }} • Q{{ formatNumber(invoice.amount) }}
                        </p>
                      </div>
                      <v-chip 
                        :color="getStatusColor(invoice.status)"
                        size="small"
                      >
                        {{ getStatusText(invoice.status) }}
                      </v-chip>
                    </div>
                    
                    <!-- Lista de documentos de esta factura -->
                    <v-list class="document-list">
                      <v-list-item 
                        v-for="doc in invoice.documents" 
                        :key="doc.id"
                        class="document-item"
                      >
                        <template v-slot:prepend>
                          <div class="document-emoji">{{ getDocumentEmoji(doc.type) }}</div>
                        </template>
                        <v-list-item-title>{{ doc.title }}</v-list-item-title>
                        <v-list-item-subtitle>
                          {{ formatDate(doc.date) }}
                        </v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn
                            variant="elevated"
                            color="primary"
                            size="small"
                            @click="downloadDocument(doc, invoice)"
                          >
                            <v-icon class="mr-1">mdi-download</v-icon>
                            Descargar
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </div>
                </div>
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
                    <v-list-item-title>{{ invoice.supplier_name }}</v-list-item-title>
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
        <v-col cols="12">
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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useDashboard } from '../scripts/dashboard.js'

const authStore = useAuthStore()
const {
  // Components
  PaymentTrendsChart,
  
  // Reactive state
  availableDocuments,
  workQueue,
  pendingInvoices,
  stats,
  recentInvoices,
  paymentTrends,
  loadingStats,
  loadingRecentInvoices,
  loadingTrends,
  invoiceHeaders,
  
  // Functions
  downloadDocument,
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
  initializeDashboard
} = useDashboard()

onMounted(initializeDashboard)
</script>

<style src="../styles/dashboard.css" scoped></style>
