<template>
    <div class="users-layout">
      <!-- Sidebar -->
      <AppSidebar v-model="drawer" />

      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn 
          icon 
          @click="drawer = !drawer" 
          color="#64748b" 
          class="ml-2"
          v-if="$vuetify.display.mdAndDown"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Usuarios</div>
          <div class="header-subtitle">Gestión de usuarios del sistema</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          @click="openCreateDialog"
          prepend-icon="mdi-plus"
          class="new-user-btn"
        >
          Nuevo Usuario
        </v-btn>
      </v-app-bar>

      <v-main class="main-content">
        <v-container class="py-8">
          <!-- Filtros -->
          <v-card class="filter-card mb-6" elevation="2">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="search"
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
                    :items="activeOptions"
                    label="Estado"
                    variant="outlined"
                    density="comfortable"
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
                  >
                    Exportar
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Tabla de usuarios -->
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between pa-6">
              <div class="card-title">
                <v-icon class="mr-2">mdi-account-multiple-outline</v-icon>
                Lista de Usuarios ({{ totalUsers }})
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
                <div class="user-info">
                  <div class="user-name">{{ item.name }}</div>
                  <div class="user-email">{{ item.email }}</div>
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
                >
                  {{ item.is_active ? 'Activo' : 'Inactivo' }}
                </v-chip>
              </template>

              <template v-slot:item.last_login="{ item }">
                <div class="date-cell">
                  {{ item.last_login ? formatDate(item.last_login) : 'Nunca' }}
                </div>
              </template>

              <template v-slot:item.created_at="{ item }">
                <div class="date-cell">{{ formatDate(item.created_at) }}</div>
              </template>

              <template v-slot:item.actions="{ item }">
                <div class="actions-cell">
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    @click="viewUser(item)"
                  >
                    <v-icon size="18">mdi-eye-outline</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="warning"
                    @click="editUser(item)"
                    :disabled="item.id === authStore.user?.id"
                  >
                    <v-icon size="18">mdi-pencil-outline</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    :color="item.is_active ? 'error' : 'success'"
                    @click="toggleUser(item)"
                    :disabled="item.id === authStore.user?.id"
                  >
                    <v-icon size="18">
                      {{ item.is_active ? 'mdi-account-off' : 'mdi-account-check' }}
                    </v-icon>
                  </v-btn>
                </div>
              </template>

              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>

              <template v-slot:no-data>
                <div class="no-data">
                  <v-icon size="64" color="grey-lighten-2">mdi-account-multiple-outline</v-icon>
                  <h3>No hay usuarios</h3>
                  <p>No se encontraron usuarios registrados</p>
                </div>
              </template>
            </v-data-table-server>
          </v-card>
        </v-container>
      </v-main>

      <!-- Dialog para crear/editar usuario -->
      <v-dialog v-model="userDialog" max-width="600" persistent>
        <v-card>
          <v-card-title>
            {{ editMode ? 'Editar Usuario' : 'Nuevo Usuario' }}
          </v-card-title>
          <v-card-text>
            <v-form ref="userForm" v-model="formValid">
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
                    label="Correo Electrónico"
                    variant="outlined"
                    type="email"
                    :rules="emailRules"
                    :disabled="editMode"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12" v-if="!editMode">
                  <v-text-field
                    v-model="userForm.password"
                    label="Contraseña"
                    variant="outlined"
                    type="password"
                    :rules="passwordRules"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import AppSidebar from '../components/AppSidebar.vue'
import axios from 'axios'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Estados reactivos
const drawer = ref(true)
const loading = ref(false)
const saving = ref(false)
const users = ref([])
const suppliers = ref([])
const totalUsers = ref(0)
const itemsPerPage = ref(10)
const search = ref('')
const roleFilter = ref(null)
const activeFilter = ref('all')
const userDialog = ref(false)
const editMode = ref(false)
const formValid = ref(false)

const userForm = ref({
  name: '',
  email: '',
  password: '',
  role: '',
  supplier_id: null,
  is_active: true
})

const roleOptions = [
  { title: 'Super Admin', value: 'super_admin' },
  { title: 'Admin Contaduría', value: 'admin_contaduria' },
  { title: 'Trabajador Contaduría', value: 'trabajador_contaduria' },
  { title: 'Proveedor', value: 'proveedor' }
]

const activeOptions = [
  { title: 'Todos', value: 'all' },
  { title: 'Activos', value: 'true' },
  { title: 'Inactivos', value: 'false' }
]

const headers = [
  { title: 'Usuario', key: 'name', width: '250px' },
  { title: 'Rol', key: 'role', width: '150px' },
  { title: 'Empresa', key: 'supplier', width: '200px' },
  { title: 'Estado', key: 'is_active', width: '100px' },
  { title: 'Último Acceso', key: 'last_login', width: '140px' },
  { title: 'Registro', key: 'created_at', width: '120px' },
  { title: 'Acciones', key: 'actions', sortable: false, width: '120px' }
]

