<template>
    <div class="suppliers-layout">
      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn icon @click="goBack" color="#64748b" class="ml-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Proveedores</div>
          <div class="header-subtitle">Gestión de empresas proveedoras</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn 
          color="primary" 
          @click="openCreateDialog"
          prepend-icon="mdi-plus"
          class="new-supplier-btn"
        >
          Nuevo Proveedor
        </v-btn>
      </v-app-bar>
  
      <v-main class="main-content">
        <v-container class="py-8">
          <!-- Filtros -->
          <v-card class="filter-card mb-6" elevation="2">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    v-model="search"
                    label="Buscar proveedor"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    @input="debounceSearch"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="activeFilter"
                    :items="activeOptions"
                    label="Estado"
                    variant="outlined"
                    density="comfortable"
                    @update:model-value="loadSuppliers"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="2">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    @click="exportSuppliers"
                    prepend-icon="mdi-download"
                    class="export-btn"
                  >
                    Exportar
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
  
          <!-- Tabla de proveedores -->
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between pa-6">
              <div class="card-title">
                <v-icon class="mr-2">mdi-account-group-outline</v-icon>
                Lista de Proveedores ({{ totalSuppliers }})
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
  
              <template v-slot:item.contact_info="{ item }">
                <div class="contact-info">
                  <div v-if="item.contact_email" class="contact-email">
                    <v-icon size="14" class="mr-1">mdi-email</v-icon>
                    {{ item.contact_email }}
                  </div>
                  <div v-if="item.contact_phone" class="contact-phone">
                    <v-icon size="14" class="mr-1">mdi-phone</v-icon>
                    {{ item.contact_phone }}
                  </div>
                </div>
              </template>
  
              <template v-slot:item.users_count="{ item }">
                <v-chip
                  :color="item.Users?.length > 0 ? 'success' : 'grey'"
                  size="small"
                >
                  {{ item.Users?.length || 0 }} usuario(s)
                </v-chip>
              </template>
  
              <template v-slot:item.is_active="{ item }">
                <v-chip
                  :color="item.is_active ? 'success' : 'error'"
                  size="small"
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
                    icon
                    size="small"
                    variant="text"
                    color="primary"
                    @click="viewSupplier(item)"
                  >
                    <v-icon size="18">mdi-eye-outline</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    color="warning"
                    @click="editSupplier(item)"
                  >
                    <v-icon size="18">mdi-pencil-outline</v-icon>
                  </v-btn>
                  <v-btn
                    icon
                    size="small"
                    variant="text"
                    :color="item.is_active ? 'error' : 'success'"
                    @click="toggleSupplier(item)"
                  >
                    <v-icon size="18">
                      {{ item.is_active ? 'mdi-eye-off' : 'mdi-eye' }}
                    </v-icon>
                  </v-btn>
                </div>
              </template>
  
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>
  
              <template v-slot:no-data>
                <div class="no-data">
                  <v-icon size="64" color="grey-lighten-2">mdi-account-group-outline</v-icon>
                  <h3>No hay proveedores</h3>
                  <p>No se encontraron proveedores registrados</p>
                </div>
              </template>
            </v-data-table-server>
          </v-card>
        </v-container>
      </v-main>
  
      <!-- Dialog para crear/editar proveedor -->
      <v-dialog v-model="supplierDialog" max-width="800" persistent>
        <v-card>
          <v-card-title>
            {{ editMode ? 'Editar Proveedor' : 'Nuevo Proveedor' }}
          </v-card-title>
          <v-card-text>
            <v-form ref="supplierForm" v-model="formValid">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="supplierForm.business_name"
                    label="Razón Social"
                    variant="outlined"
                    :rules="[v => !!v || 'Razón social requerida']"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="supplierForm.nit"
                    label="NIT"
                    variant="outlined"
                    :rules="[v => !!v || 'NIT requerido']"
                    :disabled="editMode"
                    required
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="supplierForm.contact_email"
                    label="Email de Contacto"
                    variant="outlined"
                    type="email"
                    :rules="emailRules"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="supplierForm.contact_phone"
                    label="Teléfono de Contacto"
                    variant="outlined"
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
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useToast } from 'vue-toastification'
  import axios from 'axios'
  
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const loading = ref(false)
  const saving = ref(false)
  const suppliers = ref([])
  const totalSuppliers = ref(0)
  const itemsPerPage = ref(10)
  const search = ref('')
  const activeFilter = ref('all')
  const supplierDialog = ref(false)
  const editMode = ref(false)
  const formValid = ref(false)
  
  const supplierForm = ref({
    business_name: '',
    nit: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    is_active: true
  })
  
  const activeOptions = [
    { title: 'Todos', value: 'all' },
    { title: 'Activos', value: 'true' },
    { title: 'Inactivos', value: 'false' }
  ]
  
  const headers = [
    { title: 'Razón Social', key: 'business_name', width: '250px' },
    { title: 'NIT', key: 'nit', width: '120px' },
    { title: 'Contacto', key: 'contact_info', width: '200px' },
    { title: 'Usuarios', key: 'users_count', width: '120px' },
    { title: 'Estado', key: 'is_active', width: '100px' },
    { title: 'Fecha Registro', key: 'created_at', width: '140px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '120px' }
  ]
  
  const emailRules = [
    v => !v || /.+@.+\..+/.test(v) || 'Email debe ser válido'
  ]
  
  const goBack = () => {
    router.push('/dashboard')
  }
  
  const loadSuppliers = async (options = {}) => {
  loading.value = true
  try {
    const params = {
      page: options.page || 1,
      limit: options.itemsPerPage || itemsPerPage.value,
      search: search.value,
      is_active: activeFilter.value !== 'all' ? activeFilter.value : undefined
    }

    const response = await axios.get('/api/suppliers', { params })
    suppliers.value = response.data.suppliers
    totalSuppliers.value = response.data.total
  } catch (error) {
    console.error('Error loading suppliers:', error)
    toast.error('Error al cargar los proveedores')
  } finally {
    loading.value = false
  }
}

let searchTimeout
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadSuppliers()
  }, 500)
}

