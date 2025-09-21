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
          <v-row>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="searchQuery"
                label="Buscar proveedor"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                clearable
                @input="debounceSearch"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-select
                v-model="activeFilter"
                :items="statusOptions"
                label="Estado"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="loadSuppliers"
              ></v-select>
            </v-col>
            <v-col cols="12" md="4" class="d-flex align-center">
              <v-btn
                @click="resetFilters"
                variant="outlined"
                color="secondary"
                class="reset-btn"
                size="large"
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
        <v-card-title class="card-title-bg">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="card-title">
              <v-icon class="mr-2">mdi-domain</v-icon>
              Lista de Proveedores ({{ totalSuppliers }})
            </div>
          </div>
        </v-card-title>
        
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="suppliers"
          :items-length="totalSuppliers"
          :loading="loading"
          @update:options="loadSuppliers"
          class="suppliers-table"
        >
          <template v-slot:item.business_name="{ item }">
            <div class="supplier-name">{{ item.business_name }}</div>
          </template>

          <template v-slot:item.nit="{ item }">
            <div class="nit-cell">{{ item.nit }}</div>
          </template>

          <template v-slot:item.is_active="{ item }">
            <v-chip
              :color="item.is_active ? 'success' : 'error'"
              size="small"
              class="status-chip"
            >
              {{ item.is_active ? 'Activo' : 'Inactivo' }}
            </v-chip>
          </template>

          <template v-slot:item.created_at="{ item }">
            <div class="date-cell">{{ formatDate(item.created_at) }}</div>
          </template>

          <template v-slot:item.actions="{ item }">
            <div class="actions-cell">
              <v-btn
                v-if="authStore.canEditSuppliers"
                variant="outlined"
                size="small"
                color="warning"
                @click="editSupplier(item)"
                class="ml-2"
              >
                <v-icon class="mr-1" size="16">mdi-pencil-outline</v-icon>
                Editar
              </v-btn>

              <v-btn
                v-if="authStore.canDeleteSuppliers"
                variant="outlined"
                size="small"
                :color="item.is_active ? 'error' : 'success'"
                @click="toggleSupplier(item)"
                class="ml-2"
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
                  :rules="[v => !!v || 'NIT requerido']"
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
            :disabled="!formValid"
          >
            {{ editMode ? 'Actualizar' : 'Crear' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
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
  
  // Functions
  loadSuppliers,
  debounceSearch,
  openCreateDialog,
  editSupplier,
  closeSupplierDialog,
  saveSupplier,
  toggleSupplier,
  formatDate,
  initializeSuppliers
} = useSuppliers()

onMounted(initializeSuppliers)
</script>

<style src="../styles/suppliers.css" scoped></style>

    resetFilters