const emailRules = [
  v => !!v || 'Email requerido',
  v => /.+@.+\..+/.test(v) || 'Email debe ser válido'
]

const passwordRules = [
  v => !!v || 'Contraseña requerida',
  v => v.length >= 6 || 'Contraseña debe tener al menos 6 caracteres'
]

const loadUsers = async (options = {}) => {
  loading.value = true
  try {
    const params = {
      page: options.page || 1,
      limit: options.itemsPerPage || itemsPerPage.value,
      search: search.value,
      role: roleFilter.value,
      is_active: activeFilter.value !== 'all' ? activeFilter.value : undefined
    }

    const response = await axios.get('/api/users', { params })
    users.value = response.data.users || response.data
    totalUsers.value = response.data.total || response.data.length
  } catch (error) {
    console.error('Error loading users:', error)
    toast.error('Error al cargar los usuarios')
  } finally {
    loading.value = false
  }
}

const loadSuppliers = async () => {
  try {
    const response = await axios.get('/api/suppliers')
    suppliers.value = response.data.suppliers || response.data
  } catch (error) {
    console.error('Error loading suppliers:', error)
  }
}

let searchTimeout
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadUsers()
  }, 500)
}

const openCreateDialog = () => {
  editMode.value = false
  userForm.value = {
    name: '',
    email: '',
    password: '',
    role: '',
    supplier_id: null,
    is_active: true
  }
  userDialog.value = true
}

const viewUser = (user) => {
  console.log('Ver usuario:', user)
}

const editUser = (user) => {
  editMode.value = true
  userForm.value = {
    ...user,
    password: '',
    supplier_id: user.supplier_id
  }
  userDialog.value = true
}

const closeUserDialog = () => {
  userDialog.value = false
  userForm.value = {
    name: '',
    email: '',
    password: '',
    role: '',
    supplier_id: null,
    is_active: true
  }
}

const onRoleChange = () => {
  if (userForm.value.role !== 'proveedor') {
    userForm.value.supplier_id = null
  }
}

const saveUser = async () => {
  if (!formValid.value) return

  saving.value = true
  try {
    const userData = { ...userForm.value }
    if (editMode.value) {
      delete userData.password // No enviar password en edición
      await axios.put(`/api/users/${userData.id}`, userData)
      toast.success('Usuario actualizado exitosamente')
    } else {
      await axios.post('/api/users', userData)
      toast.success('Usuario creado exitosamente')
    }

    closeUserDialog()
    loadUsers()
  } catch (error) {
    console.error('Error saving user:', error)
    toast.error(error.response?.data?.error || 'Error al guardar el usuario')
  } finally {
    saving.value = false
  }
}

const toggleUser = async (user) => {
  try {
    await axios.put(`/api/users/${user.id}`, {
      ...user,
      is_active: !user.is_active
    })

    toast.success(`Usuario ${user.is_active ? 'desactivado' : 'activado'} exitosamente`)
    loadUsers()
  } catch (error) {
    console.error('Error toggling user:', error)
    toast.error('Error al cambiar el estado del usuario')
  }
}

const exportUsers = () => {
  console.log('Exportar usuarios')
  toast.info('Función de exportación en desarrollo')
}

const getRoleColor = (role) => {
  const colors = {
    'super_admin': 'purple',
    'admin_contaduria': 'primary',
    'trabajador_contaduria': 'info',
    'proveedor': 'success'
  }
  return colors[role] || 'grey'
}

const getRoleText = (role) => {
  const texts = {
    'super_admin': 'Super Admin',
    'admin_contaduria': 'Admin Contaduría',
    'trabajador_contaduria': 'Trabajador',
    'proveedor': 'Proveedor'
  }
  return texts[role] || role
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-GT')
}

onMounted(() => {
  loadUsers()
  loadSuppliers()
})
</script>

<style scoped>
.users-layout {
  min-height: 100vh;
  background: #f8fafc;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.header-subtitle {
  font-size: 13px;
  color: #64748b;
}

.main-content {
  background: #f8fafc;
  min-height: calc(100vh - 64px);
}

.filter-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.new-user-btn {
  text-transform: none;
  font-weight: 600;
}

.export-btn {
  text-transform: none;
  font-weight: 500;
  width: 100%;
}

.users-table {
  border-radius: 0 0 12px 12px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
}

.user-email {
  font-size: 13px;
  color: #64748b;
}

.role-chip {
  font-size: 11px;
  font-weight: 600;
}

.supplier-info {
  display: flex;
  flex-direction: column;
}

.supplier-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 13px;
}

.supplier-nit {
  font-size: 12px;
  color: #64748b;
}

.date-cell {
  color: #64748b;
  font-size: 14px;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

.no-data h3 {
  margin: 16px 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.no-data p {
  margin: 0;
  font-size: 14px;
}
</style>