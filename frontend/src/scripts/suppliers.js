import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useSuppliers() {
  const router = useRouter()
  const toast = useToast()

  // Estados reactivos
  const loading = ref(false)
  const suppliers = ref([])
  const totalSuppliers = ref(0)
  const itemsPerPage = ref(10)
  const searchQuery = ref('')
  const activeFilter = ref(null)
  const supplierDialog = ref(false)
  const editMode = ref(false)
  const saving = ref(false)
  const formValid = ref(false)
  const supplierFormRef = ref(null)

  const supplierForm = ref({
    business_name: '',
    nit: '',
    address: '',
    is_active: true
  })

  // Reglas de validación (coinciden con las del backend)
  const nitRules = [
    v => !!v || 'NIT requerido',
    v => (v && v.length >= 8 && v.length <= 20) || 'El NIT debe tener entre 8 y 20 caracteres'
  ]

  const statusOptions = [
    { title: 'Activos', value: true },
    { title: 'Inactivos', value: false }
  ]

  const headers = [
    { title: 'Empresa', key: 'business_name', width: '250px' },
    { title: 'NIT', key: 'nit', width: '150px' },
    { title: 'Estado', key: 'is_active', width: '100px' },
    { title: 'Registrado', key: 'created_at', width: '120px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '280px' }
  ]

  const loadSuppliers = async (options = {}) => {
    loading.value = true
    try {
      const params = {
        page: options.page || 1,
        limit: options.itemsPerPage || itemsPerPage.value,
        search: searchQuery.value,
        is_active: activeFilter.value !== null ? activeFilter.value : undefined
      }

      const response = await axios.get('/api/suppliers', { params })
      
      // Manejar diferentes estructuras de respuesta del API
      if (response.data.success && response.data.data) {
        suppliers.value = response.data.data.suppliers || []
        totalSuppliers.value = response.data.data.total || 0
      } else {
        suppliers.value = response.data.suppliers || response.data || []
        totalSuppliers.value = response.data.total || 0
      }
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

  // Limpiar filtros de búsqueda y recargar
  const resetFilters = () => {
    searchQuery.value = ''
    activeFilter.value = null
    // resetear paginación a por defecto
    itemsPerPage.value = 10
    loadSuppliers()
  }

  const openCreateDialog = () => {
    editMode.value = false
    supplierForm.value = {
      business_name: '',
      nit: '',
      address: '',
      is_active: true
    }
    supplierDialog.value = true
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
      // Mostrar mensajes de validación del servidor si existen
      let serverMessage = null
      if (error.response?.data) {
        if (error.response.data.error) serverMessage = error.response.data.error
        else if (Array.isArray(error.response.data.errors)) {
          serverMessage = error.response.data.errors.map(e => e.msg).join(', ')
        }
      }
      toast.error(serverMessage || 'Error al guardar el proveedor')
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
      toast.error('Error al cambiar estado del proveedor')
    }
  }



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-GT')
  }

  // Función de inicialización
  const initializeSuppliers = async () => {
    await loadSuppliers()
  }

  return {
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
  nitRules,
    
    // Static data
    statusOptions,
    headers,
    
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
  }
}
