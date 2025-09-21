<template>
  <div class="profile-view">
    <v-container fluid class="pa-6">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4 font-weight-bold mb-2">Mi Perfil</h1>
          <p class="text-body-1 text-medium-emphasis">
            Gestiona tu información personal y configuraciones de cuenta
          </p>
        </div>
      </div>

      <v-row>
        <!-- Información Personal -->
        <v-col cols="12" lg="6">
          <v-card class="mb-6">
            <v-card-title class="d-flex align-center bg-light">
              <v-icon class="me-3">mdi-account</v-icon>
              <span>Información Personal</span>
            </v-card-title>
            <v-card-text class="pt-6">
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="profileForm.name"
                    label="Nombre Completo"
                    variant="outlined"
                    readonly
                    :loading="loadingProfile"
                  >
                    <template v-slot:prepend-inner>
                      <v-icon>mdi-account-outline</v-icon>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="profileForm.email"
                    label="Email"
                    type="email"
                    variant="outlined"
                    readonly
                    :loading="loadingProfile"
                  >
                    <template v-slot:prepend-inner>
                      <v-icon>mdi-email-outline</v-icon>
                    </template>
                  </v-text-field>
                </v-col>
                <v-col cols="12" v-if="profileForm.supplier_name">
                  <v-text-field
                    v-model="profileForm.supplier_name"
                    label="Empresa"
                    variant="outlined"
                    readonly
                    :loading="loadingProfile"
                  >
                    <template v-slot:prepend-inner>
                      <v-icon>mdi-domain</v-icon>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Cambiar Contraseña -->
        <v-col cols="12" lg="6">
          <v-card>
            <v-card-title class="d-flex align-center bg-light">
              <v-icon class="me-3">mdi-lock-reset</v-icon>
              <span>Cambiar Contraseña</span>
            </v-card-title>
            <v-card-text class="pt-6">
              <v-form ref="passwordFormRef" v-model="passwordFormValid">
                <v-row>
                  <v-col cols="12">
                    <v-alert 
                      type="info" 
                      variant="tonal" 
                      class="mb-6"
                      icon="mdi-information-outline"
                    >
                      Ingresa tu nueva contraseña. El cambio será efectivo inmediatamente.
                    </v-alert>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="passwordForm.newPassword"
                      label="Nueva Contraseña"
                      :type="showNewPassword ? 'text' : 'password'"
                      variant="outlined"
                      :rules="[
                        v => !!v || 'Nueva contraseña requerida',
                        v => (v && v.length >= 6) || 'La contraseña debe tener al menos 6 caracteres'
                      ]"
                    >
                    >
                      <template v-slot:prepend-inner>
                        <v-icon>mdi-lock-plus-outline</v-icon>
                      </template>
                      <template v-slot:append-inner>
                        <span 
                          @click="showNewPassword = !showNewPassword" 
                          style="cursor: pointer; font-size: 20px; user-select: none;"
                        >
                          {{ showNewPassword ? '🙈' : '👁️' }}
                        </span>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-text-field
                      v-model="passwordForm.confirmPassword"
                      label="Confirmar Nueva Contraseña"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      variant="outlined"
                      :rules="[
                        v => !!v || 'Confirmación de contraseña requerida',
                        v => v === passwordForm.newPassword || 'Las contraseñas no coinciden'
                      ]"
                    >
                      <template v-slot:prepend-inner>
                        <v-icon>mdi-lock-check-outline</v-icon>
                      </template>
                      <template v-slot:append-inner>
                        <span 
                          @click="showConfirmPassword = !showConfirmPassword" 
                          style="cursor: pointer; font-size: 20px; user-select: none;"
                        >
                          {{ showConfirmPassword ? '🙈' : '👁️' }}
                        </span>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-btn
                      color="primary"
                      @click="changePassword"
                      :loading="changingPassword"
                      :disabled="!passwordForm.newPassword || !passwordForm.confirmPassword || passwordForm.newPassword !== passwordForm.confirmPassword"
                      size="large"
                      prepend-icon="mdi-lock-reset"
                      block
                    >
                      Cambiar Contraseña
                    </v-btn>
                  </v-col>
                </v-row>
              </v-form>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import axios from '../utils/axios'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()

// Referencias de formularios
const passwordFormRef = ref(null)

// Estado de validación
const passwordFormValid = ref(false)

// Estado de carga
const loadingProfile = ref(false)
const changingPassword = ref(false)

// Formulario de perfil (solo lectura)
const profileForm = ref({
  name: '',
  email: '',
  supplier_name: ''
})

// Formulario de contraseña
const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

// Control de visibilidad de contraseñas
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// Cargar información del perfil
const loadProfile = async () => {
  loadingProfile.value = true
  try {
    const response = await axios.get('/api/auth/me')
    profileForm.value = {
      name: response.data.user.name || '',
      email: response.data.user.email || '',
      supplier_name: response.data.user.supplier_name || ''
    }
  } catch (error) {
    console.error('Error cargando perfil:', error)
    toast.error('Error al cargar la información del perfil')
  } finally {
    loadingProfile.value = false
  }
}

// Cambiar contraseña
const changePassword = async () => {
  if (!passwordFormRef.value?.validate()) {
    return
  }
  
  changingPassword.value = true
  try {
    // Usar el mismo endpoint que la pantalla de editar usuarios
    // Obtener el ID del usuario desde el store de auth
    const authStore = useAuthStore()
    const userId = authStore.user?.id
    
    if (!userId) {
      toast.error('Error: No se puede identificar al usuario')
      return
    }
    
    await axios.put(`/api/users/${userId}/change-password`, {
      password: passwordForm.value.newPassword
    })
    
    toast.success('Contraseña cambiada correctamente')
    
    // Limpiar campos
    passwordForm.value = {
      newPassword: '',
      confirmPassword: ''
    }
    
    // Resetear visibilidad de contraseñas
    showNewPassword.value = false
    showConfirmPassword.value = false
    
    // Resetear validación del formulario
    passwordFormRef.value?.resetValidation()
    
  } catch (error) {
    console.error('Error cambiando contraseña:', error)
    const message = error.response?.data?.message || 'Error al cambiar la contraseña'
    toast.error(message)
  } finally {
    changingPassword.value = false
  }
}

// Cargar datos al montar el componente
onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-view {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.bg-light {
  background-color: #f8f9fa !important;
}
</style>