<template>
  <div class="whatsapp-config-view">
    <div class="page-header">
      <h1>
        <i class="fab fa-whatsapp"></i>
        Configuración de WhatsApp
      </h1>
      <p class="subtitle">Gestiona la conexión de WhatsApp para notificaciones automáticas</p>
    </div>

    <!-- Estado de conexión -->
    <div class="status-card" :class="statusClass">
      <div class="status-header">
        <div class="status-icon">
          <i :class="statusIcon"></i>
        </div>
        <div class="status-info">
          <h3>{{ statusTitle }}</h3>
          <p>{{ statusMessage }}</p>
        </div>
        <button 
          v-if="!status.connected && status.enabled" 
          @click="refreshStatus" 
          class="btn-refresh"
          :disabled="loading"
        >
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
          Actualizar
        </button>
      </div>
    </div>

    <!-- Código QR -->
    <div v-if="showQR" class="qr-card">
      <div class="qr-header">
        <h3>
          <i class="fas fa-qrcode"></i>
          Escanea el Código QR
        </h3>
        <p>Abre WhatsApp en tu teléfono y escanea este código para conectar</p>
      </div>
      
      <div class="qr-container">
        <iframe 
          :src="qrUrl" 
          class="qr-iframe"
          frameborder="0"
        ></iframe>
      </div>

      <div class="qr-instructions">
        <div class="instruction-step">
          <span class="step-number">1</span>
          <span class="step-text">Abre WhatsApp en tu teléfono</span>
        </div>
        <div class="instruction-step">
          <span class="step-number">2</span>
          <span class="step-text">Ve a <strong>Configuración</strong> → <strong>Dispositivos vinculados</strong></span>
        </div>
        <div class="instruction-step">
          <span class="step-number">3</span>
          <span class="step-text">Toca <strong>"Vincular un dispositivo"</strong></span>
        </div>
        <div class="instruction-step">
          <span class="step-number">4</span>
          <span class="step-text">Escanea el código QR que aparece arriba</span>
        </div>
      </div>
    </div>

    <!-- Información adicional -->
    <div v-if="status.connected" class="info-card">
      <h3>
        <i class="fas fa-info-circle"></i>
        Información
      </h3>
      <ul class="info-list">
        <li>
          <i class="fas fa-check-circle text-success"></i>
          WhatsApp está conectado y funcionando correctamente
        </li>
        <li>
          <i class="fas fa-bell"></i>
          Las notificaciones se enviarán automáticamente a los usuarios configurados
        </li>
        <li>
          <i class="fas fa-clock"></i>
          La sesión se mantendrá activa hasta que cierres sesión manualmente
        </li>
        <li v-if="status.queueLength > 0">
          <i class="fas fa-envelope"></i>
          Mensajes en cola: <strong>{{ status.queueLength }}</strong>
        </li>
      </ul>
      
      <button @click="disconnect" class="btn-disconnect" :disabled="disconnecting">
        <i class="fas fa-sign-out-alt"></i>
        {{ disconnecting ? 'Desconectando...' : 'Desconectar WhatsApp' }}
      </button>
    </div>

    <!-- Card de ayuda -->
    <div class="help-card">
      <h3>
        <i class="fas fa-question-circle"></i>
        ¿Necesitas ayuda?
      </h3>
      <div class="help-content">
        <p><strong>¿Por qué se desconecta WhatsApp?</strong></p>
        <p>WhatsApp puede desconectarse automáticamente si:</p>
        <ul>
          <li>Cambias de red WiFi o IP</li>
          <li>El servidor se reinicia</li>
          <li>Hay problemas de conexión a internet</li>
          <li>Cierras sesión desde el teléfono</li>
        </ul>
        
        <p class="mt-3"><strong>¿Cómo volver a conectar?</strong></p>
        <p>Simplemente actualiza esta página y escanea el nuevo código QR que aparecerá.</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from '../utils/axios';

