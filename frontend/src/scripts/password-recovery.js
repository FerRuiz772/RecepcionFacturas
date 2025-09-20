import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import axios from 'axios'

export function usePasswordRecovery() {
  const router = useRouter()
  const toast = useToast()
  
  const valid = ref(false)
  const email = ref('')
  const loading = ref(false)
  const emailSent = ref(false)
  const resendCooldown = ref(0)
  
  let cooldownInterval = null
  
  const emailRules = [
    v => !!v || 'El correo electrónico es requerido',
    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Ingrese un correo electrónico válido (debe contener @)'
  ]
  
  const startCooldown = () => {
    resendCooldown.value = 60 // 60 segundos de cooldown
    cooldownInterval = setInterval(() => {
      resendCooldown.value--
      if (resendCooldown.value <= 0) {
        clearInterval(cooldownInterval)
        cooldownInterval = null
      }
    }, 1000)
  }
  
  const sendResetEmail = async () => {
    if (!valid.value) return
    
    loading.value = true
    try {
      console.log('📧 Enviando solicitud de recuperación para:', email.value)
      
      // Llamada al endpoint de recuperación de contraseña
      const response = await axios.post('/api/auth/forgot-password', {
        email: email.value
      })
      
      if (response.data.success) {
        emailSent.value = true
        startCooldown()
        toast.success('Enlace de recuperación enviado correctamente')
        console.log('✅ Enlace de recuperación enviado a:', email.value)
      } else {
        toast.error(response.data.message || 'Error al enviar el enlace de recuperación')
      }
      
    } catch (error) {
      console.error('❌ Error al enviar email de recuperación:', error)
      
      if (error.response?.status === 404) {
        toast.error('No se encontró una cuenta con ese correo electrónico')
      } else if (error.response?.status === 429) {
        toast.error('Demasiados intentos. Intente nuevamente en unos minutos')
      } else {
        toast.error('Error al enviar el enlace de recuperación. Intente nuevamente')
      }
    } finally {
      loading.value = false
    }
  }
  
  const resendEmail = async () => {
    if (resendCooldown.value > 0) return
    
    await sendResetEmail()
  }
  
  const goToLogin = () => {
    router.push('/login')
  }
  
  // Limpiar intervalo al desmontar el componente
  onUnmounted(() => {
    if (cooldownInterval) {
      clearInterval(cooldownInterval)
    }
  })

  return {
    // Reactive state
    valid,
    email,
    loading,
    emailSent,
    resendCooldown,
    
    // Rules
    emailRules,
    
    // Functions
    sendResetEmail,
    resendEmail,
    goToLogin
  }
}
