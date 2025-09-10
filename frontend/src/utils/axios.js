import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const toast = useToast()

// Configuración base de axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// Variable para evitar múltiples refreshes simultáneos
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  console.log(`🔄 Procesando cola de ${failedQueue.length} peticiones...`)
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  
  failedQueue = []
}

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    console.log('🚀 Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor con debugging extendido
axios.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url)
    // ✅ REMOVIDO: No mostrar toasts automáticos para respuestas exitosas
    return response
  },
  async (error) => {
    const authStore = useAuthStore()
    const originalRequest = error.config

    console.error('❌ Response Error:', {
      status: error.response?.status,
      url: error.config?.url,
      hasToken: !!authStore.token,
      hasRefreshToken: !!authStore.refreshToken,
      isRetry: !!originalRequest._retry,
      isRefreshing: isRefreshing
    })

    // Si es 401 y tenemos token, intentar refresh
    if (error.response?.status === 401 && authStore.token && !originalRequest._retry) {
      console.log('🚨 Detectado 401 con token - iniciando proceso de refresh')
      
      // Marcar que ya se intentó con esta petición
      originalRequest._retry = true

      // Si es la ruta de logout, no intentar refresh
      if (originalRequest.url?.includes('/auth/logout')) {
        console.log('🚪 Error en logout, limpiando sesión...')
        await authStore.logout()
        return Promise.reject(error)
      }

      // Si es la ruta de refresh, ir directo a logout
      if (originalRequest.url?.includes('/auth/refresh')) {
        console.log('🔄 Refresh token inválido, limpiando sesión...')
        await authStore.logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      // Si ya estamos refreshing, agregar a la cola
      if (isRefreshing) {
        console.log('⏳ Ya hay refresh en proceso, agregando a cola...')
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          console.log('✅ Petición de cola procesada con nuevo token')
          originalRequest.headers.Authorization = `Bearer ${token}`
          return axios(originalRequest)
        }).catch(err => {
          console.log('❌ Petición de cola falló:', err.message)
          return Promise.reject(err)
        })
      }

      console.log('🔄 Iniciando proceso de refresh token...')
      isRefreshing = true

      try {
        // Verificar que tenemos refresh token antes de intentar
        if (!authStore.refreshToken) {
          console.log('❌ No hay refresh token disponible')
          throw new Error('No refresh token available')
        }

        console.log('📡 Llamando a refreshAccessToken...')
        const refreshed = await authStore.refreshAccessToken()
        
        if (refreshed) {
          console.log('✅ Token refresh exitoso, procesando cola...')
          processQueue(null, authStore.token)
          
          // Reintentar petición original
          originalRequest.headers.Authorization = `Bearer ${authStore.token}`
          console.log('🔄 Reintentando petición original...')
          return axios(originalRequest)
        } else {
          throw new Error('Refresh returned false')
        }
      } catch (refreshError) {
        console.log('❌ Refresh falló:', refreshError.message)
        processQueue(refreshError, null)
        await authStore.logout()
        
        // Solo redirigir si no estamos ya en login
        if (!window.location.pathname.includes('/login')) {
          console.log('🔀 Redirigiendo a login...')
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      } finally {
        console.log('🏁 Finalizando proceso de refresh')
        isRefreshing = false
      }
    }

    // ✅ MEJORADO: Solo mostrar toasts para errores críticos y no del tipo 401
    if (error.response?.status !== 401) {
      // Solo mostrar errores de red o del servidor, no errores de validación
      if (error.message === 'Network Error') {
        toast.error('Error de conexión. Verifica que el servidor esté ejecutándose.')
      } else if (error.response?.status >= 500) {
        toast.error('Error del servidor. Intente nuevamente.')
      }
      // ✅ REMOVIDO: No mostrar automáticamente error.response.data.error
      // Esto permite que cada componente maneje sus propios mensajes de error
    }

    return Promise.reject(error)
  }
)

console.log('🔧 Interceptors de axios configurados')

export default axios