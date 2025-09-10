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
    isProveedor: (state) => state.user?.role === 'proveedor',
    isAdmin: (state) => ['super_admin', 'admin_contaduria'].includes(state.user?.role),
    isContaduria: (state) => ['admin_contaduria', 'trabajador_contaduria'].includes(state.user?.role),
    isSuperAdmin: (state) => state.user?.role === 'super_admin'
  },

  actions: {
    async login(credentials) {
      try {
        this.loading = true
        console.log('🔐 Iniciando login para:', credentials.email)
        
        const response = await axios.post('/api/auth/login', credentials)
        const { token, refreshToken, user } = response.data

        console.log('✅ Login response recibido:', {
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
        console.error('❌ Error en login:', error)
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
          console.log('✅ Logout del servidor exitoso')
        }
      } catch (error) {
        console.error('⚠️ Error en logout del servidor (continuando con limpieza local):', error.message)
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
        console.log('❌ No hay token para cargar usuario')
        return false
      }
      
      if (this.user) {
        console.log('ℹ️ Usuario ya está cargado')
        return true
      }

      try {
        this.loading = true
        console.log('📡 Cargando usuario desde token...')
        console.log('🔑 Token actual:', this.token.substring(0, 20) + '...')
        
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        
        console.log('✅ Usuario cargado exitosamente:', {
          email: this.user.email,
          role: this.user.role,
          id: this.user.id
        })
        return true
      } catch (error) {
        console.error('❌ Error loading user from token:', {
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
          console.log('❌ No hay refresh token disponible')
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

        console.log('✅ Refresh response recibido:', {
          hasNewToken: !!response.data.token,
          expiresIn: response.data.expiresIn
        })

        this.token = response.data.token
        localStorage.setItem('token', this.token)
        
        console.log('💾 Nuevo token guardado')
        console.log('✅ Refresh token exitoso')
        return true
      } catch (error) {
        console.error('❌ Error en refresh token:', {
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

    // Inicializar autenticación al cargar la app
    async initializeAuth() {
      console.log('🔧 Inicializando autenticación...')
      console.log('🔍 Estado actual:', {
        hasToken: !!this.token,
        hasRefreshToken: !!this.refreshToken,
        hasUser: !!this.user,
        tokenLength: this.token?.length || 0
      })
      
      if (this.token && !this.user) {
        console.log('📡 Token encontrado sin usuario, cargando...')
        const loaded = await this.loadUserFromToken()
        if (!loaded) {
          console.log('❌ No se pudo cargar usuario, limpiando tokens...')
          await this.logout()
        }
      } else if (this.token && this.user) {
        console.log('✅ Usuario ya autenticado:', this.user.email)
      } else {
        console.log('ℹ️ No hay autenticación previa')
      }
      
      console.log('🏁 Inicialización completada. Estado final:', {
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