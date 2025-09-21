<template>
  <div class="reset-password-container">
      <!-- Panel izquierdo - Formulario -->
      <div class="left-panel">
        <div class="reset-password-card">
          <!-- Marca -->
          <div class="brand-section">
            <div class="brand-logo">🧾</div>
            <h1 class="brand-title">Recepción de Facturas</h1>
            <p class="brand-subtitle">Gestión inteligente de documentos</p>
          </div>

          <!-- Loading state mientras valida token -->
          <div v-if="validatingToken" class="loading-section">
            <v-progress-circular 
              indeterminate 
              color="#0f172a" 
              size="48"
              class="mb-4"
            ></v-progress-circular>
            <h3 class="form-title">Validando enlace...</h3>
            <p class="form-subtitle">Por favor espera mientras verificamos tu enlace de recuperación.</p>
          </div>

          <!-- Estado de token inválido -->
          <div v-else-if="tokenError" class="error-section">
            <v-icon icon="mdi-alert-circle" size="64" color="error" class="mb-4"></v-icon>
            <h3 class="form-title">Enlace Inválido</h3>
            <p class="form-subtitle error-text">{{ tokenError }}</p>
            <div class="action-buttons">
              <v-btn 
                @click="goToLogin" 
                variant="outlined"
                color="#0f172a"
                class="mb-3"
                block
              >
                Volver al Login
              </v-btn>
              <v-btn 
                @click="goToForgotPassword" 
                class="submit-button"
                block
              >
                Solicitar Nuevo Enlace
              </v-btn>
            </div>
          </div>

          <!-- Estado de éxito -->
          <div v-else-if="passwordReset" class="success-section">
            <v-icon icon="mdi-check-circle" size="64" color="success" class="mb-4"></v-icon>
            <h3 class="form-title">¡Contraseña Restablecida!</h3>
            <p class="success-message">
              Tu contraseña ha sido actualizada exitosamente.
            </p>
            <div class="instructions">
              Ya puedes iniciar sesión con tu nueva contraseña.
            </div>
            
            <v-btn 
              @click="goToLogin" 
              class="login-button"
              block
            >
              <v-icon icon="mdi-login" start></v-icon>
              Ir al Login
            </v-btn>
          </div>

          <!-- Formulario de reset -->
          <div v-else class="form-section">
            <h2 class="form-title">Restablecer Contraseña</h2>
            <div v-if="userInfo" class="user-info">
              <p class="form-subtitle">
                Restableciendo contraseña para: <strong>{{ userInfo.email }}</strong>
              </p>
            </div>

            <v-form @submit.prevent="handleSubmit" ref="form">
              <!-- Nueva Contraseña -->
              <v-text-field
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                label="Nueva Contraseña"
                placeholder="Mínimo 8 caracteres"
                :prepend-inner-icon="'mdi-lock'"
                :rules="[v => !!v || 'Este campo es obligatorio', v => passwordValid || 'La contraseña no cumple con los requisitos']"
                :disabled="loading"
                autocomplete="new-password"
                class="custom-input mb-4"
                variant="outlined"
                :error-messages="errors.password"
              >
                <template v-slot:append-inner>
                  <span 
                    @click="showPassword = !showPassword" 
                    style="cursor: pointer; font-size: 20px; user-select: none;"
                  >
                    {{ showPassword ? '🙈' : '👁️' }}
                  </span>
                </template>
              </v-text-field>

              <!-- Requisitos de contraseña -->
              <div class="password-requirements mb-4">
                <p class="requirements-title">La contraseña debe contener:</p>
                <ul class="requirements-list">
                  <li :class="{ valid: hasMinLength }">
                    <v-icon :icon="hasMinLength ? 'mdi-check' : 'mdi-close'" :color="hasMinLength ? 'success' : 'error'" size="16"></v-icon>
                    Al menos 8 caracteres
                  </li>
                  <li :class="{ valid: hasUppercase }">
                    <v-icon :icon="hasUppercase ? 'mdi-check' : 'mdi-close'" :color="hasUppercase ? 'success' : 'error'" size="16"></v-icon>
                    Una letra mayúscula
                  </li>
                  <li :class="{ valid: hasLowercase }">
                    <v-icon :icon="hasLowercase ? 'mdi-check' : 'mdi-close'" :color="hasLowercase ? 'success' : 'error'" size="16"></v-icon>
                    Una letra minúscula
                  </li>
                  <li :class="{ valid: hasNumber }">
                    <v-icon :icon="hasNumber ? 'mdi-check' : 'mdi-close'" :color="hasNumber ? 'success' : 'error'" size="16"></v-icon>
                    Un número
                  </li>
                  <li :class="{ valid: hasSymbol }">
                    <v-icon :icon="hasSymbol ? 'mdi-check' : 'mdi-close'" :color="hasSymbol ? 'success' : 'error'" size="16"></v-icon>
                    Un símbolo (@$!%*?&)
                  </li>
                </ul>
              </div>

              <!-- Confirmar Contraseña -->
              <v-text-field
                v-model="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                label="Confirmar Contraseña"
                placeholder="Repite la contraseña"
                :prepend-inner-icon="'mdi-lock-check'"
                :rules="[v => !!v || 'Este campo es obligatorio', v => passwordsMatch || 'Las contraseñas no coinciden']"
                :disabled="loading"
                autocomplete="new-password"
                class="custom-input mb-4"
                variant="outlined"
                :error-messages="errors.confirmPassword"
              >
                <template v-slot:append-inner>
                  <span 
                    @click="showConfirmPassword = !showConfirmPassword" 
                    style="cursor: pointer; font-size: 20px; user-select: none;"
                  >
                    {{ showConfirmPassword ? '🙈' : '👁️' }}
                  </span>
                </template>
              </v-text-field>

              <!-- Botón de envío -->
              <v-btn 
                type="submit" 
                class="submit-button"
                :loading="loading"
                :disabled="!isFormValid"
                block
              >
                <v-icon icon="mdi-lock-reset" start></v-icon>
                {{ loading ? 'Restableciendo...' : 'Restablecer Contraseña' }}
              </v-btn>

              <!-- Error general -->
              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mt-4"
              >
                {{ error }}
              </v-alert>
            </v-form>

            <!-- Enlaces del pie -->
            <div class="footer-links">
              <router-link to="/login" class="back-link">
                <v-icon icon="mdi-arrow-left" size="16"></v-icon>
                Volver al Login
              </router-link>
            </div>
          </div>
        </div>
      </div>

      <!-- Panel derecho - Características -->
      <div class="right-panel">
        <div class="feature-list">
          <div class="feature-item">
            <div class="feature-icon">
              <v-icon icon="mdi-shield-check" color="white"></v-icon>
            </div>
            <div class="feature-content">
              <h3>Seguridad Avanzada</h3>
              <p>Utilizamos cifrado de nivel empresarial para proteger tus datos y contraseñas.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              <v-icon icon="mdi-key-variant" color="white"></v-icon>
            </div>
            <div class="feature-content">
              <h3>Contraseñas Robustas</h3>
              <p>Nuestro sistema te ayuda a crear contraseñas seguras que protegen tu cuenta.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              <v-icon icon="mdi-email-fast" color="white"></v-icon>
            </div>
            <div class="feature-content">
              <h3>Recuperación Rápida</h3>
              <p>Sistema de recuperación de contraseña mediante email seguro y confiable.</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              <v-icon icon="mdi-account-check" color="white"></v-icon>
            </div>
            <div class="feature-content">
              <h3>Acceso Garantizado</h3>
              <p>Nunca perderás el acceso a tu cuenta con nuestros sistemas de recuperación.</p>
            </div>
          </div>
        </div>
        
        <div class="footer-info">
          <p>© 2024 Recepción de Facturas. Todos los derechos reservados.</p>
          <p>Sistema seguro de gestión de documentos empresariales.</p>
        </div>
      </div>
    </div>
</template>

<script setup>
import { useResetPassword } from '../scripts/reset-password.js'

const {
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
  hasMinLength,
  hasUppercase,
  hasLowercase,
  hasNumber,
  hasSymbol,
  passwordValid,
  passwordsMatch,
  isFormValid,
  handleSubmit,
  goToLogin,
  goToForgotPassword
} = useResetPassword()
</script>
<style src="../styles/reset-password.css" scoped></style>