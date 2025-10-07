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

    <!-- Header de página -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">Gestión de Usuarios</h1>
            <p class="page-subtitle">Administra usuarios y sus permisos</p>
          </div>
          <div>
            <v-btn 
              v-if="auth.canCreateUsers"
              color="primary" 
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
              class="new-user-btn"
              size="large"
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
          Filtros de Búsqueda
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row align="center">
            <v-col cols="12" md="3" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-text-field
                  v-model="searchQuery"
                  label="Buscar usuario"
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
            <v-col cols="12" md="3" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-select
                  v-model="roleFilter"
                  :items="roleOptions"
                  label="Rol"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="enhancedOnFilterChange"
                  style="width:100%; min-height:48px"
                  hide-details
                ></v-select>
              </div>
            </v-col>
            <v-col cols="12" md="3" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-select
                  v-model="activeFilter"
                  :items="statusOptions"
                  label="Estado"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="enhancedOnFilterChange"
                  style="width:100%; min-height:48px"
                  hide-details
                ></v-select>
              </div>
            </v-col>
            <v-col cols="12" md="3" class="d-flex align-center">
              <div style="width:100%; display:flex; align-items:center">
                <v-select
                  v-model="supplierFilter"
                  :items="suppliers"
                  item-title="business_name"
                  item-value="id"
                  label="Empresa"
                  variant="outlined"
                  density="comfortable"
                  clearable
                  @update:model-value="enhancedOnFilterChange"
                  style="width:100%; min-height:48px"
                  hide-details
                ></v-select>
              </div>
            </v-col>
            <v-col cols="12" md="3" class="d-flex align-center">
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

      <!-- Tabla de usuarios -->
      <v-card elevation="2">
        <v-card-title class="table-header">
          <div class="d-flex align-center justify-space-between w-100 flex-wrap">
            <div class="table-title">
              <v-icon class="mr-2">mdi-account-multiple</v-icon>
              Lista de Usuarios
              <v-chip v-if="totalUsers > 0" color="primary" variant="flat" size="small" class="ml-2">
                {{ totalUsers }}
              </v-chip>
            </div>
          </div>
        </v-card-title>
        
      <v-data-table-server
        v-model:page="currentPage"
        v-model:items-per-page="itemsPerPage"
        :headers="headers"
        :items="users"
        :items-length="totalUsers"
        :loading="loading"
        @update:options="onOptionsUpdate"
        class="users-table"
        :server-items-length="totalUsers"
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
            <div v-if="item.supplier" class="supplier-info">
              <div class="supplier-name">{{ item.supplier.business_name }}</div>
              <div class="supplier-nit">{{ item.supplier.nit }}</div>
            </div>
            <span v-else class="text-grey">N/A</span>
          </template>

          <template v-slot:item.is_active="{ item }">
            <div :class="item.is_active ? 'status-active' : 'status-inactive'">
              {{ item.is_active ? 'Activo' : 'Inactivo' }}
            </div>
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
                v-if="auth.canEditUsers"
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
                v-if="auth.canEditUsers"
                variant="outlined"
                size="small"
                :color="item.is_active ? 'error' : 'success'"
                @click="toggleUser(item)"
                class="ml-2"
                :disabled="isCurrentUser(item)"
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

          <template v-slot:bottom>
            <div class="custom-footer">
              <div class="footer-info">
                Mostrando {{ ((currentPage - 1) * itemsPerPage) + 1 }} 
                a {{ Math.min(currentPage * itemsPerPage, totalUsers) }} 
                de {{ totalUsers }} usuarios
              </div>
              <div class="footer-pagination">
                <!-- use built-in pagination first/last buttons rendered by v-pagination -->
                <v-select
                  v-model="itemsPerPage"
                  :items="[10, 25, 50, 100]"
                  label="Por página"
                  variant="outlined"
                  density="compact"
                  class="items-per-page-select"
                  hide-details
                  @update:model-value="onItemsPerPageChange"
                ></v-select>
                <div style="display:flex; align-items:center; gap:8px">
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
            </div>
          </template>
        </v-data-table-server>
      </v-card>
    </v-container>

    <!-- Dialog para crear/editar usuario -->
    <v-dialog 
      v-model="userDialog" 
      max-width="800"
      scrollable
      persistent
    >
      <v-card height="600">
        <v-card-title class="px-6 py-4">
          {{ editMode ? 'Editar Usuario' : 'Nuevo Usuario' }}
        </v-card-title>
        
        <v-tabs v-model="activeTab" class="px-4" show-arrows>
          <v-tab value="general">
            <v-icon class="mr-2">mdi-account</v-icon>
            Información Básica
          </v-tab>
          <v-tab value="password" v-if="editMode">
            <v-icon class="mr-2">mdi-lock-reset</v-icon>
            Cambiar Contraseña
          </v-tab>
          <v-tab value="permissions" v-if="editMode && canManagePermissions">
            <v-icon class="mr-2">mdi-shield-account</v-icon>
            Permisos
          </v-tab>
        </v-tabs>

        <v-card-text class="px-6 pb-6" style="height: 450px; overflow-y: auto;">
          <v-tabs-window v-model="activeTab">
            <!-- Pestaña de información básica -->
            <v-tabs-window-item value="general">
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
                        v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Email debe ser válido (debe contener @)'
                      ]"
                      required
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" v-if="!editMode">
                    <v-text-field
                      v-model="userForm.password"
                      label="Contraseña"
                      :type="showPassword ? 'text' : 'password'"
                      variant="outlined"
                      :rules="[
                        v => !!v || 'Contraseña requerida',
                        v => v.length >= 6 || 'Contraseña debe tener al menos 6 caracteres'
                      ]"
                      required
                    >
                      <template v-slot:append-inner>
                        <span 
                          @click="showPassword = !showPassword" 
                          style="cursor: pointer; font-size: 20px; user-select: none;"
                        >
                          {{ showPassword ? '🙈' : '👁️' }}
                        </span>
                      </template>
                    </v-text-field>
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
                      :disabled="isCurrentUser(userForm)"
                    ></v-switch>
                    <v-alert
                      v-if="isCurrentUser(userForm)"
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mt-2"
                    >
                      No puedes cambiar tu propio estado de activación
                    </v-alert>
                  </v-col>
                </v-row>
              </v-form>
            </v-tabs-window-item>

            <!-- Pestaña de cambio de contraseña -->
            <v-tabs-window-item value="password" v-if="editMode">
              <v-form ref="passwordFormRef">
                <v-alert 
                  type="info" 
                  variant="tonal" 
                  class="mb-6"
                  icon="mdi-information-outline"
                >
                  Como administrador, puedes cambiar la contraseña de cualquier usuario.
                </v-alert>

                <v-row>
                  <v-col cols="12">
                    <v-text-field
                      v-model="newPassword"
                      label="Nueva Contraseña"
                      :type="showNewPassword ? 'text' : 'password'"
                      variant="outlined"
                      :rules="newPasswordRules"
                    >
                      <template v-slot:append-inner>
                        <span 
                          @click="showNewPassword = !showNewPassword" 
                          style="cursor: pointer; font-size: 20px; user-select: none;"
                        >
                          {{ showNewPassword ? '🙈' : '👁️' }}
                        </span>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="confirmPassword"
                      label="Confirmar Nueva Contraseña"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      variant="outlined"
                      :rules="confirmPasswordRules"
                    >
                      <template v-slot:append-inner>
                        <span 
                          @click="showConfirmPassword = !showConfirmPassword" 
                          style="cursor: pointer; font-size: 20px; user-select: none;"
                        >
                          {{ showConfirmPassword ? '🙈' : '👁️' }}
                        </span>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-btn
                      color="primary"
                      @click="changePassword"
                      :loading="changingPassword"
                      :disabled="!newPassword || !confirmPassword || newPassword !== confirmPassword"
                      prepend-icon="mdi-lock-reset"
                    >
                      Cambiar Contraseña
                    </v-btn>
                  </v-col>
                </v-row>
              </v-form>
            </v-tabs-window-item>

            <!-- Pestaña de permisos -->
            <v-tabs-window-item value="permissions" v-if="editMode && canManagePermissions">
              <div class="permissions-content">
                <!-- Alert informativo -->
                <v-alert 
                  type="info" 
                  variant="tonal" 
                  class="mb-6"
                  icon="mdi-information-outline"
                >
                  Los permisos determinan las acciones que el usuario puede realizar en cada módulo del sistema.
                </v-alert>

                <!-- Grid de permisos -->
                <v-row>
                  <!-- Sección Facturas -->
                  <v-col cols="12" md="6">
                    <v-card class="permission-section" elevation="2">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="primary">mdi-file-document-outline</v-icon>
                          Facturas
                        </div>
                        <v-chip 
                          :color="getPermissionCount('invoices') === 4 ? 'success' : 'grey'"
                          size="small"
                        >
                          {{ getPermissionCount('invoices') }}/4
                        </v-chip>
                      </v-card-title>
                      <v-card-text class="pt-2">
                        <div class="permission-grid">
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.invoices?.view }"
                            @click="togglePermission('invoices', 'view')"
                          >
                            <v-icon size="20">mdi-eye-outline</v-icon>
                            <span>Ver facturas</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.invoices?.create }"
                            @click="togglePermission('invoices', 'create')"
                          >
                            <v-icon size="20">mdi-plus-circle-outline</v-icon>
                            <span>Crear facturas</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.invoices?.edit }"
                            @click="togglePermission('invoices', 'edit')"
                          >
                            <v-icon size="20">mdi-pencil-outline</v-icon>
                            <span>Editar facturas</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.invoices?.delete }"
                            @click="togglePermission('invoices', 'delete')"
                          >
                            <v-icon size="20">mdi-delete-outline</v-icon>
                            <span>Eliminar facturas</span>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Sección Documentos -->
                  <v-col cols="12" md="6">
                    <v-card class="permission-section" elevation="2">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="secondary">mdi-folder-outline</v-icon>
                          Documentos
                        </div>
                        <v-chip 
                          :color="getPermissionCount('documents') === 3 ? 'success' : 'grey'"
                          size="small"
                        >
                          {{ getPermissionCount('documents') }}/3
                        </v-chip>
                      </v-card-title>
                      <v-card-text class="pt-2">
                        <div class="permission-grid">
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.documents?.view }"
                            @click="togglePermission('documents', 'view')"
                          >
                            <v-icon size="20">mdi-eye-outline</v-icon>
                            <span>Ver documentos</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.documents?.upload }"
                            @click="togglePermission('documents', 'upload')"
                          >
                            <v-icon size="20">mdi-upload-outline</v-icon>
                            <span>Subir documentos</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.documents?.download }"
                            @click="togglePermission('documents', 'download')"
                          >
                            <v-icon size="20">mdi-download-outline</v-icon>
                            <span>Descargar documentos</span>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Sección Usuarios -->
                  <v-col cols="12" md="6">
                    <v-card class="permission-section" elevation="2">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="warning">mdi-account-multiple-outline</v-icon>
                          Usuarios
                        </div>
                        <v-chip 
                          :color="getPermissionCount('users') === 4 ? 'success' : 'grey'"
                          size="small"
                        >
                          {{ getPermissionCount('users') }}/4
                        </v-chip>
                      </v-card-title>
                      <v-card-text class="pt-2">
                        <div class="permission-grid">
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.users?.view }"
                            @click="togglePermission('users', 'view')"
                          >
                            <v-icon size="20">mdi-eye-outline</v-icon>
                            <span>Ver usuarios</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.users?.create }"
                            @click="togglePermission('users', 'create')"
                          >
                            <v-icon size="20">mdi-account-plus-outline</v-icon>
                            <span>Crear usuarios</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.users?.edit }"
                            @click="togglePermission('users', 'edit')"
                          >
                            <v-icon size="20">mdi-account-edit-outline</v-icon>
                            <span>Editar usuarios</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.users?.delete }"
                            @click="togglePermission('users', 'delete')"
                          >
                            <v-icon size="20">mdi-account-remove-outline</v-icon>
                            <span>Eliminar usuarios</span>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Sección Proveedores -->
                  <v-col cols="12" md="6">
                    <v-card class="permission-section" elevation="2">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="info">mdi-office-building-outline</v-icon>
                          Proveedores
                        </div>
                        <v-chip 
                          :color="getPermissionCount('suppliers') === 4 ? 'success' : 'grey'"
                          size="small"
                        >
                          {{ getPermissionCount('suppliers') }}/4
                        </v-chip>
                      </v-card-title>
                      <v-card-text class="pt-2">
                        <div class="permission-grid">
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.suppliers?.view }"
                            @click="togglePermission('suppliers', 'view')"
                          >
                            <v-icon size="20">mdi-eye-outline</v-icon>
                            <span>Ver proveedores</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.suppliers?.create }"
                            @click="togglePermission('suppliers', 'create')"
                          >
                            <v-icon size="20">mdi-plus-circle-outline</v-icon>
                            <span>Crear proveedores</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.suppliers?.edit }"
                            @click="togglePermission('suppliers', 'edit')"
                          >
                            <v-icon size="20">mdi-pencil-outline</v-icon>
                            <span>Editar proveedores</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.suppliers?.delete }"
                            @click="togglePermission('suppliers', 'delete')"
                          >
                            <v-icon size="20">mdi-delete-outline</v-icon>
                            <span>Eliminar proveedores</span>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>

                  <!-- Sección Dashboard -->
                  <v-col cols="12" md="6">
                    <v-card class="permission-section" elevation="2">
                      <v-card-title class="d-flex justify-space-between align-center">
                        <div class="d-flex align-center">
                          <v-icon class="mr-2" color="blue">mdi-view-dashboard-outline</v-icon>
                          Dashboard
                        </div>
                        <v-chip 
                          :color="getPermissionCount('dashboard') === 3 ? 'success' : 'grey'"
                          size="small"
                        >
                          {{ getPermissionCount('dashboard') }}/3
                        </v-chip>
                      </v-card-title>
                      <v-card-text class="pt-2">
                        <div class="permission-grid">
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.dashboard?.view }"
                            @click="togglePermission('dashboard', 'view')"
                          >
                            <v-icon size="20">mdi-eye-outline</v-icon>
                            <span>Ver dashboard</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.dashboard?.view_stats }"
                            @click="togglePermission('dashboard', 'view_stats')"
                          >
                            <v-icon size="20">mdi-chart-box-outline</v-icon>
                            <span>Ver estadísticas</span>
                          </div>
                          <div 
                            class="permission-box"
                            :class="{ 'active': userPermissions.dashboard?.view_charts }"
                            @click="togglePermission('dashboard', 'view_charts')"
                          >
                            <v-icon size="20">mdi-chart-pie</v-icon>
                            <span>Ver gráficos</span>
                          </div>
                        </div>
                      </v-card-text>
                    </v-card>
                  </v-col>
                </v-row>
              </div>
            </v-tabs-window-item>
          </v-tabs-window>
        </v-card-text>
        
        <v-card-actions class="px-6 py-4">
          <v-spacer></v-spacer>
          <v-btn @click="closeUserDialogAndClearPassword">Cancelar</v-btn>
          <v-btn 
            v-if="activeTab === 'general'"
            color="primary" 
            @click="saveUser"
            :loading="saving"
            :disabled="!formValid"
          >
            {{ editMode ? 'Actualizar' : 'Crear' }}
          </v-btn>
          <v-btn 
            v-if="activeTab === 'permissions' && editMode"
            color="success"
            @click="savePermissions"
            :loading="savingPermissions"
          >
            Guardar Permisos
          </v-btn>
          <v-btn 
            v-if="activeTab === 'permissions' && editMode"
            color="primary"
            @click="savePermissionsAndClose"
            :loading="savingPermissions"
            class="ml-2"
          >
            Guardar y Salir
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { useUsers } from '../scripts/users.js'
import { useAuthStore } from '../stores/auth.js'
import axios from '../utils/axios.js'

