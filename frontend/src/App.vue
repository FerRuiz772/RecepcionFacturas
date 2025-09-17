<template>
  <v-app>
    <!-- Layout principal con sidebar colapsable y topbar -->
    <template v-if="showLayout">
      <!-- Sidebar -->
      <AppSidebar v-model="drawer" />
      
      <!-- App Bar/Topbar -->
      <v-app-bar 
        app 
        color="white" 
        elevation="1" 
        height="64"
        :class="{ 'app-bar-with-drawer': drawer && $vuetify.display.lgAndUp }"
      >
        <!-- Toggle sidebar button -->
        <v-app-bar-nav-icon 
          @click="toggleDrawer" 
          color="#0f172a"
          class="mr-2"
        />
        
        <!-- Breadcrumb o título dinámico -->
        <div class="header-content">
          <div class="header-title">{{ pageTitle }}</div>
          <div class="header-subtitle">{{ pageSubtitle }}</div>
        </div>
        
        <v-spacer />
        
        <!-- Notificaciones -->
        <v-btn icon variant="text" class="notification-btn mr-2">
          <v-badge color="error" content="3" offset-x="12" offset-y="12">
            <v-icon color="#64748b">mdi-bell-outline</v-icon>
          </v-badge>
        </v-btn>
        
        <!-- Menú de usuario -->
        <v-menu offset-y>
          <template v-slot:activator="{ props }">
            <div v-bind="props" class="user-menu-trigger d-flex align-center">
              <v-avatar size="32" class="user-avatar">
                <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
              </v-avatar>
              <div class="user-info d-none d-sm-block ml-3">
                <div class="user-name">{{ authStore.userName }}</div>
                <div class="user-role">{{ roleDisplayName }}</div>
              </div>
              <v-icon color="#64748b" class="ml-2">mdi-chevron-down</v-icon>
            </div>
          </template>
          
          <v-list min-width="200">
            <v-list-item @click="goToProfile">
              <template v-slot:prepend>
                <v-icon color="#64748b" size="20">mdi-account-outline</v-icon>
              </template>
              <v-list-item-title>Mi Perfil</v-list-item-title>
            </v-list-item>
            
            <v-list-item @click="goToSettings">
              <template v-slot:prepend>
                <v-icon color="#64748b" size="20">mdi-cog-outline</v-icon>
              </template>
              <v-list-item-title>Configuración</v-list-item-title>
            </v-list-item>
            
            <v-divider class="my-1" />
            
            <v-list-item @click="logout">
              <template v-slot:prepend>
                <v-icon color="#ef4444" size="20">mdi-logout</v-icon>
              </template>
              <v-list-item-title>Cerrar Sesión</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-app-bar>

      <!-- Contenido principal -->
      <v-main>
        <router-view />
      </v-main>
    </template>
    
    <!-- Sin layout para rutas públicas -->
    <template v-else>
      <router-view />
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useToast } from 'vue-toastification'
import AppSidebar from './components/AppSidebar.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Estado del drawer
const drawer = ref(true)

// Función para toggle del drawer
const toggleDrawer = () => {
  drawer.value = !drawer.value
}

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

// Títulos dinámicos basados en la ruta
const pageTitle = computed(() => {
  const titles = {
    '/dashboard': 'Dashboard',
    '/invoices': 'Gestión de Facturas',
    '/suppliers': 'Proveedores',
    '/users': 'Usuarios',
    '/profile': 'Mi Perfil',
    '/settings': 'Configuración'
  }
  
  // Para rutas dinámicas como /invoices/123
  const basePath = '/' + route.path.split('/')[1]
  return titles[route.path] || titles[basePath] || 'Sistema de Pagos'
})

const pageSubtitle = computed(() => {
  const subtitles = {
    '/dashboard': 'Panel de control principal',
    '/invoices': 'Administra todas las facturas del sistema',
    '/suppliers': 'Gestión de proveedores registrados',
    '/users': 'Administración de usuarios del sistema',
    '/profile': 'Información personal y configuración',
    '/settings': 'Configuración del sistema'
  }
  
  const basePath = '/' + route.path.split('/')[1]
  return subtitles[route.path] || subtitles[basePath] || ''
})

// Información del usuario
const userInitials = computed(() => {
  return authStore.userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'
})

const roleDisplayName = computed(() => {
  const roles = {
    'super_admin': 'Super Admin',
    'admin_contaduria': 'Admin Contaduría',
    'trabajador_contaduria': 'Trabajador Contaduría',
    'proveedor': 'Proveedor'
  }
  return roles[authStore.userRole] || authStore.userRole
})

// Funciones del menú de usuario
const goToProfile = () => {
  router.push('/profile')
}

const goToSettings = () => {
  router.push('/settings')
}

const logout = async () => {
  try {
    await authStore.logout()
    toast.success('Sesión cerrada correctamente')
    router.push('/login')
  } catch (error) {
    toast.error('Error al cerrar sesión')
  }
}

// Responsive: cerrar drawer en móvil cuando cambie la ruta
watch(route, () => {
  if (window.innerWidth <= 960) {
    drawer.value = false
  }
})
</script>

<style scoped>
/* Estilos globales de la aplicación */
* {
  font-family: 'Inter', sans-serif;
}

/* App Bar */
.v-app-bar {
  background: white !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
  transition: all 0.3s ease;
}

.app-bar-with-drawer {
  margin-left: 280px;
}

.header-content {
  margin-left: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.header-subtitle {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

/* Menú de usuario */
.user-menu-trigger {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 12px;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-right: 16px;
}

.user-menu-trigger:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.user-avatar {
  background: #0f172a !important;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.user-role {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

/* Botón de notificaciones */
.notification-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  width: 40px;
  height: 40px;
}

.notification-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

/* Main content */
.v-main {
  background: #f8fafc;
  transition: all 0.3s ease;
}

/* Responsive */
@media (max-width: 1023px) {
  .app-bar-with-drawer {
    margin-left: 0 !important;
  }
  
  .header-subtitle {
    display: none;
  }
  
  .user-info {
    display: none !important;
  }
}

@media (max-width: 599px) {
  .header-title {
    font-size: 14px;
  }
  
  .user-menu-trigger {
    padding: 4px 8px;
    margin-right: 8px;
  }
}
</style>