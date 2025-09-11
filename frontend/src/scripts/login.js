import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const valid = ref(false)
  const email = ref('')
  const password = ref('')
  const showPassword = ref(false)
  const rememberMe = ref(false)
  const loading = ref(false)
  
  const emailRules = [
    v => !!v || 'El correo electrónico es requerido',
    v => /.+@.+\..+/.test(v) || 'Ingrese un correo electrónico válido'
  ]
  
  const passwordRules = [
    v => !!v || 'La contraseña es requerida',
    v => (v && v.length >= 6) || 'La contraseña debe tener al menos 6 caracteres'
  ]
  
  const login = async () => {
    if (!valid.value) return
    
    loading.value = true
    try {
      const result = await authStore.login({
        email: email.value,
        password: password.value
      })
      
      if (result.success) {
        // Redirigir directamente sin toast - el usuario ya sabe que fue exitoso
        router.push('/dashboard')
      } else {
        // Solo mostrar error si el login falló
        toast.error(result.message)
      }
      
    } catch (error) {
      toast.error('Error de conexión. Intente nuevamente.')
    } finally {
      loading.value = false
    }
  }
  
  const forgotPassword = () => {
    toast.info('Se ha enviado un enlace de recuperación a su correo electrónico')
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
