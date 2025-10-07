import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from '../utils/axios'

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
  const regimenFilter = ref(null)
  const supplierDialog = ref(false)
  const editMode = ref(false)
  const saving = ref(false)
  const formValid = ref(false)
  const supplierFormRef = ref(null)

  const supplierForm = ref({
    business_name: '',
    nit: '',
    address: '',
    tipo_proveedor: 'definitiva', // Default
    is_active: true
  })

  // Campos nuevos para régimen y archivos
  // File input (File object) separate from stored metadata
  supplierForm.value.documento_isr_file = null

  // Reglas de validación (coinciden con las del backend)
  const nitRules = [
    v => !!v || 'NIT requerido',
    v => (v && v.length >= 8 && v.length <= 20) || 'El NIT debe tener entre 8 y 20 caracteres'
  ]

  const statusOptions = [
    { title: 'Activos', value: true },
    { title: 'Inactivos', value: false }
  ]

  const regimenOptions = [
  { title: 'Régimen Definitiva ISR', value: 'definitiva' },
  { title: 'Pagos Trimestrales', value: 'pagos_trimestrales' },
  { title: 'Pequeño Contribuyente', value: 'pequeno_contribuyente' },
  { title: 'Pagos Trimestrales - Agente Retención', value: 'pagos_trimestrales_retencion' }
  ]

  // Headers actualizados con la nueva columna "Régimen"
  const headers = [
    { title: 'Empresa', key: 'business_name', width: '250px' },
    { title: 'NIT', key: 'nit', width: '150px' },
    { title: 'Estado', key: 'is_active', width: '100px' },
    { title: 'Registrado', key: 'created_at', width: '120px' },
    { title: 'Régimen', key: 'tipo_proveedor', width: '180px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '280px' }
  ]

  // Mapeo de tipos de proveedor a nombres legibles
  const tipoProveedorLabels = {
    'definitiva': 'Régimen Definitiva ISR',
    'pagos_trimestrales': 'Pagos Trimestrales',
    'pequeno_contribuyente': 'Pequeño Contribuyente',
    'pagos_trimestrales_retencion': 'Pagos Trimestrales - Agente Retención'
  }

  // Función para formatear el tipo de proveedor
  const formatTipoProveedor = (tipo) => {
    return tipoProveedorLabels[tipo] || tipo || 'No especificado'
  }

  const loadSuppliers = async (options = {}) => {
    loading.value = true
    try {
      // Normalize search term to improve matching (remove accents/diacritics)
      const rawSearch = searchQuery.value ? String(searchQuery.value) : ''
      const normalizedSearch = rawSearch
        ? rawSearch.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
        : ''

      const params = {
        page: options.page || 1,
        limit: options.itemsPerPage || itemsPerPage.value,
        search: normalizedSearch,
        is_active: activeFilter.value !== null ? activeFilter.value : undefined,
        tipo_proveedor: regimenFilter.value || undefined  // ✅ Moverlo aquí dentro de params
      }

      console.log('📡 GET /api/suppliers params ->', params)
      const response = await axios.get('/api/suppliers', { params })
      console.log('📥 Response from /api/suppliers:', { status: response.status, keys: Object.keys(response.data || {}) })
      
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
    regimenFilter.value = null
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
      tipo_proveedor: 'definitiva', // Default
      is_active: true,
      documento_isr_file: null
    }
    supplierDialog.value = true
  }

  const editSupplier = (supplier) => {
    editMode.value = true
    // Copy supplier data into the form.
    supplierForm.value = { 
      ...supplier, 
      tipo_proveedor: supplier.tipo_proveedor || 'definitiva',
      documento_isr_file: null 
    }
    supplierDialog.value = true
  }

  const closeSupplierDialog = () => {
    supplierDialog.value = false
    supplierForm.value = {
      business_name: '',
      nit: '',
      address: '',
      tipo_proveedor: 'definitiva',
      is_active: true,
      documento_isr_file: null
    }
  }

  const saveSupplier = async () => {
    if (!formValid.value) return

    saving.value = true
    try {
      if (editMode.value) {
        // Editing - send only the fields that can be updated
        const payload = {
          business_name: supplierForm.value.business_name,
          nit: supplierForm.value.nit,
          address: supplierForm.value.address,
          contact_phone: supplierForm.value.contact_phone,
          tipo_proveedor: supplierForm.value.tipo_proveedor,
          is_active: supplierForm.value.is_active
        }
        console.log('📤 Actualizando proveedor:', payload)
        await axios.put(`/api/suppliers/${supplierForm.value.id}`, payload)
        toast.success('Proveedor actualizado exitosamente')
      } else {
        // Creation: send plain JSON
        const payload = { 
          business_name: supplierForm.value.business_name,
          nit: supplierForm.value.nit,
          address: supplierForm.value.address,
          tipo_proveedor: supplierForm.value.tipo_proveedor
        }
        console.log('📤 Creando proveedor:', payload)
        await axios.post('/api/suppliers', payload)
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
    try {
      return new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(dateString))
    } catch (e) {
      return new Date(dateString).toLocaleDateString('es-GT')
    }
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
    regimenFilter,
    supplierForm,
    nitRules,
    
    // Static data
    statusOptions,
    headers,
    regimenOptions,
    
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
    formatTipoProveedor,
    initializeSuppliers
  }
}