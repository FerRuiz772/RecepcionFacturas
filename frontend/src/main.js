/**
 * @fileoverview Punto de entrada principal de la aplicación Vue.js
 * Configura Vuetify, Pinia, Vue Router, notificaciones toast y directivas globales
 * Inicializa el sistema de autenticación y monta la aplicación
 */

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

/**
 * Configuración de Vuetify con tema personalizado PayQuetzal
 * Define la paleta de colores principal de la aplicación
 */
const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#0f172a',        // Azul oscuro principal
          'primary-darken-1': '#1e293b', // Variante más oscura
          secondary: '#64748b',       // Gris secundario
          'secondary-darken-1': '#475569', // Gris más oscuro
          success: '#10b981',        // Verde para éxito
          warning: '#f59e0b',        // Amarillo para advertencias
          error: '#ef4444',          // Rojo para errores
          info: '#3b82f6',           // Azul para información
        },
      },
    },
  },
})

/**
 * Instancia de Pinia para gestión de estado global
 */
const pinia = createPinia()

/**
 * Instancia principal de la aplicación Vue
 */
const app = createApp(App)

/**
 * Configuración y registro de plugins Vue
 */
app.use(pinia)
app.use(router)
app.use(vuetify)

/**
 * Configuración de notificaciones toast con opciones personalizadas
 * Posición superior derecha, timeout de 5 segundos, características interactivas
 */
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

/**
 * Directiva global para bloquear y normalizar acentos en inputs
 * Previene la entrada de caracteres acentuados y los normaliza automáticamente
 * Útil para campos como códigos de productos, usernames, etc.
 * 
 * @directive v-no-accents
 * @usage <input v-no-accents v-model="productCode" />
 */
app.directive('no-accents', {
  /**
   * Configuración inicial cuando el elemento es montado
   * @param {HTMLElement} el - Elemento DOM al que se aplica la directiva
   */
  mounted(el) {
    /**
     * Bloquea la entrada de caracteres acentuados en tiempo real
     * @param {KeyboardEvent} event - Evento de teclado
     */
    const blockAccents = (event) => {
      // Caracteres con acentos que queremos bloquear
      const accentedChars = /[áéíóúàèìòùâêîôûäëïöüãñçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÄËÏÖÜÃÑÇ]/
      
      if (accentedChars.test(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        return false
      }
    }
    
    /**
     * Normaliza texto pegado o escrito, removiendo acentos automáticamente
     * @param {Event} event - Evento de input
     */
    const normalizeText = (event) => {
      const target = event.target
      if (target.value) {
        // Convertir caracteres acentuados a sus equivalentes sin acento
        const normalizedValue = target.value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
          .replace(/ñ/g, 'n')
          .replace(/Ñ/g, 'N')
          .replace(/ç/g, 'c')
          .replace(/Ç/g, 'C')
        
        if (target.value !== normalizedValue) {
          target.value = normalizedValue
          // Disparar evento input para actualizar v-model
          target.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }
    }
    
    /**
     * Aplica los event listeners a un elemento input/textarea
     * @param {HTMLElement} element - Elemento al que aplicar los listeners
     */
    const applyListeners = (element) => {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.addEventListener('keydown', blockAccents)
        element.addEventListener('input', normalizeText)
        element.addEventListener('paste', (e) => {
          setTimeout(() => normalizeText(e), 0)
        })
      }
    }
    
    // Aplicar a todos los inputs existentes
    applyListeners(el)
    const inputs = el.querySelectorAll('input, textarea')
    inputs.forEach(applyListeners)
    
    // Observar nuevos inputs que se agreguen dinámicamente
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            applyListeners(node)
            const newInputs = node.querySelectorAll('input, textarea')
            newInputs.forEach(applyListeners)
          }
        })
      })
    })
    
    observer.observe(el, { childList: true, subtree: true })
    
    // Guardar observer para cleanup
    el._accentObserver = observer
  },
  
  /**
   * Limpieza cuando el elemento es desmontado
   * @param {HTMLElement} el - Elemento que se está desmontando
   */
  unmounted(el) {
    if (el._accentObserver) {
      el._accentObserver.disconnect()
    }
  }
})

/**
 * Función principal para inicializar la aplicación
 * Configura el sistema de autenticación y monta la aplicación Vue
 * 
 * @async
 * @function initApp
 * @throws {Error} Error durante la inicialización de la aplicación
 */
async function initApp() {
  console.log('Iniciando aplicación...')
  
  // IMPORTANTE: Asegurar que el store esté disponible
  const authStore = useAuthStore()
  
  console.log('Estado inicial del store:')
  console.log('- Token:', !!authStore.token)
  console.log('- RefreshToken:', !!authStore.refreshToken)
  console.log('- User:', !!authStore.user)
  
  // Configurar axios con el token actual ANTES de inicializar
  if (authStore.token) {
    console.log('Configurando axios con token existente...')
    const axios = (await import('axios')).default
    axios.defaults.headers.common['Authorization'] = `Bearer ${authStore.token}`
  }
  
  // Inicializar autenticación
  await authStore.initializeAuth()
  
  console.log('Estado después de inicialización:')
  console.log('- Autenticado:', authStore.isAuthenticated)
  console.log('- User:', authStore.user?.email || 'No user')
  console.log('- Role:', authStore.user?.role || 'No role')
  
  // Montar la aplicación
  app.mount('#app')
  console.log('Aplicación montada exitosamente')
}

/**
 * Ejecutar inicialización de la aplicación
 * Si falla la inicialización, la aplicación se monta de todos modos para evitar pantalla en blanco
 */
initApp().catch(error => {
  console.error('Error inicializando aplicación:', error)
  app.mount('#app') // Montar de todos modos
})