const openCreateDialog = () => {
  editMode.value = false
  supplierForm.value = {
    business_name: '',
    nit: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    is_active: true
  }
  supplierDialog.value = true
}

const viewSupplier = (supplier) => {
  console.log('Ver proveedor:', supplier)
}

const editSupplier = (supplier) => {
  editMode.value = true
  supplierForm.value = { ...supplier }
  supplierDialog.value = true
}

const closeSupplierDialog = () => {
  supplierDialog.value = false
  supplierForm.value = {
    business_name: '',
    nit: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    is_active: true
  }
}

const saveSupplier = async () => {
  if (!formValid.value) return

  saving.value = true
  try {
    if (editMode.value) {
      await axios.put(`/api/suppliers/${supplierForm.value.id}`, supplierForm.value)
      toast.success('Proveedor actualizado exitosamente')
    } else {
      await axios.post('/api/suppliers', supplierForm.value)
      toast.success('Proveedor creado exitosamente')
    }

    closeSupplierDialog()
    loadSuppliers()
  } catch (error) {
    console.error('Error saving supplier:', error)
    toast.error(error.response?.data?.error || 'Error al guardar el proveedor')
  } finally {
    saving.value = false
  }
}

const toggleSupplier = async (supplier) => {
  try {
    await axios.put(`/api/suppliers/${supplier.id}`, {
      ...supplier,
      is_active: !supplier.is_active
    })

    toast.success(`Proveedor ${supplier.is_active ? 'desactivado' : 'activado'} exitosamente`)
    loadSuppliers()
  } catch (error) {
    console.error('Error toggling supplier:', error)
    toast.error('Error al cambiar el estado del proveedor')
  }
}

const exportSuppliers = () => {
  console.log('Exportar proveedores')
  toast.info('Función de exportación en desarrollo')
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('es-GT')
}

onMounted(() => {
  loadSuppliers()
})
</script>

<style scoped>
.suppliers-layout {
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

.new-supplier-btn {
  text-transform: none;
  font-weight: 600;
}

.export-btn {
  text-transform: none;
  font-weight: 500;
  width: 100%;
}

.suppliers-table {
  border-radius: 0 0 12px 12px;
}

.supplier-name {
  font-weight: 600;
  color: #0f172a;
  font-size: 14px;
}

.nit-cell {
  font-family: 'Courier New', monospace;
  font-weight: 500;
  color: #64748b;
}

.contact-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-email,
.contact-phone {
  display: flex;
  align-items: center;
  font-size: 13px;
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