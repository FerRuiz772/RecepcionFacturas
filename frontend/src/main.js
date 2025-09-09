// En frontend/src/main.js - AGREGAR inicialización de autenticación

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

// Vuetify
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

// Toast notifications
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light'
  }
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 5,
  newestOnTop: true
})

// NUEVO: Inicializar autenticación antes de montar la app
const initApp = async () => {
  const authStore = useAuthStore()
  
  // Intentar cargar usuario desde token guardado
  await authStore.initializeAuth()
  
  // Montar la aplicación
  app.mount('#app')
}

// Inicializar la app
initApp()