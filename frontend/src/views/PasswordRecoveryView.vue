<template>
  <v-main>
    <div class="recovery-container">
      <!-- Panel Izquierdo - Formulario -->
      <div class="left-panel">
        <div class="recovery-card">
          <!-- Marca -->
          <div class="brand-section">
            <div class="brand-logo">
              📄
            </div>
            <h1 class="brand-title">PayQuetzal</h1>
            <p class="brand-subtitle">Sistema de Gestión de Pagos</p>
          </div>
          
          <!-- Contenido dinámico -->
          <div class="form-section" v-if="!emailSent">
            <h2 class="form-title">Recuperar Contraseña</h2>
            <p class="form-subtitle">Ingrese su correo electrónico para recibir instrucciones de recuperación</p>
            
            <v-form ref="recoveryForm" v-model="valid" @submit.prevent="sendResetEmail">
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
              ></v-text-field>
              
              <v-btn
                :loading="loading"
                :disabled="!valid || loading"
                type="submit"
                block
                color="primary"
                class="recovery-button"
                size="large"
                variant="flat"
              >
                Enviar Instrucciones
              </v-btn>
            </v-form>
            
            <div class="footer-section">
              <v-btn
                variant="text"
                color="primary"
                class="back-button"
                @click="goToLogin"
                :disabled="loading"
              >
                ← Volver al Login
              </v-btn>
            </div>
            
            <div class="footer-info">
              <p>&copy; 2025 Recepción de Facturas. Todos los derechos reservados.</p>
              <p>Guatemala, Centroamérica</p>
            </div>
          </div>
          
          <!-- Confirmación -->
          <div class="confirmation-section" v-else>
            <div class="text-center mb-6">
              <v-icon class="success-icon" color="success">mdi-check-circle</v-icon>
              <h2 class="success-title">¡Email Enviado!</h2>
              <p class="success-message">
                Hemos enviado las instrucciones de recuperación a su correo electrónico.
              </p>
              <p class="success-subtitle">
                Revise su bandeja de entrada y siga las instrucciones para restablecer su contraseña.
                El enlace expirará en 1 hora por seguridad.
              </p>
            </div>
            
            <div class="resend-section">
              <p class="resend-text">¿No recibió el email?</p>
              <v-btn
                :loading="loading"
                :disabled="cooldownActive"
                variant="outlined"
                color="primary"
                class="resend-button"
                @click="resendEmail"
                block
              >
                {{ cooldownActive ? `Reenviar en ${cooldownTime}s` : 'Reenviar Email' }}
              </v-btn>
            </div>
            
            <div class="footer-section">
              <v-btn
                variant="text"
                color="primary"
                class="back-button"
                @click="goToLogin"
              >
                ← Volver al Login
              </v-btn>
              
              <div class="footer-info">
                <p>&copy; 2025 Recepción de Facturas. Todos los derechos reservados.</p>
                <p>Guatemala, Centroamérica</p>
              </div>
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
              <h3>Verificación por Email</h3>
              <p>Enlace seguro enviado a su correo registrado</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              ⏱️
            </div>
            <div class="feature-content">
              <h3>Expiración Automática</h3>
              <p>Los enlaces expiran en 1 hora por seguridad</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              🛡️
            </div>
            <div class="feature-content">
              <h3>Protección Total</h3>
              <p>Encriptación avanzada en todo el proceso</p>
            </div>
          </div>
          
          <div class="feature-item">
            <div class="feature-icon">
              🎯
            </div>
            <div class="feature-content">
              <h3>Acceso Controlado</h3>
              <p>Un solo uso por enlace de recuperación</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </v-main>
</template>

<script setup>
import { usePasswordRecovery } from '../scripts/password-recovery.js'

const {
  // Reactive state
  valid,
  email,
  loading,
  emailSent,
  cooldownActive,
  cooldownTime,
  
  // Rules
  emailRules,
  
  // Functions
  sendResetEmail,
  resendEmail,
  goToLogin
} = usePasswordRecovery()
</script>

