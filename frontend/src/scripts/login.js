import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import empresaLogo from '@/assets/empresa_logo.png'
import payquetzalLogo from '@/assets/logo-payquetzal.png'

/**
 * Composable para manejo de funcionalidad de login
 * Proporciona estado reactivo, validaciones y lógica de autenticación
 * Usado por LoginView.vue para separar lógica de presentación
 * @returns {Object} Estado reactivo y funciones para el formulario de login
 */
export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  // Estado reactivo del formulario
  const valid = ref(false)              // Validez general del formulario
  const email = ref('')                 // Email del usuario
  const password = ref('')              // Contraseña del usuario
  const showPassword = ref(false)       // Mostrar/ocultar contraseña
  const rememberMe = ref(false)         // Recordar sesión (futuro uso)
  const loading = ref(false)            // Estado de carga durante login
  
  // Reglas de validación para el email
  const emailRules = [
    v => !!v || 'El correo electrónico es requerido',
    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Ingrese un correo electrónico válido (debe contener @)'
  ]
  
  // Reglas de validación para la contraseña
  const passwordRules = [
    v => !!v || 'La contraseña es requerida',
    v => (v && v.length >= 6) || 'La contraseña debe tener al menos 6 caracteres'
  ]
  
  /**
   * Ejecuta el proceso de login
   * Valida el formulario, llama al store de auth y maneja redirección
   */
  const login = async () => {
    if (!valid.value) return
    
    loading.value = true
    try {
      const result = await authStore.login({
        email: email.value,
        password: password.value
      })
      
      if (result.success) {
        // Redirigir al dashboard sin mostrar toast de éxito
        router.push('/dashboard')
      } else {
        // Mostrar mensaje de error específico
        toast.error(result.message)
      }
      
    } catch (error) {
      // Error de conexión o inesperado
      toast.error('Error de conexión. Intente nuevamente.')
    } finally {
      loading.value = false
    }
  }
  
  const forgotPassword = () => {
    router.push('/forgot-password')
  }

  return {
    // Reactive state
    valid,
    email,
    password,
    showPassword,
    rememberMe,
    loading,
    
    // Rules
    emailRules,
    passwordRules,
    
    // Functions
    login,
    forgotPassword
  }
}