const auth = useAuthStore()

// Variables para la paginación
const currentPage = ref(1)

// Variable para las pestañas
const activeTab = ref('general')

// Variables para el manejo de permisos
const userPermissions = ref({
  invoices: { view: false, create: false, edit: false, delete: false },
  documents: { view: false, upload: false, download: false },
  users: { view: false, create: false, edit: false, delete: false },
  suppliers: { view: false, create: false, edit: false, delete: false },
  dashboard: { view: false, view_stats: false, view_charts: false }
})
const savingPermissions = ref(false)

// Variables para cambio de contraseña
const newPassword = ref('')
const confirmPassword = ref('')
const changingPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const passwordFormRef = ref(null)

// Reglas de validación para contraseñas
const newPasswordRules = computed(() => [
  v => !!v || 'Nueva contraseña requerida',
  v => (v && v.length >= 6) || 'La contraseña debe tener al menos 6 caracteres'
])

const confirmPasswordRules = computed(() => [
  v => !!v || 'Confirmación de contraseña requerida',
  v => v === newPassword.value || 'Las contraseñas no coinciden'
])

// Importar todas las funciones y variables de useUsers
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
  supplierFilter,
  userDialog,
  editMode,
  saving,
  formValid,
  userFormRef,
  permissionsDialog,
  selectedUserForPermissions,
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
  getInitials,
  getAvatarColor,
  getRoleColor,
  getRoleText,
  formatDate,
  initializeUsers,
  openPermissionsDialog,
  closePermissionsDialog,
  showMessage,
  
  // Password visibility
  showPassword,
  
  // Filter functions
  resetFilters
} = useUsers()

