<template>
  <div class="login-container">
      <!-- Panel Izquierdo - Formulario -->
      <div class="left-panel">
        <div class="login-card">
          <!-- Marca -->
          <div class="brand-section">
            <div class="brand-logo">
              📄
            </div>
            <h1 class="brand-title">Recepción Facturas</h1>
            <p class="brand-subtitle">Sistema de Gestión de Pagos</p>
          </div>
          
          <!-- Formulario -->
          <div class="form-section">
            <h2 class="form-title">Iniciar Sesión</h2>
            <p class="form-subtitle">Ingrese sus credenciales para acceder al sistema</p>
            
            <v-form ref="loginForm" v-model="valid" @submit.prevent="login">
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
              ></v-text-field>
              
              <v-text-field
                v-model="password"
                :rules="passwordRules"
                :type="showPassword ? 'text' : 'password'"
                label="Contraseña"
                variant="outlined"
                density="comfortable"
                class="custom-input"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
                hide-details="auto"
              ></v-text-field>
              
              <div class="d-flex justify-space-between align-center mb-6">
                <div class="checkbox-wrapper">
                  <v-checkbox
                    v-model="rememberMe"
                    density="compact"
                    color="primary"
                    class="custom-checkbox"
                    hide-details
                  ></v-checkbox>
                  <label class="checkbox-label" @click="rememberMe = !rememberMe">
                    Recordarme
                  </label>
                </div>
                
                <a href="#" @click.prevent="forgotPassword" class="forgot-link">
                  ¿Olvidó su contraseña?
                </a>
              </div>
              
              <v-btn
                :loading="loading"
                :disabled="!valid"
                type="submit"
                block
                color="primary"
                class="login-button"
                size="large"
                variant="flat"
              >
                Iniciar Sesión
              </v-btn>
            </v-form>
            
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
              Gestión Integral de Pagos
            </h2>
            <p style="font-size: 16px; opacity: 0.8; max-width: 400px;">
              Optimice los procesos de pago de su empresa con nuestra plataforma profesional
            </p>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              🔒
            </div>
            <div class="feature-content">
              <h3>Seguridad Avanzada</h3>
              <p>Encriptación AES-256 y autenticación multi-factor</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              📊
            </div>
            <div class="feature-content">
              <h3>Trazabilidad Completa</h3>
              <p>Seguimiento en tiempo real de todos los procesos</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              ⚡
            </div>
            <div class="feature-content">
              <h3>Automatización</h3>
              <p>Flujos automáticos para reducir tiempos de proceso</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              📈
            </div>
            <div class="feature-content">
              <h3>Reportes Ejecutivos</h3>
              <p>Analytics y métricas para toma de decisiones</p>
            </div>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup>
import { useLogin } from '../scripts/login.js'

const {
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
} = useLogin()
</script>

<style src="../styles/login.css" scoped></style>