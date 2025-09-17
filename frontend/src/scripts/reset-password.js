import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from '../utils/axios'
import { useToast } from 'vue-toastification'

export function useResetPassword() {
    const router = useRouter()
    const route = useRoute()
    const toast = useToast()

    // Estado reactivo
    const token = ref('')
    const password = ref('')
    const confirmPassword = ref('')
    const showPassword = ref(false)
    const showConfirmPassword = ref(false)
    const loading = ref(false)
    const validatingToken = ref(true)
    const passwordReset = ref(false)
    const error = ref('')
    const tokenError = ref('')
    const errors = ref({})
    const userInfo = ref(null)

    // Computed properties para validación de contraseña
    const hasMinLength = computed(() => password.value.length >= 8)
    const hasUppercase = computed(() => /[A-Z]/.test(password.value))
    const hasLowercase = computed(() => /[a-z]/.test(password.value))
    const hasNumber = computed(() => /\d/.test(password.value))
    const hasSymbol = computed(() => /[@$!%*?&]/.test(password.value))

    const passwordValid = computed(() => {
      return hasMinLength.value && hasUppercase.value && 
             hasLowercase.value && hasNumber.value && hasSymbol.value
    })

    const passwordsMatch = computed(() => {
      return password.value === confirmPassword.value && confirmPassword.value.length > 0
    })

    const isFormValid = computed(() => {
      return passwordValid.value && passwordsMatch.value
    })

    // Validar token al montar el componente
    const validateToken = async () => {
      token.value = route.params.token

      if (!token.value) {
        tokenError.value = 'Token de recuperación no encontrado en la URL'
        validatingToken.value = false
        return
      }

      try {
        const response = await axios.get(`/api/auth/validate-reset-token/${token.value}`)
        
        if (response.data.valid) {
          userInfo.value = response.data.user
          validatingToken.value = false
        } else {
          tokenError.value = 'El enlace de recuperación es inválido o ha expirado'
          validatingToken.value = false
        }

      } catch (err) {
        console.error('Error validating token:', err)
        
        if (err.response?.data?.code === 'INVALID_TOKEN') {
          tokenError.value = 'El enlace de recuperación es inválido o ha expirado'
        } else {
          tokenError.value = 'Error al validar el enlace de recuperación'
        }
        validatingToken.value = false
      }
    }

    // Manejar envío del formulario
    const handleSubmit = async () => {
      // Limpiar errores previos
      error.value = ''
      errors.value = {}

      // Validaciones del frontend
      if (!passwordValid.value) {
        errors.value.password = 'La contraseña no cumple con los requisitos de seguridad'
        return
      }

      if (!passwordsMatch.value) {
        errors.value.confirmPassword = 'Las contraseñas no coinciden'
        return
      }

      loading.value = true

      try {
        const response = await axios.post('/api/auth/reset-password', {
          token: token.value,
          password: password.value,
          confirmPassword: confirmPassword.value
        })

        // Mostrar pantalla de éxito
        passwordReset.value = true
        
        toast.success('Contraseña restablecida exitosamente')

      } catch (err) {
        console.error('Error resetting password:', err)

        if (err.response?.data?.code === 'INVALID_TOKEN') {
          tokenError.value = 'El enlace de recuperación es inválido o ha expirado'
        } else if (err.response?.data?.code === 'PASSWORD_MISMATCH') {
          errors.value.confirmPassword = 'Las contraseñas no coinciden'
        } else if (err.response?.data?.code === 'WEAK_PASSWORD') {
          errors.value.password = err.response.data.error
        } else if (err.response?.data?.code === 'SAME_PASSWORD') {
          errors.value.password = err.response.data.error
        } else if (err.response?.data?.errors) {
          // Errores de validación del backend
          err.response.data.errors.forEach(validationError => {
            errors.value[validationError.path] = validationError.msg
          })
        } else {
          error.value = err.response?.data?.error || 'Error al restablecer la contraseña'
        }
      } finally {
        loading.value = false
      }
    }

    // Navegación
    const goToLogin = () => {
      router.push('/login')
    }

    const goToForgotPassword = () => {
      router.push('/forgot-password')
    }

    // Auto-focus en el campo password al cargar
    onMounted(async () => {
      await validateToken()
      
      if (!tokenError.value) {
        setTimeout(() => {
          const passwordInput = document.getElementById('password')
          if (passwordInput) {
            passwordInput.focus()
          }
        }, 100)
      }
    })

    // Reglas de validación para los campos
    const rules = {
      required: v => !!v || 'Este campo es obligatorio',
      password: v => passwordValid.value || 'La contraseña no cumple con los requisitos',
      confirmPassword: v => passwordsMatch.value || 'Las contraseñas no coinciden'
    }

    return {
      // Estado
      password,
      confirmPassword,
      showPassword,
      showConfirmPassword,
      loading,
      validatingToken,
      passwordReset,
      error,
      tokenError,
      errors,
      userInfo,

      // Computed
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSymbol,
      passwordValid,
      passwordsMatch,
      isFormValid,

      // Métodos
      handleSubmit,
      goToLogin,
      goToForgotPassword,
      rules
    }
}