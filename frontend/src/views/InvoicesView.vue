<template>
  <div class="invoices-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <span class="breadcrumb-item active">Facturas</span>
        </div>
      </v-container>
    </div>

    <!-- Header de página - MEJORADO -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">Gestión de Facturas</h1>
            <p class="page-subtitle">Administra y revisa todas las facturas del sistema</p>
          </div>
          <div v-if="authStore.isProveedor" class="header-actions">
            <v-btn 
              color="primary" 
              @click="$router.push('/invoices/new')"
              prepend-icon="mdi-plus"
              class="new-invoice-btn"
              size="large"
            >
              Nueva Factura
            </v-btn>
          </div>
        </div>
      </v-container>
    </div>

    <v-container class="py-6">
      <!-- Filtros - MEJORADO -->
      <v-card class="filter-card mb-6" elevation="1">
        <v-card-title class="card-title-bg">
          <v-icon class="mr-2">mdi-filter-outline</v-icon>
          Filtros de Búsqueda
          <v-spacer></v-spacer>
          <v-chip 
            v-if="hasActiveFilters"
            color="primary" 
            variant="outlined"
            size="small"
            class="active-filters-badge"
          >
            Filtros activos
          </v-chip>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="12" sm="6" md="3" lg="2">
              <v-select
                v-model="filters.status"
                :items="statusOptions"
                label="Estado"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="applyFilters"
                prepend-inner-icon="mdi-flag-outline"
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6" md="3" lg="2" v-if="!authStore.isProveedor">
              <v-select
                v-model="filters.supplier_id"
                :items="suppliers"
                item-title="business_name"
                item-value="id"
                label="Proveedor"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="applyFilters"
                prepend-inner-icon="mdi-domain"
                hide-details
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6" md="3" lg="2" v-if="authStore.isAdmin">
              <v-select
                v-model="filters.assigned_to"
                :items="users"
                item-title="name"
                item-value="id"
                label="Asignado a"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="applyFilters"
                prepend-inner-icon="mdi-account"
                hide-details
                class="assigned-filter"
              ></v-select>
            </v-col>
            <v-col cols="12" sm="6" md="3" lg="2">
              <v-text-field
                v-model="filters.search"
                label="Buscar por número"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                clearable
                @input="debounceSearch"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3" lg="2">
              <v-text-field
                v-model="filters.start_date"
                label="Fecha desde"
                type="date"
                variant="outlined"
                density="comfortable"
                @update:model-value="applyFilters"
                prepend-inner-icon="mdi-calendar-start"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" sm="6" md="3" lg="2">
              <v-text-field
                v-model="filters.end_date"
                label="Fecha hasta"
                type="date"
                variant="outlined"
                density="comfortable"
                @update:model-value="applyFilters"
                prepend-inner-icon="mdi-calendar-end"
                hide-details
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row class="mt-3">
            <v-col cols="12" class="d-flex gap-3 flex-wrap align-center">
              <v-btn
                color="secondary"
                variant="outlined"
                @click="resetFilters"
                prepend-icon="mdi-filter-off"
                class="reset-btn"
                size="small"
              >
                Limpiar Filtros
              </v-btn>
              
              <v-chip
                v-if="totalInvoices > 0"
                color="primary"
                variant="outlined"
                size="small"
                class="total-badge"
              >
                {{ totalInvoices }} facturas encontradas
              </v-chip>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de facturas - MEJORADA -->
      <v-card elevation="1" class="invoices-table-card">
        <v-card-title class="table-header">
          <div class="d-flex align-center justify-space-between w-100 flex-wrap">
            <div class="table-title">
              <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
              Lista de Facturas
              <v-chip v-if="totalInvoices > 0" color="primary" variant="flat" size="small" class="ml-2">
                {{ totalInvoices }}
              </v-chip>
            </div>
          </div>
        </v-card-title>
        
          <v-data-table-server
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="invoices"
          :items-length="totalInvoices"
          :loading="loading"
          @update:options="onOptionsUpdate"
          class="invoices-table"
          :items-per-page-options="[
            { value: 10, title: '10' },
            { value: 25, title: '25' },
            { value: 50, title: '50' },
            { value: 100, title: '100' }
          ]"
        >
          <template v-slot:item.id="{ item }">
            <div class="invoice-id">ID-{{ item.id }}</div>
          </template>

          <template v-slot:item.number="{ item }">
            <div class="invoice-number">{{ item.number }}</div>
            <div v-if="item.payment && item.payment.password_generated" class="invoice-password" style="margin-top:6px;font-size:13px;color:#0f172a;">
              <small style="color:#64748b">Contraseña:</small>
              <div style="font-weight:600">{{ item.payment.password_generated }}</div>
            </div>
          </template>

          <template v-slot:item.supplier="{ item }">
            <div class="supplier-info">
              <div class="supplier-name">{{ item.supplier?.business_name || 'N/A' }}</div>
              <div class="supplier-nit">NIT: {{ item.supplier?.nit || 'N/A' }}</div>
            </div>
          </template>

          <template v-slot:item.amount="{ item }">
            <div class="amount-cell">Q{{ formatNumber(item.amount) }}</div>
          </template>

          <template v-slot:item.status="{ item }">
            <v-chip
              :color="getStatusColor(item.status)"
              size="small"
              class="status-chip"
            >
              <span class="status-text">{{ getStatusText(item.status) }}</span>
            </v-chip>
          </template>

          <template v-slot:item.created_at="{ item }">
            <div class="date-cell">{{ formatDate(item.created_at) }}</div>
          </template>

          <template v-slot:item.assigned_to="{ item }">
            <div v-if="item.assignedUser" class="assigned-info">
              <div class="assigned-name">{{ item.assignedUser.name }}</div>
              <div class="assigned-email">{{ item.assignedUser.email }}</div>
            </div>
            <v-chip v-else size="small" color="orange" variant="flat" class="unassigned-chip">
              <span class="status-text">Sin asignar</span>
            </v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="actions-cell">
              <!-- ACCIONES PARA PROVEEDOR -->
              <template v-if="authStore.isProveedor">
                <v-btn
                  variant="outlined"
                  size="small"
                  color="primary"
                  @click="viewInvoice(item)"
                  class="action-btn"
                >
                  <v-icon class="mr-1" size="16">mdi-eye-outline</v-icon>
                  Ver
                </v-btn>
                
                <v-btn
                  variant="outlined"
                  size="small"
                  color="success"
                  @click="downloadInvoiceFiles(item)"
                  class="action-btn"
                >
                  <v-icon class="mr-1" size="16">mdi-download</v-icon>
                  Descargar
                </v-btn>
              </template>

              <!-- ACCIONES PARA CONTADURÍA -->
              <template v-if="authStore.isContaduria || authStore.isAdmin">
                <v-btn
                  variant="outlined"
                  size="small"
                  color="primary"
                  @click="viewInvoice(item)"
                  class="action-btn"
                >
                  <v-icon class="mr-1" size="16">mdi-eye-outline</v-icon>
                  Ver
                </v-btn>
                
                <v-btn
                  variant="flat"
                  size="small"
                  color="indigo"
                  @click="manageInvoice(item)"
                  class="action-btn manage-btn"
                >
                  <v-icon class="mr-1" size="16">mdi-cog</v-icon>
                  Gestionar
                </v-btn>
              </template>
            </div>
          </template>

          <template v-slot:loading>
            <tbody>
              <tr v-for="n in 5" :key="n">
                <td v-for="m in headers.length" :key="m">
                  <v-skeleton-loader type="text"></v-skeleton-loader>
                </td>
              </tr>
            </tbody>
          </template>

          <template v-slot:no-data>
            <div class="no-data">
              <v-icon size="64" color="#e2e8f0">mdi-receipt-text-outline</v-icon>
              <h3>No hay facturas</h3>
              <p>No se encontraron facturas con los filtros aplicados</p>
              <v-btn 
                v-if="authStore.isProveedor"
                color="primary" 
                @click="$router.push('/invoices/new')"
                class="mt-4"
                size="small"
              >
                Crear primera factura
              </v-btn>
            </div>
          </template>

          <!-- Personalización del footer de paginación (reemplaza la predeterminada) -->
          <template v-slot:bottom>
            <div class="custom-footer">
              <div class="footer-info">
                Mostrando {{ ((currentPage - 1) * itemsPerPage) + 1 }} a {{ Math.min(currentPage * itemsPerPage, totalInvoices) }} de {{ totalInvoices }} facturas
              </div>
              <div class="footer-pagination">
                <v-select
                  v-model="itemsPerPage"
                  :items="[10, 25, 50, 100]"
                  label="Por página"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="items-per-page-select"
                  @update:model-value="onItemsPerPageChange"
                ></v-select>

                <v-pagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="7"
                  show-first-last-page
                  :class="{ 'pagination-controls': true, 'show-first': showFirstButton, 'show-last': showLastButton }"
                  @update:model-value="onPageChange"
                >
                  <template #first>
                    <v-icon size="18" class="mr-1">mdi-page-first</v-icon>
                    IR AL PRIMERO
                  </template>
                  <template #last>
                    IR A LA ÚLTIMA
                    <v-icon size="18" class="ml-1">mdi-page-last</v-icon>
                  </template>
                </v-pagination>
              </div>
            </div>
          </template>
        </v-data-table-server>
      </v-card>
    </v-container>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInvoices } from '../scripts/invoices.js'