// Función para manejar cambio de página
const onPageChange = (page) => {
  currentPage.value = page
  loadUsersWithPagination()
}

// Salta a la primera página y recarga
const jumpToFirst = () => {
  if (currentPage.value === 1) return
  currentPage.value = 1
  loadUsersWithPagination()
}

// Salta a la última página y recarga
const jumpToLast = () => {
  if (currentPage.value === totalPages.value) return
  currentPage.value = totalPages.value
  loadUsersWithPagination()
}

// Función para manejar cambio de items por página
const onItemsPerPageChange = () => {
  currentPage.value = 1 // Reset to first page when items per page changes
  loadUsersWithPagination()
}

// Función para cargar usuarios con paginación
const loadUsersWithPagination = async (options = {}) => {
  const paginationOptions = {
    page: currentPage.value,
    itemsPerPage: itemsPerPage.value,
    ...options
  }
  await loadUsers(paginationOptions)
}

// Función para manejar actualización de opciones del data-table
const onOptionsUpdate = (newOptions) => {
  const { page, itemsPerPage: newItemsPerPage } = newOptions
  if (page !== undefined) {
    currentPage.value = page
  }
  if (newItemsPerPage !== undefined && newItemsPerPage !== itemsPerPage.value) {
    itemsPerPage.value = newItemsPerPage
    currentPage.value = 1
  }
  loadUsersWithPagination()
}

