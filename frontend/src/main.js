import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Toast notifications
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

// Estilos globales
import './assets/button-styles.css'

// IMPORTANTE: Importar configuración de axios ANTES del store
import './utils/axios.js'

// Store
import { useAuthStore } from './stores/auth'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#0f172a',
          'primary-darken-1': '#1e293b',
          secondary: '#64748b',
          'secondary-darken-1': '#475569',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      },
    },
  },
})

const pinia = createPinia()

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(Toast, {
  position: 'top-right',
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: 'button',
  icon: true,
  rtl: false
})

// Función para inicializar la aplicación
async function initApp() {
  console.log('🚀 Iniciando aplicación...')
  
  // IMPORTANTE: Asegurar que el store esté disponible
  const authStore = useAuthStore()
  
  console.log('🔍 Estado inicial del store:')
  console.log('- Token:', !!authStore.token)
  console.log('- RefreshToken:', !!authStore.refreshToken)
  console.log('- User:', !!authStore.user)
  
  // Configurar axios con el token actual ANTES de inicializar
  if (authStore.token) {
    console.log('🔧 Configurando axios con token existente...')
    const axios = (await import('axios')).default
    axios.defaults.headers.common['Authorization'] = `Bearer ${authStore.token}`
  }
  
  // Inicializar autenticación
  await authStore.initializeAuth()
  
  console.log('🔍 Estado después de inicialización:')
  console.log('- Autenticado:', authStore.isAuthenticated)
  console.log('- User:', authStore.user?.email || 'No user')
  console.log('- Role:', authStore.user?.role || 'No role')
  
  // Montar la aplicación
  app.mount('#app')
  console.log('✅ Aplicación montada exitosamente')
}

// Ejecutar inicialización
initApp().catch(error => {
  console.error('❌ Error inicializando aplicación:', error)
  app.mount('#app') // Montar de todos modos
})