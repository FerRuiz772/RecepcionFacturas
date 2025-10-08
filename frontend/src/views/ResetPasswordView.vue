<template>
  <div class="reset-password-container">
    <!-- Logo de la empresa (fijo en esquina superior izquierda) -->
    <div class="empresa-logo">
      <img :src="empresaLogo" alt="Empresa Logo" />
    </div>

    <!-- Panel izquierdo - Formulario -->
    <div class="left-panel">
      <div class="reset-password-card">
        <!-- Marca -->
        <div class="brand-section">
          <div class="brand-logo-image">
            <img :src="payquetzalLogo" alt="PayQuetzal Logo" />
          </div>
        </div>

        <!-- Loading state mientras valida token -->
        <div v-if="validatingToken" class="loading-section">
          <v-progress-circular 
            indeterminate 
            color="#3a9b7a" 
            size="48"
            class="mb-4"
          ></v-progress-circular>
          <h3 class="form-title">Validando enlace...</h3>
          <p class="form-subtitle">Por favor espera mientras verificamos tu enlace de recuperación.</p>
        </div>

        <!-- Estado de token inválido -->
        <div v-else-if="tokenError" class="error-section">
          <span class="error-icon">❌</span>
          <h3 class="form-title">Enlace Inválido</h3>
          <p class="form-subtitle error-text">{{ tokenError }}</p>
          <div class="action-buttons">
            <v-btn 
              @click="goToLogin" 
              variant="outlined"
              color="#3a9b7a"
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
          <span class="success-icon">✅</span>
          <h3>¡Contraseña Restablecida!</h3>
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
            <p>
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
              prepend-inner-icon="mdi-lock"
              :rules="[v => !!v || 'Este campo es obligatorio']"
              :disabled="loading"
              autocomplete="new-password"
              class="custom-input"
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

            <!-- Requisitos de contraseña - Solo visible cuando se escribe -->
            <div v-if="password.length > 0" class="password-requirements">
              <p class="requirements-title">La contraseña debe contener:</p>
              <ul class="requirements-list">
                <li :class="{ valid: hasMinLength }">
                  <span class="requirement-icon">{{ hasMinLength ? '✅' : '❌' }}</span>
                  Al menos 8 caracteres
                </li>
                <li :class="{ valid: hasUppercase }">
                  <span class="requirement-icon">{{ hasUppercase ? '✅' : '❌' }}</span>
                  Una letra mayúscula
                </li>
                <li :class="{ valid: hasLowercase }">
                  <span class="requirement-icon">{{ hasLowercase ? '✅' : '❌' }}</span>
                  Una letra minúscula
                </li>
                <li :class="{ valid: hasNumber }">
                  <span class="requirement-icon">{{ hasNumber ? '✅' : '❌' }}</span>
                  Un número
                </li>
                <li :class="{ valid: hasSymbol }">
                  <span class="requirement-icon">{{ hasSymbol ? '✅' : '❌' }}</span>
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
              prepend-inner-icon="mdi-lock-check"
              :rules="[v => !!v || 'Este campo es obligatorio', v => passwordsMatch || 'Las contraseñas no coinciden']"
              :disabled="loading"
              autocomplete="new-password"
              class="custom-input"
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
            <div v-if="error" class="error-alert">
              <span class="error-icon">⚠️</span>
              {{ error }}
            </div>
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
          <div class="feature-icon">🛡️</div>
          <div class="feature-content">
            <h3>Seguridad Avanzada</h3>
            <p>Utilizamos cifrado de nivel empresarial para proteger tus datos y contraseñas.</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">🔑</div>
          <div class="feature-content">
            <h3>Contraseñas Robustas</h3>
            <p>Nuestro sistema te ayuda a crear contraseñas seguras que protegen tu cuenta.</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">📧</div>
          <div class="feature-content">
            <h3>Recuperación Rápida</h3>
            <p>Sistema de recuperación de contraseña mediante email seguro y confiable.</p>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon">✓</div>
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
import empresaLogo from '@/assets/empresa_logo.png'
import payquetzalLogo from '@/assets/logo-payquetzal.png'

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
