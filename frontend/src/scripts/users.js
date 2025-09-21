import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function useUsers() {
  const router = useRouter()
  const toast = useToast()

  // Estados reactivos
  const loading = ref(false)
  const users = ref([])
  const suppliers = ref([])
  const totalUsers = ref(0)
  const itemsPerPage = ref(10)
  const searchQuery = ref('')
  const roleFilter = ref(null)
  const activeFilter = ref(null)
  const userDialog = ref(false)
  const editMode = ref(false)
  const saving = ref(false)
  const formValid = ref(false)
  const userFormRef = ref(null)
  const permissionsDialog = ref(false)
  const selectedUserForPermissions = ref(null)
  const showPassword = ref(false)

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

  const statusOptions = [
    { title: 'Activos', value: true },
    { title: 'Inactivos', value: false }
  ]

  const headers = [
    { title: 'Usuario', key: 'name', width: '250px' },
    { title: 'Rol', key: 'role', width: '180px' },
    { title: 'Empresa', key: 'supplier', width: '200px' },
    { title: 'Estado', key: 'is_active', width: '100px' },
    { title: 'Registrado', key: 'created_at', width: '120px' },
    { title: 'Acciones', key: 'actions', sortable: false, width: '280px' }
  ]

  const loadUsers = async (options = {}) => {
    loading.value = true
    try {
      const params = {
        page: options.page || 1,
        limit: options.itemsPerPage || itemsPerPage.value,
        search: searchQuery.value,
        role: roleFilter.value,
        // Corregir el filtro de estado - debe usar el valor correcto
        is_active: activeFilter.value
      }

      // Solo enviar is_active si no es null/undefined
      if (activeFilter.value === null || activeFilter.value === undefined) {
        delete params.is_active
      }

      const response = await axios.get('/api/users', { params })
      
      // Manejar diferentes estructuras de respuesta del API
      if (response.data.success && response.data.data) {
        users.value = response.data.data.users || []
        totalUsers.value = response.data.data.total || 0
      } else {
        users.value = response.data.users || response.data || []
        totalUsers.value = response.data.total || 0
      }
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Error al cargar los usuarios')
    } finally {
      loading.value = false
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers?is_active=true')
      
      // Manejar diferentes estructuras de respuesta del API
      if (response.data.success && response.data.data) {
        suppliers.value = response.data.data.suppliers || []
      } else {
        suppliers.value = response.data.suppliers || response.data || []
      }
    } catch (error) {
      console.error('Error loading suppliers:', error)
      suppliers.value = []
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
      password: '' // No mostrar contraseña actual
    }
    userDialog.value = true
  }

  const closeUserDialog = () => {
    userDialog.value = false
    showPassword.value = false
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
      
      // No enviar contraseña vacía en edición
      if (editMode.value && !userData.password) {
        delete userData.password
      }

      if (editMode.value) {
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
      console.error('Error response data:', error.response?.data)
      
      // Extraer el mensaje de error del backend
      let errorMessage = 'Error al guardar el usuario'
      
      if (error.response?.data) {
        // El backend devuelve un objeto con estructura: { success: false, message: "..." }
        if (error.response.data.message) {
          errorMessage = error.response.data.message
        }
        // Fallback para otros formatos
        else if (error.response.data.error) {
          errorMessage = error.response.data.error
        }
        // Si el backend devuelve solo texto
        else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        }
      }
      
      toast.error(errorMessage)
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
      toast.error('Error al cambiar estado del usuario')
    }
  }



  // Funciones de utilidad
  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U'
  }

  const getAvatarColor = (name) => {
    const colors = ['#0f172a', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#65a30d', '#059669', '#0891b2', '#0284c7']
    const index = name?.length ? name.charCodeAt(0) % colors.length : 0
    return colors[index]
  }

  const getRoleColor = (role) => {
    const colors = {
      'super_admin': 'error',
      'admin_contaduria': 'warning',
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

  // Función de inicialización
  const initializeUsers = async () => {
    await loadUsers()
    await loadSuppliers()
  }

  // Funciones para manejo de permisos
  const openPermissionsDialog = (user) => {
    selectedUserForPermissions.value = user
    permissionsDialog.value = true
  }

  const closePermissionsDialog = () => {
    permissionsDialog.value = false
    selectedUserForPermissions.value = null
  }

  const onPermissionsSaved = (permissions) => {
    toast.success('Permisos guardados exitosamente')
    // Actualizar usuario en la lista
    const userIndex = users.value.findIndex(u => u.id === selectedUserForPermissions.value.id)
    if (userIndex !== -1) {
      users.value[userIndex].permissions = permissions
    }
    closePermissionsDialog()
  }

  const onPermissionsChanged = (permissions) => {
    // Actualización en tiempo real si es necesario
    console.log('Permisos actualizados:', permissions)
  }

  const showMessage = (message) => {
    if (message.type === 'success') {
      toast.success(message.message)
    } else if (message.type === 'error') {
      toast.error(message.message)
    }
  }

  const resetFilters = () => {
    searchQuery.value = ''
    roleFilter.value = null
    activeFilter.value = null
    loadUsers()
  }

  return {
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
    permissionsDialog,
    selectedUserForPermissions,
    showPassword,
    
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
    onPermissionsSaved,
    onPermissionsChanged,
    showMessage,
    resetFilters
  }
}