const authStore = useAuthStore()

// Import data/functions from composable
const {
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
  headers,
  availableStatuses,
  hasActiveFilters,
  hasRetentionISR,
  hasRetentionIVA,
  hasPaymentProof,
  hasPasswordFile,
  canChangeStatus,
  canGeneratePassword,
  loadInvoices,
  downloadInvoiceFiles,
  downloadRetentionISR,
  downloadRetentionIVA,
  downloadPaymentProof,
  downloadPasswordFile,
  generatePassword,
  viewInvoice,
  manageInvoice,
  viewInvoiceHistory,
  changeStatus,
  updateStatus,
  reassignInvoice,
  applyFilters,
  resetFilters,
  debounceSearch,
  getStatusColor,
  formatNumber,
  formatDate,
  getStatusText,
  initializeInvoices
} = useInvoices()

// Pagination state (copiado de UsersView)
const currentPage = ref(1)

const loadInvoicesWithPagination = async (options = {}) => {
  const paginationOptions = {
    page: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    ...options
  }
  await loadInvoices(paginationOptions)
}

const onPageChange = (page) => {
  currentPage.value = page
  loadInvoicesWithPagination()
}

const onItemsPerPageChange = () => {
  currentPage.value = 1
  loadInvoicesWithPagination()
}

const onOptionsUpdate = (newOptions) => {
  const { page, itemsPerPage: newItemsPerPage } = newOptions
  if (page !== undefined) {
    currentPage.value = page
  }
  if (newItemsPerPage !== undefined && newItemsPerPage !== itemsPerPage.value) {
    itemsPerPage.value = newItemsPerPage
    currentPage.value = 1
  }
  loadInvoicesWithPagination()
}

watch(itemsPerPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    currentPage.value = 1
    loadInvoicesWithPagination()
  }
})

const totalPages = computed(() => {
  const total = Number(totalInvoices.value || 0)
  const perPage = Number(itemsPerPage.value || 1)
  return Math.max(1, Math.ceil(total / perPage))
})

const showFirstButton = computed(() => {
  return totalPages.value > 1 && currentPage.value > 1
})

const showLastButton = computed(() => {
  return totalPages.value > 1 && currentPage.value < totalPages.value
})

onMounted(() => {
  initializeInvoices()
})
</script>

<style src="../styles/invoices.css" scoped></style>