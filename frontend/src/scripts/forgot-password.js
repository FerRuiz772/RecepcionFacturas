import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '../utils/axios'
import { useToast } from 'vue-toastification'
import empresaLogo from '@/assets/empresa_logo.png'
import payquetzalLogo from '@/assets/logo-payquetzal.png'

export function useForgotPassword() {
  const router = useRouter()
  const toast = useToast()

  // Estado reactivo
  const email = ref('')
  const loading = ref(false)
  const emailSent = ref(false)
  const error = ref('')
  const errors = ref({})
  const resendCooldown = ref(0)

  let resendTimer = null

    // Validación de email
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    }

    // Manejar envío del formulario
    const handleSubmit = async () => {
      // Limpiar errores previos
      error.value = ''
      errors.value = {}

      // Validaciones del frontend
      if (!email.value.trim()) {
        errors.value.email = 'El correo electrónico es requerido'
        return
      }

      if (!validateEmail(email.value)) {
        errors.value.email = 'Ingresa un correo electrónico válido'
        return
      }

      loading.value = true

      try {
        const response = await axios.post('/api/auth/forgot-password', {
          email: email.value.toLowerCase().trim()
        })

        // Mostrar pantalla de éxito
        emailSent.value = true
        startResendCooldown()

        toast.success('Correo de recuperación enviado exitosamente')

      } catch (err) {
        console.error('Error al solicitar recuperación:', err)

        if (err.response?.data?.code === 'RATE_LIMITED') {
          error.value = err.response.data.error
        } else if (err.response?.data?.errors) {
          // Errores de validación del backend
          err.response.data.errors.forEach(validationError => {
            errors.value[validationError.path] = validationError.msg
          })
        } else {
          error.value = err.response?.data?.error || 'Error al enviar correo de recuperación'
        }
      } finally {
        loading.value = false
      }
    }

    // Reenviar correo
    const resendEmail = async () => {
      if (resendCooldown.value > 0) return

      await handleSubmit()
    }

    // Cooldown para reenvío
    const startResendCooldown = () => {
      resendCooldown.value = 60 // 60 segundos
      
      resendTimer = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
          clearInterval(resendTimer)
        }
      }, 1000)
    }

    // Navegación
    const goToLogin = () => {
      router.push('/login')
    }

    // Cleanup
    onUnmounted(() => {
      if (resendTimer) {
        clearInterval(resendTimer)
      }
    })

    // Auto-focus en el campo email al montar
    onMounted(() => {
      const emailInput = document.getElementById('email')
      if (emailInput) {
        emailInput.focus()
      }
    })

    return {
      // Estado
      email,
      loading,
      emailSent,
      error,
      errors,
      resendCooldown,

      // Métodos
      handleSubmit,
      resendEmail,
      goToLogin
    }
}
