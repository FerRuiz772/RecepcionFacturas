<template>
  <v-app>
    <!-- Layout principal con sidebar colapsable y topbar -->
    <template v-if="showLayout">
      <!-- Sidebar -->
      <AppSidebar v-model="drawer" />
      
      <!-- App Bar/Topbar -->
      <AppTopBar @toggle-sidebar="toggleDrawer" :drawer-open="drawer" />

      <!-- Contenido principal -->
      <v-main :class="{ 'main-with-drawer': drawer && $vuetify.display.lgAndUp }">
        <router-view />
      </v-main>
    </template>
    
    <!-- Sin layout para rutas públicas -->
    <template v-else>
      <v-main class="public-main">
        <router-view />
      </v-main>
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useToast } from 'vue-toastification'
import AppSidebar from './components/AppSidebar.vue'
import AppTopBar from './components/AppTopBar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Estado del drawer - iniciar cerrado por defecto
const drawer = ref(false)

// Función para toggle del drawer
const toggleDrawer = () => {
  drawer.value = !drawer.value
}

// Inicializar drawer según el tamaño de pantalla
const initializeDrawer = () => {
  // Siempre iniciar cerrado para que sea un overlay
  drawer.value = false
}

// Inicializar al montar el componente
onMounted(() => {
  initializeDrawer()
  window.addEventListener('resize', () => {
    // Cerrar el drawer al cambiar tamaño de pantalla
    if (window.innerWidth < 1024) {
      drawer.value = false
    }
  })
})

// Mostrar layout solo en rutas autenticadas
const showLayout = computed(() => {
  const publicRoutes = ['/login', '/', '/register', '/forgot-password']
  const currentPath = route.path
  
  // Verificar rutas públicas exactas
  if (publicRoutes.includes(currentPath)) return false
  
  // Verificar rutas dinámicas de reset password (incluye token)
  if (currentPath.startsWith('/reset-password/')) return false
  
  return true
})

// Responsive: cerrar drawer en móvil cuando cambie la ruta
watch(route, () => {
  // Cerrar el drawer al navegar a una nueva ruta
  drawer.value = false
})
</script>

<style scoped>
/* Estilos globales de la aplicación */
* {
  font-family: 'Inter', sans-serif;
}

/* Main content */

/* Main content: siempre visible y alineado */
.v-main {
  background: #f8fafc;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding-top: 64px !important; /* Espacio para el topbar fijo */
  min-height: calc(100vh - 64px) !important;
  box-sizing: border-box;
  margin-left: 0 !important; /* Contenido nunca se mueve a la derecha */
}

/* El contenido siempre ocupa todo el ancho disponible */
.main-with-drawer {
  margin-left: 0 !important; /* Sin desplazamiento lateral */
}

/* Páginas públicas sin padding del topbar */
.public-main {
  background: transparent !important;
  padding: 0 !important;
  margin: 0 !important;
  min-height: 100vh !important;
  height: 100vh !important;
}

.public-main :deep(.v-main__wrap) {
  padding: 0 !important;
  margin: 0 !important;
  height: 100vh !important;
}

/* Compensar altura del topbar fijo */
:deep(.v-main__wrap) {
  padding-top: 0 !important;
}

/* Sin padding para páginas públicas */
.public-main :deep(.v-main__wrap) {
  padding-top: 0 !important;
}

/* Responsive: sin margen lateral en tablet/móvil */
@media (max-width: 1023px) {
  .main-with-drawer {
    margin-left: 0 !important;
  }
  
  .v-main {
    padding-top: 56px !important;
    min-height: calc(100vh - 56px) !important;
    margin-left: 0 !important; /* Asegurar que no hay margen en tablet/móvil */
  }
}

@media (max-width: 599px) {
  .v-main {
    padding-top: 48px !important;
    min-height: calc(100vh - 48px) !important;
  }
}
</style>