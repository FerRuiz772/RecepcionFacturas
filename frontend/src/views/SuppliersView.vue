<template>
  <div class="suppliers-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <span class="breadcrumb-item active">Proveedores</span>
        </div>
      </v-container>
    </div>

    <!-- Header de página -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">Gestión de Proveedores</h1>
            <p class="page-subtitle">Administra la información de proveedores</p>
          </div>
          <div>
            <v-btn 
              v-if="authStore.canCreateSuppliers"
              color="primary" 
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
              class="new-supplier-btn"
              size="large"
            >
              Nuevo Proveedor
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
          <v-row align="center">
            <v-col cols="12" md="4" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-text-field
                  v-model="searchQuery"
                  label="Buscar proveedor"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-magnify"
                  clearable
                  @input="enhancedDebounceSearch"
                  style="width:100%; min-height:48px"
                  hide-details
                ></v-text-field>
              </div>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-select
                  v-model="activeFilter"
                  :items="statusOptions"
                  label="Estado"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="onFilterChange"
                  style="width:100%; min-height:48px"
                  hide-details
                ></v-select>
              </div>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center justify-end">
              <v-btn
                @click="enhancedResetFilters"
                variant="outlined"
                color="secondary"
                class="reset-btn"
                style="height:48px; display:flex; align-items:center"
              >
                <v-icon class="mr-2">mdi-filter-off</v-icon>
                Limpiar Filtros
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de proveedores -->
      <v-card elevation="2">
        <v-card-title class="table-header">
          <div class="d-flex align-center justify-space-between w-100 flex-wrap">
            <div class="table-title">
              <v-icon class="mr-2">mdi-domain</v-icon>
              Lista de Proveedores
              <v-chip v-if="totalSuppliers > 0" color="primary" variant="flat" size="small" class="ml-2">
                {{ totalSuppliers }}
              </v-chip>
            </div>
          </div>
        </v-card-title>
        
        <v-data-table-server
          v-model:page="currentPage"
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="suppliers"
          :items-length="totalSuppliers"
          :loading="loading"
          @update:options="onOptionsUpdate"
          class="suppliers-table"
        >
          <template v-slot:item.business_name="{ item }">
            <div class="supplier-name">{{ item.business_name }}</div>
          </template>

          <template v-slot:item.nit="{ item }">
            <div class="nit-cell">{{ item.nit }}</div>
          </template>

          <template v-slot:item.is_active="{ item }">
            <div :class="item.is_active ? 'status-active' : 'status-inactive'">
              {{ item.is_active ? 'Activo' : 'Inactivo' }}
            </div>
          </template>

          <template v-slot:item.created_at="{ item }">
            <div class="date-cell">{{ formatDate(item.created_at) }}</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="actions-cell">
              <v-btn
                v-if="authStore.canEditSuppliers"
                variant="flat"
                size="small"
                color="warning"
                @click="editSupplier(item)"
                class="action-btn btn-edit"
              >
                <v-icon class="mr-1" size="16">mdi-pencil-outline</v-icon>
                Editar
              </v-btn>

              <v-btn
                v-if="authStore.canDeleteSuppliers"
                variant="flat"
                size="small"
                :class="item.is_active ? 'action-btn btn-toggle deactivate' : 'action-btn btn-toggle activate'"
                @click="toggleSupplier(item)"
              >
                <v-icon class="mr-1" size="16">
                  {{ item.is_active ? 'mdi-pause' : 'mdi-play' }}
                </v-icon>
                {{ item.is_active ? 'Desactivar' : 'Activar' }}
              </v-btn>
            </div>
          </template>

          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>

          <template v-slot:no-data>
            <div class="no-data">
              <v-icon size="64" color="grey-lighten-2">mdi-domain</v-icon>
              <h3>No hay proveedores</h3>
              <p>No se encontraron proveedores registrados</p>
              <v-btn 
                color="primary" 
                @click="openCreateDialog"
                class="mt-4"
              >
                Crear primer proveedor
              </v-btn>
            </div>
          </template>
            <!-- Footer de paginación personalizado -->
            <template v-slot:bottom>
              <div class="custom-footer">
                <div class="footer-info">
                  Mostrando {{ ((currentPage - 1) * itemsPerPage) + 1 }} a {{ Math.min(currentPage * itemsPerPage, totalSuppliers) }} de {{ totalSuppliers }} proveedores
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

    <!-- Dialog para crear/editar proveedor -->
    <v-dialog v-model="supplierDialog" max-width="600">
      <v-card>
        <v-card-title>
          {{ editMode ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="supplierFormRef" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="supplierForm.business_name"
                  label="Nombre de la Empresa"
                  variant="outlined"
                  :rules="[v => !!v || 'Nombre requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="supplierForm.nit"
                  label="NIT"
                  variant="outlined"
                  :rules="nitRules"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="supplierForm.address"
                  label="Dirección"
                  variant="outlined"
                  rows="3"
                ></v-textarea>
              </v-col>
              <v-col cols="12">
                <v-switch
                  v-model="supplierForm.regimen_isr"
                  label="Régimen Sujeto a Definitiva ISR"
                  color="primary"
                  hint="Si está activo, las facturas de este proveedor requerirán documento ISR"
                  persistent-hint
                  class="my-3"
                ></v-switch>
              </v-col>
              <v-col cols="12" v-if="editMode">
                <v-switch
                  v-model="supplierForm.is_active"
                  label="Proveedor Activo"
                  color="success"
                ></v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeSupplierDialog">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="saveSupplier"
            :loading="saving"
          >
            {{ editMode ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useSuppliers } from '../scripts/suppliers.js'
import { useAuthStore } from '../stores/auth.js'

const authStore = useAuthStore()

const {
  // Reactive state
  loading,
  suppliers,
  totalSuppliers,
  itemsPerPage,
  searchQuery,
  activeFilter,
  supplierDialog,
  editMode,
  saving,
  formValid,
  supplierFormRef,
  supplierForm,
  
  // Static data
  statusOptions,
  headers,
  nitRules,
  
  // Functions
  loadSuppliers,
  debounceSearch,
  resetFilters,
  openCreateDialog,
  editSupplier,
  closeSupplierDialog,
  saveSupplier,
  toggleSupplier,
  formatDate,
  initializeSuppliers
} = useSuppliers()

onMounted(initializeSuppliers)

// Handlers para la paginación del footer
// Pagination state
const currentPage = ref(1)

const loadSuppliersWithPagination = async (options = {}) => {
  const paginationOptions = {
    page: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    ...options
  }
  await loadSuppliers(paginationOptions)
}

// Enhanced handlers for search and filters to keep pagination in sync
let localSearchTimeout = null
const enhancedDebounceSearch = () => {
  // Reset to first page when performing a new search
  currentPage.value = 1
  clearTimeout(localSearchTimeout)
  localSearchTimeout = setTimeout(() => {
    loadSuppliersWithPagination()
  }, 500)
}

const onFilterChange = (newVal) => {
  // update happens via v-model already; ensure we fetch from page 1
  currentPage.value = 1
  loadSuppliersWithPagination()
}

const enhancedResetFilters = () => {
  // Use the composable reset to clear local filter state, then reload paginated
  currentPage.value = 1
  resetFilters()
  // resetFilters triggers loadSuppliers(); to ensure pagination integration, call paginated loader
  loadSuppliersWithPagination()
}

const onPageChange = (page) => {
  currentPage.value = page
  loadSuppliersWithPagination()
}

const onItemsPerPageChange = () => {
  currentPage.value = 1
  loadSuppliersWithPagination()
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
  loadSuppliersWithPagination()
}

watch(itemsPerPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    currentPage.value = 1
    loadSuppliersWithPagination()
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(Number(totalSuppliers.value || 0) / Number(itemsPerPage.value || 1))))

const showFirstButton = computed(() => {
  return totalPages.value > 1 && currentPage.value > 1
})

const showLastButton = computed(() => {
  return totalPages.value > 1 && currentPage.value < totalPages.value
})
</script>

<style src="../styles/suppliers.css" scoped></style>

