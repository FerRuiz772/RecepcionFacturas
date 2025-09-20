import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: localStorage.getItem('token'),
    refreshToken: localStorage.getItem('refreshToken'),
    loading: false
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userRole: (state) => state.user?.role,
    userName: (state) => state.user?.name,
    userEmail: (state) => state.user?.email,
    userPermissions: (state) => state.user?.permissions || {},
    isProveedor: (state) => state.user?.role === 'proveedor',
    isAdmin: (state) => ['super_admin', 'admin_contaduria'].includes(state.user?.role),
    isContaduria: (state) => ['admin_contaduria', 'trabajador_contaduria'].includes(state.user?.role),
    isSuperAdmin: (state) => state.user?.role === 'super_admin',
    
    // Verificador de permisos
    hasPermission: (state) => (module, action) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      
      const permissions = state.user.permissions || {}
      const modulePermissions = permissions[module]
      
      if (!modulePermissions) return false
      
      // Mapear acciones del frontend a las del backend
      const actionMapping = {
        'ver': ['ver_todas', 'ver_propias', 'ver'],
        'crear': ['crear'],
        'editar': ['editar'],
        'eliminar': ['eliminar'],
        'gestionar': ['gestionar'],
        'aprobar': ['aprobar'],
        'ver_todas': ['ver_todas'],
        'ver_propias': ['ver_propias']
      }
      
      const possibleActions = actionMapping[action] || [action]
      
      return possibleActions.some(possibleAction => 
        modulePermissions[possibleAction] === true
      )
    },

    // Getters específicos para módulos comunes
    canViewDashboard: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      // Todos los usuarios autenticados pueden ver dashboard
      return true
    },
    canManageUsers: (state) => state.user?.role === 'super_admin' || state.user?.role === 'admin_contaduria',
    canCreateInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.facturas?.crear === true
    },
    canEditInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.facturas?.editar === true
    },
    canDeleteInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.facturas?.eliminar === true
    },
    canApproveInvoices: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.facturas?.aprobar === true
    },
    canManageSuppliers: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.proveedores?.crear === true
    },
    canUploadDocuments: (state) => {
      if (!state.user) return false
      if (state.user.role === 'super_admin') return true
      const permissions = state.user.permissions || {}
      return permissions.documentos?.subir === true
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

        localStorage.setItem('token', token)
        localStorage.setItem('refreshToken', refreshToken)

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
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
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
        
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        
        console.log('Usuario cargado exitosamente:', {
          email: this.user.email,
          role: this.user.role,
          id: this.user.id
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