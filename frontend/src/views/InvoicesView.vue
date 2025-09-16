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

      <!-- Header de página -->
      <div class="page-header">
        <v-container>
          <div class="d-flex align-center justify-space-between">
            <div>
              <h1 class="page-title">Gestión de Facturas</h1>
              <p class="page-subtitle">Administra todas las facturas del sistema</p>
            </div>
            <div v-if="authStore.isProveedor">
              <v-btn 
                color="primary" 
                @click="$router.push('/invoices/new')"
                prepend-icon="mdi-plus"
                class="new-invoice-btn"
              >
                Nueva Factura
              </v-btn>
            </div>
          </div>
        </v-container>
      </div>

      <v-container class="py-8">
        <!-- Filtros -->
        <v-card class="filter-card mb-6" elevation="2">
          <v-card-title class="card-title-bg">
            <v-icon class="mr-2">mdi-filter-outline</v-icon>
            Filtros de Búsqueda
          </v-card-title>
          <v-card-text class="pa-6">
            <v-row>
              <v-col cols="12" md="2">
                <v-select
                  v-model="filters.status"
                  :items="statusOptions"
                  label="Estado"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="applyFilters"
                  prepend-inner-icon="mdi-flag-outline"
                ></v-select>
              </v-col>
              <v-col cols="12" md="2" v-if="!authStore.isProveedor">
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
                ></v-select>
              </v-col>
              <v-col cols="12" md="2" v-if="!authStore.isProveedor">
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
                ></v-select>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model="filters.search"
                  label="Buscar por número"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @input="debounceSearch"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model="filters.start_date"
                  label="Fecha desde"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="applyFilters"
                  prepend-inner-icon="mdi-calendar-start"
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="2">
                <v-text-field
                  v-model="filters.end_date"
                  label="Fecha hasta"
                  type="date"
                  variant="outlined"
                  density="comfortable"
                  @update:model-value="applyFilters"
                  prepend-inner-icon="mdi-calendar-end"
                ></v-text-field>
              </v-col>
            </v-row>
              <v-row class="mt-2">
                <v-col cols="12" class="d-flex gap-2 flex-wrap align-center">
                  <v-btn
                    color="secondary"
                    variant="outlined"
                    @click="resetFilters"
                    prepend-icon="mdi-filter-off"
                    class="reset-btn"
                  >
                    Limpiar Filtros
                  </v-btn>
                  <!-- Badge de conteo y información -->
                  <v-chip
                    v-if="totalInvoices > 0"
                    color="primary"
                    variant="outlined"
                    size="small"
                    class="ml-2"
                  >
                    Total: {{ totalInvoices }} facturas
                  </v-chip>
                  
                  <v-chip
                    v-if="hasActiveFilters"
                    color="warning"
                    variant="outlined"
                    size="small"
                    class="ml-1"
                  >
                    Filtros activos
                  </v-chip>
                </v-col>
              </v-row>
          </v-card-text>
        </v-card>

        <!-- Tabla de facturas -->
        <v-card elevation="2">
          <v-card-title class="card-title-bg">
            <div class="d-flex align-center justify-space-between w-100">
              <div class="card-title">
                <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                Lista de Facturas ({{ totalInvoices }})
              </div>
              <v-chip 
                v-if="hasActiveFilters"
                color="primary" 
                variant="outlined"
                size="small"
              >
                Filtros activos
              </v-chip>
            </div>
          </v-card-title>
          
          <v-data-table-server
            v-model:items-per-page="itemsPerPage"
            :headers="headers"
            :items="invoices"
            :items-length="totalInvoices"
            :loading="loading"
            @update:options="loadInvoices"
            class="invoices-table"
          >
            <template v-slot:item.id="{ item }">
              <div class="invoice-id">ID-{{ item.id }}</div>
            </template>

            <template v-slot:item.number="{ item }">
              <div class="invoice-number">{{ item.number }}</div>
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
              <v-chip v-else size="small" color="warning" variant="outlined">
                Sin asignar
              </v-chip>
            </template>

            <template v-slot:item.actions="{ item }">
              <div class="actions-cell">
                <!-- ACCIONES PARA PROVEEDOR -->
                <template v-if="authStore.isProveedor">
                  <!-- Ver detalles -->
                  <v-btn
                    variant="outlined"
                    size="small"
                    color="primary"
                    @click="viewInvoice(item)"
                    :title="`Ver detalles de la factura #${item.number}`"
                  >
                    <v-icon class="mr-1" size="16">mdi-eye-outline</v-icon>
                    Ver
                  </v-btn>
                  
                  <!-- Descargar facturas -->
                  <v-btn
                    variant="outlined"
                    size="small"
                    color="success"
                    @click="downloadInvoiceFiles(item)"
                    :title="`Descargar factura #${item.number} en formato PDF`"
                  >
                    <v-icon class="mr-1" size="16">mdi-download</v-icon>
                    Descargar
                  </v-btn>
                  
                  <!-- Descargar retenciones ISR (si disponible) -->
                  <v-btn
                    v-if="hasRetentionISR(item)"
                    variant="outlined"
                    size="small"
                    color="blue"
                    @click="downloadRetentionISR(item)"
                    :title="`Descargar constancia de retención ISR`"
                  >
                    <v-icon class="mr-1" size="16">mdi-file-document</v-icon>
                    ISR
                  </v-btn>
                  
                  <!-- Descargar retenciones IVA (si disponible) -->
                  <v-btn
                    v-if="hasRetentionIVA(item)"
                    variant="outlined"
                    size="small"
                    color="cyan"
                    @click="downloadRetentionIVA(item)"
                    :title="`Descargar constancia de retención IVA`"
                  >
                    <v-icon class="mr-1" size="16">mdi-file-certificate</v-icon>
                    IVA
                  </v-btn>
                  
                  <!-- Descargar comprobante de pago (si disponible) -->
                  <v-btn
                    v-if="hasPaymentProof(item)"
                    variant="outlined"
                    size="small"
                    color="green"
                    @click="downloadPaymentProof(item)"
                    :title="`Descargar comprobante de pago`"
                  >
                    <v-icon class="mr-1" size="16">mdi-receipt</v-icon>
                    Comprobante
                  </v-btn>
                </template>

                <!-- ACCIONES PARA CONTADURÍA -->
                <template v-if="authStore.isContaduria || authStore.isAdmin">
                  <!-- Ver detalles -->
                  <v-btn
                    variant="outlined"
                    size="small"
                    color="primary"
                    @click="viewInvoice(item)"
                    :title="`Ver todos los detalles de la factura #${item.number}`"
                  >
                    <v-icon class="mr-1" size="16">mdi-eye-outline</v-icon>
                    Ver
                  </v-btn>
                  
                  <!-- Gestionar documentos -->
                  <v-btn
                    variant="elevated"
                    size="small"
                    color="indigo"
                    @click="manageInvoice(item)"
                    :title="`Gestionar documentos de la factura #${item.number}`"
                  >
                    <v-icon class="mr-1" size="16">mdi-cog</v-icon>
                    Gestionar
                  </v-btn>
                  
                  <!-- Cambiar estado -->
                  <v-btn
                    v-if="canChangeStatus(item)"
                    variant="outlined"
                    size="small"
                    color="warning"
                    @click="changeStatus(item)"
                    :title="`Modificar el estado actual de la factura #${item.number}`"
                  >
                    <v-icon class="mr-1" size="16">mdi-swap-horizontal</v-icon>
                    Estado
                  </v-btn>
                </template>

                <!-- Menú de más opciones -->
                <v-menu v-if="!authStore.isProveedor">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      variant="outlined"
                      size="small"
                      color="secondary"
                      v-bind="props"
                      :title="'Más opciones'"
                    >
                      <v-icon size="16">mdi-dots-vertical</v-icon>
                    </v-btn>
                  </template>
                  <v-list>
                    <v-list-item v-if="!authStore.isProveedor" @click="viewInvoiceHistory(item)">
                      <template v-slot:prepend>
                        <v-icon size="20">mdi-history</v-icon>
                      </template>
                      <v-list-item-title>Ver historial</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="authStore.isContaduria && canGeneratePassword(item)" @click="generatePassword(item)">
                      <template v-slot:prepend>
                        <v-icon size="20">mdi-key</v-icon>
                      </template>
                      <v-list-item-title>Generar contraseña</v-list-item-title>
                    </v-list-item>
                    <v-list-item v-if="authStore.isAdmin" @click="reassignInvoice(item)">
                      <template v-slot:prepend>
                        <v-icon size="20">mdi-account-switch</v-icon>
                      </template>
                      <v-list-item-title>Reasignar factura</v-list-item-title>
                    </v-list-item>
                  </v-list>
                </v-menu>
              </div>
            </template>

            <template v-slot:loading>
              <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
            </template>

            <template v-slot:no-data>
              <div class="no-data">
                <v-icon size="64" color="grey-lighten-2">mdi-receipt-text-outline</v-icon>
                <h3>No hay facturas</h3>
                <p>No se encontraron facturas con los filtros aplicados</p>
                <v-btn 
                  v-if="authStore.isProveedor"
                  color="primary" 
                  @click="$router.push('/invoices/new')"
                  class="mt-4"
                >
                  Crear primera factura
                </v-btn>
              </div>
            </template>
          </v-data-table-server>
        </v-card>
      </v-container>

    <!-- Dialog para cambiar estado -->
    <v-dialog v-model="statusDialog" max-width="500">
      <v-card>
        <v-card-title>Cambiar Estado de Factura</v-card-title>
        <v-card-text>
          <v-select
            v-model="newStatus"
            :items="availableStatuses"
            label="Nuevo Estado"
            variant="outlined"
          ></v-select>
          <v-textarea
            v-model="statusNotes"
            label="Notas (opcional)"
            variant="outlined"
            rows="3"
            class="mt-4"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="statusDialog = false">Cancelar</v-btn>
          <v-btn color="primary" @click="updateStatus">Actualizar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useInvoices } from '../scripts/invoices.js'

const authStore = useAuthStore()

const {
  // Estados y funciones existentes...
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
  canChangeStatus,
  canGeneratePassword,
  loadInvoices,
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
  applyFilters,
  resetFilters,
  debounceSearch,
  getStatusColor,
  formatNumber,
  formatDate,
  getStatusText,
  initializeInvoices
} = useInvoices()

onMounted(initializeInvoices)
</script>
<style src="../styles/invoices.css" scoped></style>
