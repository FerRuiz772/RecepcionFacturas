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
        const response = await axios.post('/api/auth/login', credentials)
        const { token, refreshToken, user } = response.data

        this.token = token
        this.refreshToken = refreshToken
        this.user = user

        localStorage.setItem('token', token)
        localStorage.setItem('refreshToken', refreshToken)

        // Configurar axios interceptor
        this.setupAxiosInterceptor()

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
        // Intentar hacer logout en el servidor
        if (this.token) {
          await axios.post('/api/auth/logout')
        }
      } catch (error) {
        console.error('Error en logout:', error)
      } finally {
        // Limpiar estado local siempre
        this.user = null
        this.token = null
        this.refreshToken = null
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        delete axios.defaults.headers.common['Authorization']
      }
    },

    // NUEVA: Función para cargar usuario desde token (soluciona el reload)
    async loadUserFromToken() {
      if (!this.token || this.user) {
        return false
      }

      try {
        this.loading = true
        const response = await axios.get('/api/auth/me')
        this.user = response.data.user
        this.setupAxiosInterceptor()
        return true
      } catch (error) {
        console.error('Error loading user from token:', error)
        // Si el token es inválido, limpiar todo
        if (error.response?.status === 401) {
          this.logout()
        }
        return false
      } finally {
        this.loading = false
      }
    },

    async refreshAccessToken() {
      try {
        if (!this.refreshToken) {
          throw new Error('No refresh token available')
        }

        const response = await axios.post('/api/auth/refresh', {
          refreshToken: this.refreshToken
        })

        this.token = response.data.token
        localStorage.setItem('token', this.token)
        this.setupAxiosInterceptor()
        return true
      } catch (error) {
        console.error('Error refreshing token:', error)
        this.logout()
        return false
      }
    },

    // Configurar interceptor de axios para manejo automático de tokens
    setupAxiosInterceptor() {
      if (this.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
      }

      // Interceptor para refresh automático
      axios.interceptors.response.use(
        (response) => response,
        async (error) => {
          const originalRequest = error.config

          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true

            // Intentar refresh token
            const refreshed = await this.refreshAccessToken()
            if (refreshed) {
              // Reintentar la petición original
              originalRequest.headers['Authorization'] = `Bearer ${this.token}`
              return axios(originalRequest)
            }
          }

          return Promise.reject(error)
        }
      )
    },

    // NUEVA: Inicializar autenticación al cargar la app
    async initializeAuth() {
      if (this.token && !this.user) {
        await this.loadUserFromToken()
      } else if (this.token) {
        this.setupAxiosInterceptor()
      }
    },

    // NUEVA: Cambiar contraseña
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

    // NUEVA: Solicitar reset de contraseña
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

    // NUEVA: Reset de contraseña
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