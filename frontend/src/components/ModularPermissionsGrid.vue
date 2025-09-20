<template>
  <div class="permissions-container">
    <div class="permissions-header">
      <h3>Gestión de Permisos</h3>
      <p>Usuario: <strong>{{ userName }}</strong> ({{ userRole }})</p>
    </div>

    <div class="permissions-table-container">
      <v-table class="permissions-table">
        <thead>
          <tr>
            <th class="module-header">MÓDULO</th>
            <th class="permission-header">VER</th>
            <th class="permission-header">CREAR/SUBIR</th>
            <th class="permission-header">EDITAR/ELIMINAR</th>
            <th class="permission-header">ESPECIAL</th>
            <th class="permission-header all-header">TODAS</th>
          </tr>
        </thead>
        <tbody>
          <!-- FACTURAS -->
          <tr class="permission-row">
            <td class="module-cell">
              <div class="module-info">
                <v-icon class="module-icon">mdi-file-document-outline</v-icon>
                <span class="module-name">FACTURAS</span>
              </div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.facturas.ver"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.facturas.ver }"
                hide-details
                @change="onPermissionChange('facturas', 'ver')"
              ></v-checkbox>
              <span class="permission-label">Ver</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.facturas.crear"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.facturas.crear }"
                hide-details
                @change="onPermissionChange('facturas', 'crear')"
              ></v-checkbox>
              <span class="permission-label">Crear</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.facturas.editar"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.facturas.editar }"
                hide-details
                @change="onPermissionChange('facturas', 'editar')"
              ></v-checkbox>
              <span class="permission-label">Editar</span>
            </td>
            <td class="permission-cell">
              <div class="special-permissions">
                <v-checkbox
                  v-model="permissions.facturas.asignar"
                  class="permission-checkbox special-checkbox"
                  :class="{ 'checkbox-granted': permissions.facturas.asignar }"
                  hide-details
                  @change="onPermissionChange('facturas', 'asignar')"
                ></v-checkbox>
                <span class="permission-label">Asignar</span>
                <v-checkbox
                  v-model="permissions.facturas.aprobar"
                  class="permission-checkbox special-checkbox"
                  :class="{ 'checkbox-granted': permissions.facturas.aprobar }"
                  hide-details
                  @change="onPermissionChange('facturas', 'aprobar')"
                ></v-checkbox>
                <span class="permission-label">Aprobar</span>
              </div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.facturas.todas"
                class="permission-checkbox all-checkbox"
                :class="{ 'checkbox-granted': permissions.facturas.todas }"
                hide-details
                @change="onAllPermissionChange('facturas')"
              ></v-checkbox>
              <span class="permission-label">Todas</span>
            </td>
          </tr>

          <!-- DOCUMENTOS -->
          <tr class="permission-row">
            <td class="module-cell">
              <div class="module-info">
                <v-icon class="module-icon">mdi-folder-outline</v-icon>
                <span class="module-name">DOCUMENTOS</span>
              </div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.documentos.ver"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.documentos.ver }"
                hide-details
                @change="onPermissionChange('documentos', 'ver')"
              ></v-checkbox>
              <span class="permission-label">Ver</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.documentos.subir"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.documentos.subir }"
                hide-details
                @change="onPermissionChange('documentos', 'subir')"
              ></v-checkbox>
              <span class="permission-label">Subir</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.documentos.eliminar"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.documentos.eliminar }"
                hide-details
                @change="onPermissionChange('documentos', 'eliminar')"
              ></v-checkbox>
              <span class="permission-label">Eliminar</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.documentos.validar"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.documentos.validar }"
                hide-details
                @change="onPermissionChange('documentos', 'validar')"
              ></v-checkbox>
              <span class="permission-label">Validar</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.documentos.todas"
                class="permission-checkbox all-checkbox"
                :class="{ 'checkbox-granted': permissions.documentos.todas }"
                hide-details
                @change="onAllPermissionChange('documentos')"
              ></v-checkbox>
              <span class="permission-label">Todas</span>
            </td>
          </tr>

          <!-- PROVEEDORES -->
          <tr class="permission-row">
            <td class="module-cell">
              <div class="module-info">
                <v-icon class="module-icon">mdi-domain</v-icon>
                <span class="module-name">PROVEEDORES</span>
              </div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.proveedores.ver"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.proveedores.ver }"
                hide-details
                @change="onPermissionChange('proveedores', 'ver')"
              ></v-checkbox>
              <span class="permission-label">Ver</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.proveedores.crear"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.proveedores.crear }"
                hide-details
                @change="onPermissionChange('proveedores', 'crear')"
              ></v-checkbox>
              <span class="permission-label">Crear</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.proveedores.editar"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.proveedores.editar }"
                hide-details
                @change="onPermissionChange('proveedores', 'editar')"
              ></v-checkbox>
              <span class="permission-label">Editar</span>
            </td>
            <td class="permission-cell">
              <span class="no-special">—</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.proveedores.todas"
                class="permission-checkbox all-checkbox"
                :class="{ 'checkbox-granted': permissions.proveedores.todas }"
                hide-details
                @change="onAllPermissionChange('proveedores')"
              ></v-checkbox>
              <span class="permission-label">Todas</span>
            </td>
          </tr>

          <!-- USUARIOS -->
          <tr class="permission-row">
            <td class="module-cell">
              <div class="module-info">
                <v-icon class="module-icon">mdi-account-group</v-icon>
                <span class="module-name">USUARIOS</span>
              </div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.usuarios.ver"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.usuarios.ver }"
                hide-details
                @change="onPermissionChange('usuarios', 'ver')"
              ></v-checkbox>
              <span class="permission-label">Ver</span>
              <div class="permission-note">(sin crear admins)</div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.usuarios.crear"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.usuarios.crear }"
                hide-details
                @change="onPermissionChange('usuarios', 'crear')"
              ></v-checkbox>
              <span class="permission-label">Crear</span>
              <div class="permission-note">(sin crear admins)</div>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.usuarios.editar"
                class="permission-checkbox"
                :class="{ 'checkbox-granted': permissions.usuarios.editar }"
                hide-details
                @change="onPermissionChange('usuarios', 'editar')"
              ></v-checkbox>
              <span class="permission-label">Editar</span>
            </td>
            <td class="permission-cell">
              <span class="no-special">—</span>
            </td>
            <td class="permission-cell">
              <v-checkbox
                v-model="permissions.usuarios.todas"
                class="permission-checkbox all-checkbox"
                :class="{ 'checkbox-granted': permissions.usuarios.todas }"
                hide-details
                @change="onAllPermissionChange('usuarios')"
              ></v-checkbox>
              <span class="permission-label">Todas</span>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <div class="permissions-actions">
      <v-btn
        color="success"
        @click="savePermissions"
        :loading="saving"
        class="save-btn"
      >
        <v-icon class="mr-2">mdi-content-save</v-icon>
        Guardar Permisos
      </v-btn>
      
      <v-btn
        color="warning"
        variant="outlined"
        @click="resetPermissions"
        class="ml-4"
      >
        <v-icon class="mr-2">mdi-refresh</v-icon>
        Restablecer
      </v-btn>
    </div>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const props = defineProps({
  userId: {
    type: Number,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['saved'])

// Estado reactivo
const saving = ref(false)
const snackbar = reactive({
  show: false,
  message: '',
  color: 'success'
})

// Estructura de permisos
const permissions = reactive({
  facturas: {
    ver: false,
    crear: false,
    editar: false,
    asignar: false,
    aprobar: false,
    todas: false
  },
  documentos: {
    ver: false,
    subir: false,
    eliminar: false,
    validar: false,
    todas: false
  },
  proveedores: {
    ver: false,
    crear: false,
    editar: false,
    todas: false
  },
  usuarios: {
    ver: false,
    crear: false,
    editar: false,
    todas: false
  }
})

// Cargar permisos del usuario
const loadUserPermissions = async () => {
  try {
    const response = await axios.get(`/api/users/${props.userId}/permissions`)
    const userPermissions = response.data.permissions || {}
    
    // Mapear permisos del backend a la estructura del frontend
    Object.keys(permissions).forEach(module => {
      const modulePerms = userPermissions[module] || {}
      Object.keys(permissions[module]).forEach(action => {
        if (action !== 'todas') {
          permissions[module][action] = modulePerms[action] || false
        }
      })
      
      // Calcular "todas" basado en los permisos individuales
      updateAllPermission(module)
    })
  } catch (error) {
    console.error('Error cargando permisos:', error)
    showSnackbar('Error cargando permisos del usuario', 'error')
  }
}

// Actualizar permiso "todas" basado en permisos individuales
const updateAllPermission = (module) => {
  const modulePerms = permissions[module]
  const individualPerms = Object.keys(modulePerms).filter(key => key !== 'todas')
  const allGranted = individualPerms.every(perm => modulePerms[perm])
  modulePerms.todas = allGranted
}

// Manejar cambio en permiso individual
const onPermissionChange = (module, action) => {
  // Pequeño delay para evitar problemas de reactividad
  setTimeout(() => {
    updateAllPermission(module)
  }, 10)
}

// Manejar cambio en permiso "todas"
const onAllPermissionChange = (module) => {
  const allChecked = permissions[module].todas
  Object.keys(permissions[module]).forEach(action => {
    if (action !== 'todas') {
      permissions[module][action] = allChecked
    }
  })
  // No necesitamos llamar updateAllPermission aquí porque acabamos de establecer el valor
}

// Guardar permisos
const savePermissions = async () => {
  saving.value = true
  try {
    // Preparar datos para el backend
    const permissionsData = {}
    Object.keys(permissions).forEach(module => {
      permissionsData[module] = {}
      Object.keys(permissions[module]).forEach(action => {
        if (action !== 'todas') {
          permissionsData[module][action] = permissions[module][action]
        }
      })
    })

    await axios.put(`/api/users/${props.userId}/permissions`, {
      permissions: permissionsData
    })
    
    // Si es el usuario actual, refrescar sus datos
    if (props.userId === auth.user?.id) {
      await auth.refreshUser()
    }
    
    showSnackbar('Permisos guardados exitosamente', 'success')
    emit('saved')
  } catch (error) {
    console.error('Error guardando permisos:', error)
    showSnackbar('Error guardando permisos', 'error')
  } finally {
    saving.value = false
  }
}

// Restablecer permisos
const resetPermissions = () => {
  loadUserPermissions()
  showSnackbar('Permisos restablecidos', 'info')
}

// Mostrar snackbar
const showSnackbar = (message, color = 'success') => {
  snackbar.message = message
  snackbar.color = color
  snackbar.show = true
}

// Cargar permisos al montar el componente
onMounted(() => {
  loadUserPermissions()
})
</script>

<style scoped>
.permissions-container {
  padding: 20px 0;
}

.permissions-header {
  margin-bottom: 24px;
  text-align: center;
}

.permissions-header h3 {
  color: #1976d2;
  margin-bottom: 8px;
}

.permissions-table-container {
  margin-bottom: 24px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.permissions-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.permissions-table th {
  background: #f5f5f5;
  padding: 16px 12px;
  font-weight: 600;
  text-align: center;
  border-bottom: 2px solid #e0e0e0;
  font-size: 0.875rem;
}

.module-header {
  background: #1976d2 !important;
  color: white !important;
  text-align: left !important;
  width: 200px;
}

.permission-header {
  min-width: 120px;
}

.all-header {
  background: #4caf50 !important;
  color: white !important;
}

.permission-row {
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s;
}

.permission-row:hover {
  background-color: #f9f9f9;
}

.permission-row:last-child {
  border-bottom: none;
}

.module-cell {
  padding: 16px;
  background: #fafafa;
  border-right: 2px solid #e0e0e0;
}

.module-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-icon {
  color: #1976d2;
  font-size: 24px;
}

.module-name {
  font-weight: 600;
  color: #333;
  font-size: 0.875rem;
}

.permission-cell {
  padding: 16px 12px;
  text-align: center;
  vertical-align: middle;
  border-right: 1px solid #e0e0e0;
}

.permission-cell:last-child {
  border-right: none;
  background: #f8f8f8;
}

.permission-checkbox {
  margin-bottom: 4px;
}

.permission-label {
  display: block;
  font-size: 0.75rem;
  color: #666;
  margin-top: 4px;
}

.permission-note {
  font-size: 0.65rem;
  color: #999;
  font-style: italic;
  margin-top: 2px;
}

.special-permissions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.special-checkbox {
  margin-bottom: 2px;
}

.no-special {
  color: #ccc;
  font-size: 1.5rem;
  font-weight: bold;
}

/* Colores para checkboxes */
:deep(.v-checkbox .v-selection-control__input) {
  background-color: #ffffff;
  border: 2px solid #ccc;
  border-radius: 4px;
}

:deep(.checkbox-granted .v-selection-control__input) {
  background-color: #4caf50 !important;
  border-color: #4caf50 !important;
}

:deep(.checkbox-granted .v-icon) {
  color: white !important;
}

:deep(.all-checkbox.checkbox-granted .v-selection-control__input) {
  background-color: #2e7d32 !important;
  border-color: #2e7d32 !important;
}

.permissions-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.save-btn {
  font-weight: 600;
}

/* Responsive */
@media (max-width: 768px) {
  .permissions-table-container {
    overflow-x: auto;
  }
  
  .permissions-table {
    min-width: 800px;
  }
  
  .module-header,
  .permission-header {
    font-size: 0.75rem;
    padding: 12px 8px;
  }
  
  .permission-cell {
    padding: 12px 8px;
  }
}
</style>
