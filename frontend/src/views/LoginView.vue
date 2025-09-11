<template>
    <v-main>
      <div class="login-container">
        <!-- Panel Izquierdo - Formulario -->
        <div class="left-panel">
          <div class="login-card">
            <!-- Marca -->
            <div class="brand-section">
              <div class="brand-logo">
                ðŸ“„
              </div>
              <h1 class="brand-title">RecepciÃ³n Facturas</h1>
              <p class="brand-subtitle">Sistema de GestiÃ³n de Pagos</p>
            </div>
            
            <!-- Formulario -->
            <div class="form-section">
              <h2 class="form-title">Iniciar SesiÃ³n</h2>
              <p class="form-subtitle">Ingrese sus credenciales para acceder al sistema</p>
              
              <v-form ref="loginForm" v-model="valid" @submit.prevent="login">
                <v-text-field
                  v-model="email"
                  :rules="emailRules"
                  label="Correo ElectrÃ³nico"
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
                  label="ContraseÃ±a"
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
                    Â¿OlvidÃ³ su contraseÃ±a?
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
                  Iniciar SesiÃ³n
                </v-btn>
              </v-form>
              
              <div class="footer-info">
                <p>&copy; 2025 RecepciÃ³n de Facturas. Todos los derechos reservados.</p>
                <p>Guatemala, CentroamÃ©rica</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Panel Derecho - InformaciÃ³n -->
        <div class="right-panel">
          <div class="feature-list">
            <div style="text-align: center; margin-bottom: 48px;">
              <h2 style="font-size: 28px; font-weight: 700; margin-bottom: 12px;">
                GestiÃ³n Integral de Pagos
              </h2>
              <p style="font-size: 16px; opacity: 0.8; max-width: 400px;">
                Optimice los procesos de pago de su empresa con nuestra plataforma profesional
              </p>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                ðŸ”’
              </div>
              <div class="feature-content">
                <h3>Seguridad Avanzada</h3>
                <p>EncriptaciÃ³n AES-256 y autenticaciÃ³n multi-factor</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                ðŸ“Š
              </div>
              <div class="feature-content">
                <h3>Trazabilidad Completa</h3>
                <p>Seguimiento en tiempo real de todos los procesos</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                âš¡
              </div>
              <div class="feature-content">
                <h3>AutomatizaciÃ³n</h3>
                <p>Flujos automÃ¡ticos para reducir tiempos de proceso</p>
              </div>
            </div>
            
            <div class="feature-item">
              <div class="feature-icon">
                ðŸ“ˆ
              </div>
              <div class="feature-content">
                <h3>Reportes Ejecutivos</h3>
                <p>Analytics y mÃ©tricas para toma de decisiones</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </v-main>
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
