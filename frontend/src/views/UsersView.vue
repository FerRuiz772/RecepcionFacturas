<template>
  <div class="users-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <span class="breadcrumb-item active">Usuarios</span>
        </div>
      </v-container>
    </div>

    <!-- Header de pÃ¡gina -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">GestiÃ³n de Usuarios</h1>
            <p class="page-subtitle">Administra usuarios y sus permisos</p>
          </div>
          <div>
            <v-btn 
              color="primary" 
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
              class="new-user-btn"
            >
              Nuevo Usuario
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
          Filtros de BÃºsqueda
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row>
            <v-col cols="12" md="3">
              <v-text-field
                v-model="searchQuery"
                label="Buscar usuario"
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                clearable
                @input="debounceSearch"
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="roleFilter"
                :items="roleOptions"
                label="Rol"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="loadUsers"
              ></v-select>
            </v-col>
            <v-col cols="12" md="3">
              <v-select
                v-model="activeFilter"
                :items="statusOptions"
                label="Estado"
                variant="outlined"
                density="comfortable"
                clearable
                @update:model-value="loadUsers"
              ></v-select>
            </v-col>
            <v-col cols="12" md="3">
              <v-btn
                color="primary"
                variant="outlined"
                @click="exportUsers"
                prepend-icon="mdi-download"
                class="export-btn"
                block
              >
                Exportar Excel
              </v-btn>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Tabla de usuarios -->
      <v-card elevation="2">
        <v-card-title class="card-title-bg">
          <div class="d-flex align-center justify-space-between w-100">
            <div class="card-title">
              <v-icon class="mr-2">mdi-account-multiple</v-icon>
              Lista de Usuarios ({{ totalUsers }})
            </div>
          </div>
        </v-card-title>
        
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :headers="headers"
          :items="users"
          :items-length="totalUsers"
          :loading="loading"
          @update:options="loadUsers"
          class="users-table"
        >
          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" :color="getAvatarColor(item.name)">
                <span class="text-white font-weight-bold text-caption">
                  {{ getInitials(item.name) }}
                </span>
              </v-avatar>
              <div class="ml-3">
                <div class="user-name">{{ item.name }}</div>
                <div class="user-email">{{ item.email }}</div>
              </div>
            </div>
          </template>

          <template v-slot:item.role="{ item }">
            <v-chip
              :color="getRoleColor(item.role)"
              size="small"
              class="role-chip"
            >
              {{ getRoleText(item.role) }}
            </v-chip>
          </template>

          <template v-slot:item.supplier="{ item }">
            <div v-if="item.Supplier" class="supplier-info">
              <div class="supplier-name">{{ item.Supplier.business_name }}</div>
              <div class="supplier-nit">{{ item.Supplier.nit }}</div>
            </div>
            <span v-else class="text-grey">N/A</span>
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
                variant="outlined"
                size="small"
                color="primary"
                @click="viewUser(item)"
              >
                <v-icon class="mr-1" size="16">mdi-eye-outline</v-icon>
                Ver
              </v-btn>
              
              <v-btn
                variant="outlined"
                size="small"
                color="warning"
                @click="editUser(item)"
                class="ml-2"
              >
                <v-icon class="mr-1" size="16">mdi-pencil-outline</v-icon>
                Editar
              </v-btn>

              <v-btn
                variant="outlined"
                size="small"
                :color="item.is_active ? 'error' : 'success'"
                @click="toggleUser(item)"
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
              <v-icon size="64" color="grey-lighten-2">mdi-account-multiple</v-icon>
              <h3>No hay usuarios</h3>
              <p>No se encontraron usuarios registrados</p>
              <v-btn 
                color="primary" 
                @click="openCreateDialog"
                class="mt-4"
              >
                Crear primer usuario
              </v-btn>
            </div>
          </template>
        </v-data-table-server>
      </v-card>
    </v-container>

    <!-- Dialog para crear/editar usuario -->
    <v-dialog v-model="userDialog" max-width="600">
      <v-card>
        <v-card-title>
          {{ editMode ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </v-card-title>
        <v-card-text>
          <v-form ref="userFormRef" v-model="formValid">
            <v-row>
              <v-col cols="12">
                <v-text-field
                  v-model="userForm.name"
                  label="Nombre Completo"
                  variant="outlined"
                  :rules="[v => !!v || 'Nombre requerido']"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="userForm.email"
                  label="Email"
                  type="email"
                  variant="outlined"
                  :rules="[
                    v => !!v || 'Email requerido',
                    v => /.+@.+\..+/.test(v) || 'Email debe ser vÃ¡lido'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12" v-if="!editMode">
                <v-text-field
                  v-model="userForm.password"
                  label="ContraseÃ±a"
                  type="password"
                  variant="outlined"
                  :rules="[
                    v => !!v || 'ContraseÃ±a requerida',
                    v => v.length >= 6 || 'ContraseÃ±a debe tener al menos 6 caracteres'
                  ]"
                  required
                ></v-text-field>
              </v-col>
              <v-col cols="12">
                <v-select
                  v-model="userForm.role"
                  :items="roleOptions"
                  label="Rol"
                  variant="outlined"
                  :rules="[v => !!v || 'Rol requerido']"
                  @update:model-value="onRoleChange"
                  required
                ></v-select>
              </v-col>
              <v-col cols="12" v-if="userForm.role === 'proveedor'">
                <v-select
                  v-model="userForm.supplier_id"
                  :items="suppliers"
                  item-title="business_name"
                  item-value="id"
                  label="Empresa Proveedor"
                  variant="outlined"
                  :rules="userForm.role === 'proveedor' ? [v => !!v || 'Empresa requerida'] : []"
                ></v-select>
              </v-col>
              <v-col cols="12" v-if="editMode">
                <v-switch
                  v-model="userForm.is_active"
                  label="Usuario Activo"
                  color="success"
                ></v-switch>
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="closeUserDialog">Cancelar</v-btn>
          <v-btn 
            color="primary" 
            @click="saveUser"
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
import { useUsers } from '../scripts/users.js'

const {
  // Reactive state
  loading,
  users,
  suppliers,
  totalUsers,
  itemsPerPage,
  searchQuery,
  roleFilter,
  activeFilter,
  userDialog,
  editMode,
  saving,
  formValid,
  userFormRef,
  userForm,
  
  // Static data
  roleOptions,
  statusOptions,
  headers,
  
  // Functions
  loadUsers,
  loadSuppliers,
  debounceSearch,
  openCreateDialog,
  viewUser,
  editUser,
  closeUserDialog,
  onRoleChange,
  saveUser,
  toggleUser,
  exportUsers,
  getInitials,
  getAvatarColor,
  getRoleColor,
  getRoleText,
  formatDate,
  initializeUsers
} = useUsers()

onMounted(initializeUsers)
</script>

<style src="../styles/users.css" scoped></style>