// Watch para itemsPerPage para recargar cuando cambie
watch(itemsPerPage, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    currentPage.value = 1
    loadUsersWithPagination()
  }
})

// Computed para el total de páginas (necesario para la paginación)
const totalPages = computed(() => {
  const total = Number(totalUsers.value || 0)
  const perPage = Number(itemsPerPage.value || 1)
  return Math.max(1, Math.ceil(total / perPage))
})

// Computed para verificar si puede gestionar permisos
const canManagePermissions = computed(() => {
  return auth.user?.role === 'super_admin' || auth.user?.role === 'admin_contaduria'
})

// Función para verificar si es el usuario actual
const isCurrentUser = (user) => {
  return auth.user?.id === user?.id
}

// Funciones para el manejo de permisos
const getPermissionCount = (module) => {
  const permissions = userPermissions.value[module]
  if (!permissions) return 0
  return Object.values(permissions).filter(Boolean).length
}

const togglePermission = (module, permission) => {
  userPermissions.value[module][permission] = !userPermissions.value[module][permission]
}

const loadUserPermissions = async (userId) => {
  if (!userId) return
  
  try {
    console.log('🔍 Cargando permisos para usuario ID:', userId)
    const response = await axios.get(`/api/users/${userId}/permissions`)
    console.log('📋 Respuesta completa de permisos:', response.data)
    
    if (response.data && response.data.data && response.data.data.permissions) {
      const permissionsList = response.data.data.permissions
      console.log('📝 Lista de permisos recibida:', permissionsList)
      
      userPermissions.value = {
        invoices: { view: false, create: false, edit: false, delete: false },
        documents: { view: false, upload: false, download: false },
        users: { view: false, create: false, edit: false, delete: false },
        suppliers: { view: false, create: false, edit: false, delete: false },
        dashboard: { view: false, view_stats: false, view_charts: false }
      }
      
      permissionsList.forEach(permission => {
        const [module, action] = permission.split('.')
        console.log(`🔧 Procesando permiso: ${permission} -> módulo: ${module}, acción: ${action}`)
        
        if (userPermissions.value[module] && userPermissions.value[module].hasOwnProperty(action)) {
          userPermissions.value[module][action] = true
          console.log(`✅ Permiso activado: ${module}.${action}`)
        } else {
          console.log(`❌ Permiso no reconocido o módulo inexistente: ${permission}`)
        }
      })
      
      console.log('🎯 Estado final de userPermissions:', userPermissions.value)
    } else {
      console.log('❌ Estructura de respuesta inesperada:', response.data)
    }
  } catch (error) {
    console.error('Error cargando permisos:', error)
    showMessage('Error al cargar los permisos del usuario', 'error')
  }
}

