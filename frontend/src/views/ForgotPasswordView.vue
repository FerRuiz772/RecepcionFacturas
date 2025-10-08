import empresaLogo from '@/assets/empresa_logo.png'
import payquetzalLogo from '@/assets/logo-payquetzal.png

<template>
  <div class="forgot-password-container">
      <!-- Logo empresa arriba a la izquierda -->
      <div class="empresa-logo">
        <img :src="empresaLogo" alt="Empresa Logo" style="height: 90px; width: auto;" />
      </div>
      
      <!-- Panel Izquierdo - Formulario -->
      <div class="left-panel">
        <div class="forgot-password-card">
          <!-- Marca -->
          <div class="brand-section">
            <div class="brand-logo brand-logo-image">
              <img :src="payquetzalLogo" alt="PayQuetzal Logo" />
            </div>
          </div>
          
          <!-- Contenido del formulario -->
          <div class="form-section">
            <div v-if="!emailSent">
              <h2 class="form-title">Recuperar Contraseña</h2>
              <p class="form-subtitle">Ingrese su correo electrónico para recibir un enlace de recuperación</p>
              
              <v-form ref="form" v-model="valid" @submit.prevent="handleSubmit">
                <v-text-field
                  v-model="email"
                  :rules="emailRules"
                  label="Correo Electrónico"
                  type="email"
                  variant="outlined"
                  density="comfortable"
                  class="custom-input"
                  prepend-inner-icon="mdi-email-outline"
                  hide-details="auto"
                  :disabled="loading"
                  autocomplete="email"
                ></v-text-field>
                
                <v-btn
                  :loading="loading"
                  :disabled="!valid || !email.trim()"
                  type="submit"
                  block
                  color="primary"
                  class="submit-button"
                  size="large"
                  variant="flat"
                >
                  <v-icon left>mdi-send</v-icon>
                  {{ loading ? 'Enviando...' : 'Enviar Enlace de Recuperación' }}
                </v-btn>
              </v-form>
              
              <div class="error-alert" v-if="error">
                <v-icon size="16" class="error-icon">mdi-alert-circle</v-icon>
                {{ error }}
              </div>
            </div>
            
            <!-- Estado de éxito -->
            <div v-else class="success-section">
              <div class="success-icon">✅</div>
              <h3>¡Correo Enviado!</h3>
              <div class="success-message">
                <p>Si el correo electrónico está registrado en nuestro sistema, recibirás un enlace para restablecer tu contraseña.</p>
              </div>
              <div class="instructions">
                <p><strong>Verifica tu bandeja de entrada</strong> y también la carpeta de spam. El enlace expirará en 1 hora.</p>
              </div>
              
              <v-btn
                @click="goToLogin"
                block
                color="primary"
                class="login-button"
                size="large"
                variant="flat"
              >
                <v-icon left>mdi-arrow-left</v-icon>
                Volver al Inicio de Sesión
              </v-btn>
            </div>
            
            <!-- Enlaces de navegación -->
            <div class="footer-links" v-if="!emailSent">
              <router-link to="/login" class="back-link">
                <v-icon size="16" class="mr-1">mdi-arrow-left</v-icon>
                Volver al inicio de sesión
              </router-link>
            </div>
            
            <div class="footer-info">
              <p>&copy; 2025 Recepción de Facturas. Todos los derechos reservados.</p>
              <p>Guatemala, Centroamérica</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Panel Derecho - Información -->
      <div class="right-panel">
        <div class="feature-list">
          <div style="text-align: center; margin-bottom: 48px;">
            <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">
              Recuperación Segura
            </h2>
            <p style="font-size: 16px; opacity: 0.8; max-width: 400px;">
              Protegemos su cuenta con los más altos estándares de seguridad
            </p>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              🔐
            </div>
            <div class="feature-content">
              <h3>Tokens Seguros</h3>
              <p>Enlaces únicos con expiración automática</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              ⏰
            </div>
            <div class="feature-content">
              <h3>Validez Limitada</h3>
              <p>Los enlaces expiran en 1 hora por su seguridad</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              📧
            </div>
            <div class="feature-content">
              <h3>Notificación Inmediata</h3>
              <p>Reciba el enlace directamente en su correo</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              🛡️
            </div>
            <div class="feature-content">
              <h3>Protección Avanzada</h3>
              <p>Sistema diseñado contra intentos maliciosos</p>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'
import { useForgotPassword } from '../scripts/forgot-password.js'

// Validaciones de Vuetify
const emailRules = [
  v => !!v || 'El correo electrónico es requerido',
  v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Ingrese un correo electrónico válido (debe contener @)'
]

const valid = ref(false)

const {
  // Reactive state
  email,
  loading,
  error,
  emailSent,
  
  // Functions
  handleSubmit,
  goToLogin
} = useForgotPassword()
</script>

<style src="../styles/forgot-password.css" scoped></style>
