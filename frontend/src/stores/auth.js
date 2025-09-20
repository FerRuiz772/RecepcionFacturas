import { defineStore } from 'pinia'
import axios from 'axios'

// Funciones utilitarias para localStorage seguro
const safeGetItem = (key) => {
  try {
    return localStorage.getItem(key)
  } catch (error) {
    console.warn(`Error al leer ${key} del localStorage:`, error)
    return null
  }
}

const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Error al guardar ${key} en localStorage:`, error)
  }
}

const safeRemoveItem = (key) => {
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Error al eliminar ${key} del localStorage:`, error)
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: safeGetItem('token'),
    refreshToken: safeGetItem('refreshToken'),
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.role,
    userName: (state) => state.user?.name,
    userEmail: (state) => state.user?.email,
    userPermissions: (state) => state.user?.permissions || [],
    isProveedor: (state) => state.user?.role === 'proveedor',
    isAdmin: (state) => ['super_admin', 'admin_contaduria'].includes(state.user?.role),
    isContaduria: (state) => ['admin_contaduria', 'trabajador_contaduria'].includes(state.user?.role),
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    
    // Verificador de permisos granulares
    hasPermission: (state) => (permission) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      
      const permissions = state.user.permissions || []
      return permissions.includes(permission)
    },

    // Verificador de múltiples permisos (AND lógico)
    hasAllPermissions: (state) => (permissionArray) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      
      const userPermissions = state.user.permissions || []
      return permissionArray.every(permission => userPermissions.includes(permission))
    },

    // Verificador de al menos uno de múltiples permisos (OR lógico)
    hasAnyPermission: (state) => (permissionArray) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      
      const userPermissions = state.user.permissions || []
      return permissionArray.some(permission => userPermissions.includes(permission))
    },

    // Getters específicos para módulos comunes
    canViewDashboard: (state) => {
      if (!state.user) return false
      // Todos los usuarios autenticados pueden ver dashboard
      return true
    },

    // Permisos de usuarios
    canViewUsers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('users.view')
    },
    canCreateUsers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('users.create')
    },
    canEditUsers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('users.edit')
    },
    canDeleteUsers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('users.delete')
    },

    // Permisos de facturas
    canViewInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('invoices.view')
    },
    canCreateInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('invoices.create')
    },
    canEditInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('invoices.edit')
    },
    canDeleteInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('invoices.delete')
    },

    // Permisos de documentos
    canViewDocuments: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('documents.view')
    },
    canUploadDocuments: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('documents.upload')
    },
    canDownloadDocuments: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('documents.download')
    },

    // Permisos de proveedores
    canViewSuppliers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('suppliers.view')
    },
    canCreateSuppliers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('suppliers.create')
    },
    canEditSuppliers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('suppliers.edit')
    },
    canDeleteSuppliers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('suppliers.delete')
    },

    // Permisos para documentos contables
    canViewAccountingDocuments: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || []
      return permissions.includes('accounting_documents.view')
    }
  },

  actions: {
    async login(credentials) {
      try {
        this.loading = true
        console.log('Iniciando login para:', credentials.email)
        
        const response = await axios.post('/api/auth/login', credentials)
        const { token, refreshToken, user } = response.data

        console.log('Login response recibido:', {
          hasToken: !!token,
          hasRefreshToken: !!refreshToken,
          userEmail: user?.email,
          userRole: user?.role
        })

        this.token = token
        this.refreshToken = refreshToken
        this.user = user

        safeSetItem('token', token)
        safeSetItem('refreshToken', refreshToken)

        // Cargar permisos del usuario después del login
        await this.loadUserPermissions()

        console.log('💾 Datos guardados en localStorage')
        return { success: true }
      } catch (error) {
        console.error('Error en login:', error)
        return {
          success: false,
          message: error.response?.data?.error || 'Error de conexión'
        }
      } finally {
        this.loading = false
      }
    },

    async logout() {
      try {
        console.log('🚪 Iniciando logout...')
        
        // Intentar hacer logout en el servidor solo si tenemos token
        if (this.token) {
          console.log('📡 Enviando logout al servidor...')
          // Llamada directa sin interceptor para evitar ciclos
          await axios({
            method: 'post',
            url: '/api/auth/logout',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Content-Type': 'application/json'
            }
          })
          console.log('Logout del servidor exitoso')
        }
      } catch (error) {
        console.error('Error en logout del servidor (continuando con limpieza local):', error.message)
        // Continuamos con la limpieza local incluso si falla el servidor
      } finally {
        // Limpiar estado local siempre
        console.log('🧹 Limpiando estado local...')
        this.user = null
        this.token = null
        this.refreshToken = null
        safeRemoveItem('token')
        safeRemoveItem('refreshToken')
        delete axios.defaults.headers.common['Authorization']
        console.log('🚪 Logout completo')
      }
    },

    async loadUserFromToken() {
      if (!this.token) {
        console.log('No hay token para cargar usuario')
        return false
      }
      
      if (this.user) {
        console.log('Usuario ya está cargado')
        return true
      }

      try {
        this.loading = true
        console.log('📡 Cargando usuario desde token...')
        console.log('🔑 Token actual:', this.token.substring(0, 20) + '...')
        
        // Cargar información básica del usuario
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        
        // Cargar permisos del usuario
        await this.loadUserPermissions()
        
        console.log('Usuario cargado exitosamente:', {
          email: this.user.email,
          role: this.user.role,
          id: this.user.id,
          permissions: this.user.permissions?.length || 0
        })
        return true
      } catch (error) {
        console.error('Error loading user from token:', {
          status: error.response?.status,
          message: error.message,
          code: error.response?.data?.code
        })
        
        // Si el token es inválido, limpiar todo
        if (error.response?.status === 401) {
          console.log('🚨 Token inválido (401), limpiando sesión...')
          await this.logout()
        }
        return false
      } finally {
        this.loading = false
      }
    },

    async loadUserPermissions() {
      try {
        if (!this.user?.id) {
          console.log('No hay usuario para cargar permisos')
          return
        }

        console.log('📡 Cargando permisos del usuario...')
        const response = await axios.get(`/api/users/${this.user.id}/permissions`)
        
        // El endpoint devuelve { user_id, name, role, permissions: ['permiso1', 'permiso2'] }
        this.user.permissions = response.data.data.permissions || []
        
        console.log('Permisos cargados exitosamente:', {
          userId: this.user.id,
          permissionsCount: this.user.permissions.length,
          permissions: this.user.permissions
        })
      } catch (error) {
        console.error('Error cargando permisos del usuario:', error)
        // Si no se pueden cargar permisos, asignar array vacío
        this.user.permissions = []
      }
    },

    async refreshAccessToken() {
      try {
        if (!this.refreshToken) {
          console.log('No hay refresh token disponible')
          throw new Error('No refresh token available')
        }

        console.log('🔄 Iniciando refresh token...')
        console.log('🔑 Refresh token:', this.refreshToken.substring(0, 20) + '...')

        // Llamada directa sin interceptor para evitar ciclos infinitos
        const response = await axios({
          method: 'post',
          url: '/api/auth/refresh',
          data: { refreshToken: this.refreshToken },
          headers: {
            'Content-Type': 'application/json'
          }
        })

        console.log('Refresh response recibido:', {
          hasNewToken: !!response.data.token,
          expiresIn: response.data.expiresIn
        })

        this.token = response.data.token
        localStorage.setItem('token', this.token)
        
        console.log('💾 Nuevo token guardado')
        console.log('Refresh token exitoso')
        return true
      } catch (error) {
        console.error('Error en refresh token:', {
          status: error.response?.status,
          message: error.message,
          code: error.response?.data?.code
        })
        
        // Si el refresh falla, limpiar todo
        console.log('🧹 Refresh falló, limpiando sesión...')
        await this.logout()
        return false
      }
    },

    // Refrescar datos del usuario (útil después de actualizar permisos)
    async refreshUser() {
      try {
        console.log('🔄 Refrescando datos del usuario...')
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        console.log('✅ Usuario refrescado exitosamente')
        return true
      } catch (error) {
        console.error('Error refrescando usuario:', error)
        return false
      }
    },

    // Inicializar autenticación al cargar la app
    async initializeAuth() {
      console.log('Inicializando autenticación...')
      console.log('Estado actual:', {
        hasToken: !!this.token,
        hasRefreshToken: !!this.refreshToken,
        hasUser: !!this.user,
        tokenLength: this.token?.length || 0
      })
      
      if (this.token && !this.user) {
        console.log('📡 Token encontrado sin usuario, cargando...')
        const loaded = await this.loadUserFromToken()
        if (!loaded) {
          console.log('No se pudo cargar usuario, limpiando tokens...')
          await this.logout()
        }
      } else if (this.token && this.user) {
        console.log('Usuario ya autenticado:', this.user.email)
      } else {
        console.log('No hay autenticación previa')
      }
      
      console.log('Inicialización completada. Estado final:', {
        isAuthenticated: this.isAuthenticated,
        userEmail: this.user?.email || 'No user',
        userRole: this.user?.role || 'No role'
      })
    },

    // Cambiar contraseña
    async changePassword(passwords) {
      try {
        const response = await axios.put('/api/auth/change-password', passwords)
        return { 
          success: true, 
          message: response.data.message 
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.error || 'Error al cambiar contraseña'
        }
      }
    },

    // Solicitar reset de contraseña
    async forgotPassword(email) {
      try {
        const response = await axios.post('/api/auth/forgot-password', { email })
        return { 
          success: true, 
          message: response.data.message 
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.error || 'Error al solicitar reset'
        }
      }
    },

    // Reset de contraseña
    async resetPassword(data) {
      try {
        const response = await axios.post('/api/auth/reset-password', data)
        return { 
          success: true, 
          message: response.data.message 
        }
      } catch (error) {
        return {
          success: false,
          message: error.response?.data?.error || 'Error al resetear contraseña'
        }
      }
    }
  }
})