const savePermissions = async () => {
  if (!userForm.value?.id) return
  
  savingPermissions.value = true
  try {
    const permissionsArray = []
    
    Object.keys(userPermissions.value).forEach(module => {
      Object.keys(userPermissions.value[module]).forEach(action => {
        if (userPermissions.value[module][action]) {
          permissionsArray.push(`${module}.${action}`)
        }
      })
    })
    
    console.log('💾 Guardando permisos:', permissionsArray)
    
    await axios.put(`/api/users/${userForm.value.id}/permissions`, {
      permissions: permissionsArray
    })
    
    showMessage('Permisos actualizados correctamente', 'success')
    
    if (auth.user && auth.user.id === userForm.value.id) {
      console.log('🔄 Recargando permisos del usuario actual...')
      await auth.loadUserPermissions()
      console.log('✅ Permisos del usuario actual actualizados')
    }
    
  } catch (error) {
    console.error('Error guardando permisos:', error)
    showMessage('Error al guardar los permisos', 'error')
  } finally {
    savingPermissions.value = false
  }
}

const savePermissionsAndClose = async () => {
  await savePermissions()
  if (!savingPermissions.value) {
    closeUserDialog()
  }
}

// Función para cambiar contraseña
const changePassword = async () => {
  if (!passwordFormRef.value?.validate()) {
    return
  }
  
  if (!userForm.value?.id) {
    showMessage('Error: No se puede cambiar la contraseña sin un usuario válido', 'error')
    return
  }
  
  changingPassword.value = true
  try {
    await axios.put(`/api/users/${userForm.value.id}/change-password`, {
      password: newPassword.value
    })
    
    showMessage('Contraseña cambiada correctamente', 'success')
    
    newPassword.value = ''
    confirmPassword.value = ''
    
    closeUserDialog()
    
  } catch (error) {
    console.error('Error cambiando contraseña:', error)
    const message = error.response?.data?.message || 'Error al cambiar la contraseña'
    showMessage(message, 'error')
  } finally {
    changingPassword.value = false
  }
}

