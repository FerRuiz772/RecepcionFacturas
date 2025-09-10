<template>
    <v-main>
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
    </v-main>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useToast } from 'vue-toastification'
  
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
  </script>
  
  <style scoped>
  .login-container {
    min-height: 100vh;
    display: flex;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }
  
  .left-panel {
    flex: 1;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px 40px;
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.04);
  }
  
  .right-panel {
    flex: 1;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px 40px;
    color: white;
    position: relative;
    overflow: hidden;
  }
  
  .right-panel::before {
    content: '';
    position: absolute;
    width: 200%;
    height: 200%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
    top: -50%;
    left: -50%;
  }
  
  .login-card {
    width: 100%;
    max-width: 420px;
  }
  
  .brand-section {
    text-align: center;
    margin-bottom: 48px;
  }
  
  .brand-logo {
    width: 64px;
    height: 64px;
    background: #0f172a;
    border-radius: 12px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 28px;
  }
  
  .brand-title {
    font-size: 32px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
    letter-spacing: -0.025em;
  }
  
  .brand-subtitle {
    font-size: 16px;
    color: #64748b;
    font-weight: 400;
  }
  
  .form-section {
    margin-bottom: 32px;
  }
  
  .form-title {
    font-size: 24px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 8px;
  }
  
  .form-subtitle {
    font-size: 15px;
    color: #64748b;
    margin-bottom: 32px;
  }
  
  .custom-input {
    margin-bottom: 20px;
  }
  
  .custom-input :deep(.v-field) {
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  
  .custom-input :deep(.v-field:hover) {
    border-color: #cbd5e1;
  }
  
  .custom-input :deep(.v-field--focused) {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }
  
  /* Estilos mejorados para el checkbox */
  .checkbox-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .checkbox-label {
    font-size: 14px;
    color: #1e293b;
    font-weight: 500;
    cursor: pointer;
    user-select: none;
  }
  
  .custom-checkbox :deep(.v-selection-control__wrapper) {
    background: rgba(15, 23, 42, 0.08);
    border: 2px solid #cbd5e1;
    border-radius: 6px;
    padding: 0;
    width: 20px;
    height: 20px;
    transition: all 0.2s ease;
  }
  
  .custom-checkbox :deep(.v-checkbox .v-selection-control__input) {
    color: #0f172a;
  }
  
  .custom-checkbox :deep(.v-checkbox .v-selection-control__input:hover) {
    background: rgba(15, 23, 42, 0.12);
  }
  
  .custom-checkbox :deep(.v-selection-control--dirty .v-selection-control__wrapper) {
    background: #0f172a;
    border-color: #0f172a;
  }
  
  .custom-checkbox :deep(.v-selection-control--dirty .v-selection-control__input) {
    color: white;
  }
  
  /* Estilos mejorados para el botón */
  .login-button {
    height: 48px;
    border-radius: 8px;
    background: #0f172a !important;
    color: white !important;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.025em;
    text-transform: none;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.4);
    transition: all 0.2s ease;
    border: none;
  }
  
  .login-button:hover {
    background: #1e293b !important;
    box-shadow: 0 6px 24px rgba(15, 23, 42, 0.5);
    transform: translateY(-2px);
  }
  
  .login-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
  }
  
  .login-button:disabled {
    background: #64748b !important;
    color: white !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transform: none;
    opacity: 0.7;
  }
  
  .login-button.v-btn--loading {
    background: #0f172a !important;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.4);
  }
  
  .forgot-link {
    color: #0f172a;
    text-decoration: none;
    font-weight: 500;
    font-size: 14px;
    transition: color 0.2s ease;
  }
  
  .forgot-link:hover {
    color: #334155;
  }
  
  .feature-list {
    position: relative;
    z-index: 1;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    color: rgba(255, 255, 255, 0.9);
  }
  
  .feature-icon {
    width: 48px;
    height: 48px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
    backdrop-filter: blur(10px);
    font-size: 20px;
  }
  
  .feature-content h3 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
  }
  
  .feature-content p {
    margin: 0;
    font-size: 14px;
    opacity: 0.8;
  }
  
  .footer-info {
    text-align: center;
    margin-top: 40px;
    font-size: 13px;
    color: #94a3b8;
  }
  
  @media (max-width: 768px) {
    .login-container {
      flex-direction: column;
    }
    
    .right-panel {
      display: none;
    }
    
    .left-panel {
      padding: 40px 20px;
    }
  }
  </style>