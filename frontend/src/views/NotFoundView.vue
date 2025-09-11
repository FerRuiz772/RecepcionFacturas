<template>
    <div class="not-found-layout">
      <v-main class="main-content">
        <v-container class="error-container">
          <div class="error-content">
            <div class="error-icon">
              <v-icon size="120" color="#e2e8f0">mdi-file-search-outline</v-icon>
            </div>
            
            <h1 class="error-title">404</h1>
            <h2 class="error-subtitle">PÃ¡gina no encontrada</h2>
            <p class="error-message">
              La pÃ¡gina que buscas no existe o has sido redirigido aquÃ­ por un error.
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
                Volver AtrÃ¡s
              </v-btn>
            </div>
            
            <div class="helpful-links">
              <p class="links-title">Enlaces Ãºtiles:</p>
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
  import { useNotFound } from '../scripts/not-found.js'
  
  const {
    // Store access
    authStore,
    
    // Functions
    goToDashboard,
    goBack
  } = useNotFound()
  </script>
  
  <style src="../styles/not-found.css" scoped></style>