// Función personalizada para cerrar el diálogo y limpiar campos de contraseña
const closeUserDialogAndClearPassword = () => {
  newPassword.value = ''
  confirmPassword.value = ''
  showNewPassword.value = false
  showConfirmPassword.value = false
  closeUserDialog()
}

// Watch para cargar permisos cuando se edita un usuario
watch([userForm, activeTab], ([newUserForm, newTab]) => {
  if (newUserForm?.id && newTab === 'permissions') {
    loadUserPermissions(newUserForm.id)
  }
}, { deep: true })

// Watch para cambiar a la pestaña de permisos
watch([editMode, canManagePermissions], ([isEditMode, canManage]) => {
  if (isEditMode && canManage && userForm.value?.id) {
    // Mantener la pestaña activa
  } else if (!isEditMode) {
    activeTab.value = 'general'
    userPermissions.value = {
      invoices: { view: false, create: false, edit: false, delete: false },
      documents: { view: false, upload: false, download: false },
      users: { view: false, create: false, edit: false, delete: false },
      suppliers: { view: false, create: false, edit: false, delete: false },
      dashboard: { view: false, view_stats: false, view_charts: false }
    }
  }
})

// Sobrescribir funciones de filtro para incluir paginación
const enhancedDebounceSearch = () => {
  currentPage.value = 1
  debounceSearch()
}

const enhancedResetFilters = () => {
  currentPage.value = 1
  resetFilters()
}

const enhancedOnFilterChange = () => {
  currentPage.value = 1
  loadUsersWithPagination()
}

// Inicialización
onMounted(() => {
  initializeUsers()
})

// Mostrar/ocultar botones de primera/ultima según estado
const showFirstButton = computed(() => {
  return totalPages.value > 1 && currentPage.value === totalPages.value
})

const showLastButton = computed(() => {
  return totalPages.value > 1 && currentPage.value < totalPages.value
})
</script>

<style src="../styles/users.css" scoped></style>