export default {
  name: 'WhatsAppConfigView',
  data() {
    return {
      status: {
        enabled: false,
        connected: false,
        connecting: false,
        queueLength: 0,
        hasQR: false
      },
      loading: false,
      disconnecting: false,
      qrUrl: `${import.meta.env.VITE_API_URL}/api/whatsapp/qr?format=html`,
      refreshInterval: null
    };
  },
  computed: {
    showQR() {
      return this.status.enabled && !this.status.connected && this.status.hasQR;
    },
    statusClass() {
      if (!this.status.enabled) return 'status-disabled';
      if (this.status.connected) return 'status-connected';
      if (this.status.connecting) return 'status-connecting';
      return 'status-disconnected';
    },
    statusIcon() {
      if (!this.status.enabled) return 'fas fa-ban';
      if (this.status.connected) return 'fas fa-check-circle';
      if (this.status.connecting) return 'fas fa-spinner fa-spin';
      return 'fas fa-exclamation-triangle';
    },
    statusTitle() {
      if (!this.status.enabled) return 'WhatsApp Deshabilitado';
      if (this.status.connected) return 'WhatsApp Conectado';
      if (this.status.connecting) return 'Conectando...';
      return 'WhatsApp Desconectado';
    },
    statusMessage() {
      if (!this.status.enabled) return 'El servicio de WhatsApp está deshabilitado en el servidor';
      if (this.status.connected) return 'El servicio está funcionando correctamente';
      if (this.status.connecting) return 'Estableciendo conexión con WhatsApp...';
      return 'Escanea el código QR para conectar';
    }
  },
  mounted() {
    this.loadStatus();
    // Actualizar estado cada 5 segundos cuando no está conectado
    this.refreshInterval = setInterval(() => {
      if (!this.status.connected) {
        this.loadStatus();
      }
    }, 5000);
  },
  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },
  methods: {
    async loadStatus() {
      try {
        this.loading = true;
        const response = await axios.get('/api/whatsapp/status');
        this.status = response.data.status;
      } catch (error) {
        console.error('Error loading WhatsApp status:', error);
        this.$toast?.error('Error al cargar el estado de WhatsApp');
      } finally {
        this.loading = false;
      }
    },
    async refreshStatus() {
      await this.loadStatus();
      // Recargar iframe del QR
      if (this.showQR) {
        const iframe = this.$el.querySelector('.qr-iframe');
        if (iframe) {
          iframe.src = iframe.src;
        }
      }
    },
    async disconnect() {
      if (!confirm('¿Estás seguro de que deseas desconectar WhatsApp? Tendrás que volver a escanear el código QR.')) {
        return;
      }
      
      try {
        this.disconnecting = true;
        await axios.post('/api/whatsapp/disconnect');
        this.$toast?.success('WhatsApp desconectado correctamente');
        await this.loadStatus();
      } catch (error) {
        console.error('Error disconnecting WhatsApp:', error);
        this.$toast?.error('Error al desconectar WhatsApp');
      } finally {
        this.disconnecting = false;
      }
    }
  }
};
</script>

<style scoped>
.whatsapp-config-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  color: #25D366;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.page-header h1 i {
  font-size: 2.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

/* Status Card */
.status-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-left: 5px solid #ccc;
}

.status-card.status-connected {
  border-left-color: #25D366;
  background: linear-gradient(135deg, #ffffff 0%, #f0fff4 100%);
}

.status-card.status-disconnected {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #ffffff 0%, #fffbeb 100%);
}

.status-card.status-connecting {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #ffffff 0%, #eff6ff 100%);
}

.status-card.status-disabled {
  border-left-color: #6b7280;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.status-icon {
  font-size: 3rem;
}

.status-connected .status-icon {
  color: #25D366;
}

.status-disconnected .status-icon {
  color: #f59e0b;
}

.status-connecting .status-icon {
  color: #3b82f6;
}

.status-disabled .status-icon {
  color: #6b7280;
}

.status-info {
  flex: 1;
}

.status-info h3 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.status-info p {
  color: #666;
  margin: 0;
}

.btn-refresh {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: all 0.3s;
}

.btn-refresh:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* QR Card */
.qr-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.qr-header {
  text-align: center;
  margin-bottom: 2rem;
}

.qr-header h3 {
  font-size: 1.5rem;
  color: #25D366;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.qr-header p {
  color: #666;
}

.qr-container {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
}

.qr-iframe {
  width: 100%;
  height: 600px;
  border-radius: 8px;
  background: white;
}

.qr-instructions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.instruction-step {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.step-number {
  background: #25D366;
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
}

.step-text {
  flex: 1;
}

/* Info Card */
.info-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.info-card h3 {
  color: #3b82f6;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1.5rem 0;
}

.info-list li {
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.info-list li:last-child {
  border-bottom: none;
}

.info-list li i {
  font-size: 1.2rem;
}

.text-success {
  color: #25D366;
}

.btn-disconnect {
  padding: 0.75rem 1.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  transition: all 0.3s;
  margin: 0 auto;
}

.btn-disconnect:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-disconnect:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Help Card */
.help-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.help-card h3 {
  color: #f59e0b;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.help-content p {
  margin-bottom: 0.5rem;
}

.help-content ul {
  margin: 0.5rem 0 1rem 1.5rem;
}

.help-content ul li {
  margin-bottom: 0.25rem;
  color: #666;
}

.mt-3 {
  margin-top: 1.5rem;
}

@media (max-width: 768px) {
  .whatsapp-config-view {
    padding: 1rem;
  }
  
  .page-header h1 {
    font-size: 1.5rem;
  }
  
  .qr-iframe {
    height: 400px;
  }
  
  .qr-instructions {
    grid-template-columns: 1fr;
  }
}
</style>
