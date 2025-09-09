import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const toast = useToast()

// Configuración base de axios
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

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

// Response interceptor
axios.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url)
    return response
  },
  async (error) => {
    console.error('❌ Response Error:', error.response?.status, error.config?.url)
    
    const authStore = useAuthStore()
    
    if (error.response?.status === 401 && authStore.token) {
      console.log('🔄 Token expirado, intentando refresh...')
      // Token expirado, intentar refresh
      const refreshed = await authStore.refreshAccessToken()
      if (refreshed) {
        console.log('✅ Token refreshed, reintentando petición...')
        // Reintentar la petición original
        return axios.request(error.config)
      } else {
        console.log('❌ No se pudo refrescar token, redirecting to login')
        // Redirect to login
        window.location.href = '/login'
      }
    }
    
    // Mostrar error toast
    if (error.response?.data?.error) {
      toast.error(error.response.data.error)
    } else if (error.message === 'Network Error') {
      toast.error('Error de conexión. Verifica que el servidor esté ejecutándose.')
    } else {
      toast.error('Error inesperado')
    }
    
    return Promise.reject(error)
  }
)

export default axios