<style scoped>
.recovery-container {
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
  animation: float 20s infinite linear;
}

@keyframes float {
  0% { transform: translate(0, 0); }
  100% { transform: translate(-20px, -20px); }
}

.recovery-card {
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
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.brand-logo:hover {
  transform: scale(1.05);
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
  color: #0f172a;
  margin-bottom: 12px;
}

.form-subtitle {
  color: #64748b;
  font-size: 16px;
  margin-bottom: 32px;
  line-height: 1.5;
}

.custom-input {
  margin-bottom: 24px;
}

.custom-input :deep(.v-field) {
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.custom-input :deep(.v-field:hover) {
  border-color: #cbd5e1;
}

.custom-input :deep(.v-field--focused) {
  border-color: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  background: white;
}

.custom-input :deep(.v-field--error) {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

.custom-input :deep(.v-input__prepend-inner) {
  color: #64748b;
  padding-inline-end: 12px;
}

.recovery-button {
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
  margin-bottom: 24px;
}

.recovery-button:hover {
  background: #1e293b !important;
  box-shadow: 0 6px 24px rgba(15, 23, 42, 0.5);
  transform: translateY(-2px);
}

.recovery-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
}

.recovery-button:disabled {
  background: #64748b !important;
  color: white !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transform: none;
  opacity: 0.7;
}

.recovery-button.v-btn--loading {
  background: #0f172a !important;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.4);
}

.recovery-button :deep(.v-btn__loader) {
  color: white;
}

.confirmation-section {
  margin-bottom: 32px;
}

.success-icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.success-title {
  font-size: 24px;
  font-weight: 600;
  color: #059669;
  margin-bottom: 16px;
}

.success-message {
  color: #0f172a;
  font-size: 16px;
  margin-bottom: 12px;
}

.success-subtitle {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 32px;
  line-height: 1.5;
}

.resend-section {
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 24px;
}

.resend-text {
  color: #64748b;
  font-size: 14px;
  margin-bottom: 12px;
}

.resend-button {
  text-transform: none;
  font-weight: 600;
}

.footer-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 24px;
}

.back-button {
  text-transform: none;
  font-weight: 600;
  margin-bottom: 24px;
  color: #0f172a;
  text-decoration: none;
  transition: color 0.2s ease;
}

.back-button:hover {
  color: #334155;
  text-decoration: underline;
}

.footer-info {
  color: #64748b;
  font-size: 12px;
}

.footer-info p {
  margin: 4px 0;
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
  transition: transform 0.2s ease;
}

.feature-item:hover {
  transform: translateX(4px);
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
  transition: all 0.2s ease;
}

.feature-item:hover .feature-icon {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
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

/* Animaciones adicionales */
@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.left-panel {
  animation: slideInLeft 0.6s ease-out;
}

.right-panel {
  animation: slideInRight 0.6s ease-out;
}

.feature-item {
  animation: slideInRight 0.6s ease-out;
}

.feature-item:nth-child(2) { animation-delay: 0.1s; }
.feature-item:nth-child(3) { animation-delay: 0.2s; }
.feature-item:nth-child(4) { animation-delay: 0.3s; }
.feature-item:nth-child(5) { animation-delay: 0.4s; }

/* Responsive design */
@media (max-width: 768px) {
  .recovery-container {
    flex-direction: column;
  }
  
  .right-panel {
    display: none;
  }
  
  .left-panel {
    padding: 40px 20px;
    animation: slideInLeft 0.4s ease-out;
  }

  .brand-title {
    font-size: 28px;
  }

  .form-title {
    font-size: 20px;
  }

  .recovery-card {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .left-panel {
    padding: 20px 16px;
  }

  .brand-section {
    margin-bottom: 32px;
  }

  .brand-logo {
    width: 56px;
    height: 56px;
    font-size: 24px;
  }

  .brand-title {
    font-size: 24px;
  }

  .form-title {
    font-size: 18px;
  }
}
</style>
