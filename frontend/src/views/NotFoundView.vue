<template>
    <div class="not-found-layout">
      <v-main class="main-content">
        <v-container class="error-container">
          <div class="error-content">
            <div class="error-icon">
              <v-icon size="120" color="#e2e8f0">mdi-file-search-outline</v-icon>
            </div>
            
            <h1 class="error-title">404</h1>
            <h2 class="error-subtitle">Página no encontrada</h2>
            <p class="error-message">
              La página que buscas no existe o has sido redirigido aquí por un error.
            </p>
            
            <div class="error-actions">
              <v-btn 
                color="primary" 
                size="large"
                @click="goToDashboard"
                class="action-btn"
              >
                <v-icon class="mr-2">mdi-home</v-icon>
                Ir al Dashboard
              </v-btn>
              
              <v-btn 
                variant="outlined"
                size="large"
                @click="goBack"
                class="action-btn ml-4"
              >
                <v-icon class="mr-2">mdi-arrow-left</v-icon>
                Volver Atrás
              </v-btn>
            </div>
            
            <div class="helpful-links">
              <p class="links-title">Enlaces útiles:</p>
              <div class="links-grid">
                <router-link to="/dashboard" class="helpful-link">
                  <v-icon class="mr-2">mdi-view-dashboard</v-icon>
                  Dashboard
                </router-link>
                <router-link to="/invoices" class="helpful-link">
                  <v-icon class="mr-2">mdi-receipt-text</v-icon>
                  Facturas
                </router-link>
                <router-link v-if="authStore.isProveedor" to="/invoices/new" class="helpful-link">
                  <v-icon class="mr-2">mdi-plus</v-icon>
                  Nueva Factura
                </router-link>
                <router-link v-if="authStore.isAdmin" to="/users" class="helpful-link">
                  <v-icon class="mr-2">mdi-account-multiple</v-icon>
                  Usuarios
                </router-link>
              </div>
            </div>
          </div>
        </v-container>
      </v-main>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  
  const router = useRouter()
  const authStore = useAuthStore()
  
  const goToDashboard = () => {
    router.push('/dashboard')
  }
  
  const goBack = () => {
    router.go(-1)
  }
  </script>
  
  <style scoped>
  .not-found-layout {
    min-height: 100vh;
    background: #f8fafc;
  }
  
  .main-content {
    background: #f8fafc;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .error-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .error-content {
    text-align: center;
    padding: 40px 20px;
  }
  
  .error-icon {
    margin-bottom: 32px;
  }
  
  .error-title {
    font-size: 72px;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 16px;
    line-height: 1;
  }
  
  .error-subtitle {
    font-size: 32px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 16px;
  }
  
  .error-message {
    font-size: 18px;
    color: #64748b;
    margin-bottom: 40px;
    line-height: 1.6;
  }
  
  .error-actions {
    margin-bottom: 48px;
  }
  
  .action-btn {
    text-transform: none;
    font-weight: 600;
    height: 48px;
    padding: 0 24px;
  }
  
  .helpful-links {
    margin-top: 48px;
  }
  
  .links-title {
    font-size: 16px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 16px;
  }
  
  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    max-width: 400px;
    margin: 0 auto;
  }
  
  .helpful-link {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 12px 16px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #475569;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s ease;
  }
  
  .helpful-link:hover {
    background: #0f172a;
    color: white;
    border-color: #0f172a;
    transform: translateY(-1px);
  }
  
  @media (max-width: 640px) {
    .error-title {
      font-size: 56px;
    }
    
    .error-subtitle {
      font-size: 24px;
    }
    
    .error-message {
      font-size: 16px;
    }
    
    .error-actions {
      flex-direction: column;
      gap: 12px;
    }
    
    .action-btn {
      width: 100%;
      margin: 0 !important;
    }
    
    .links-grid {
      grid-template-columns: 1fr;
    }
  }
  </style>