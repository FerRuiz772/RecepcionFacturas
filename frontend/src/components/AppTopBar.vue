<template>
  <v-app-bar 
    app 
    class="topbar" 
    height="64"
    flat
    color="white"
  >
    <!-- Toggle sidebar en móvil -->
    <v-app-bar-nav-icon 
      v-if="$vuetify.display.mdAndDown"
      @click="toggleSidebar"
      class="sidebar-toggle"
    >
      <v-icon>mdi-menu</v-icon>
    </v-app-bar-nav-icon>

    <!-- Breadcrumbs/Título de página -->
    <div class="topbar-content">
      <div class="page-title">
        <h1 class="topbar-title">{{ pageTitle }}</h1>
        <div v-if="breadcrumbs.length > 1" class="breadcrumbs">
          <span 
            v-for="(crumb, index) in breadcrumbs" 
            :key="index"
            class="breadcrumb-item"
          >
            {{ crumb }}
            <v-icon 
              v-if="index < breadcrumbs.length - 1" 
              size="16" 
              class="breadcrumb-separator"
            >
              mdi-chevron-right
            </v-icon>
          </span>
        </div>
      </div>
    </div>

    <v-spacer />

    <!-- Información del usuario y controles (solo en desktop) -->
    <div v-if="$vuetify.display.lgAndUp" class="topbar-user">
      <!-- Información del usuario -->
      <div class="user-info">
        <div class="user-details">
          <div class="user-name">{{ authStore.userName }}</div>
          <div class="user-role">{{ roleDisplayName }}</div>
        </div>
        <v-avatar size="40" class="user-avatar">
          <span class="text-white font-weight-bold">{{ userInitials }}</span>
        </v-avatar>
      </div>

      <!-- Menú de usuario -->
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-btn 
            icon 
            variant="text" 
            v-bind="props"
            class="user-menu-toggle"
          >
            <v-icon>mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        
        <v-list class="user-menu" min-width="200">
          <v-list-item @click="goToProfile" class="user-menu-item">
            <template v-slot:prepend>
              <v-icon color="#64748b" size="20">mdi-account-outline</v-icon>
            </template>
            <v-list-item-title>Mi Perfil</v-list-item-title>
          </v-list-item>
          
          <v-list-item @click="goToSettings" class="user-menu-item">
            <template v-slot:prepend>
              <v-icon color="#64748b" size="20">mdi-cog-outline</v-icon>
            </template>
            <v-list-item-title>Configuración</v-list-item-title>
          </v-list-item>
          
          <v-divider class="my-1" />
          
          <v-list-item @click="logout" class="user-menu-item logout-item">
            <template v-slot:prepend>
              <v-icon color="#ef4444" size="20">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>
  </v-app-bar>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const emit = defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Función para toggle del sidebar
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

// Título de página basado en la ruta
const pageTitle = computed(() => {
  const titles = {
    '/dashboard': 'Dashboard',
    '/invoices': 'Gestión de Facturas',
    '/invoices/new': 'Nueva Factura',
    '/suppliers': 'Gestión de Proveedores',
    '/users': 'Gestión de Usuarios',
    '/accounting-documents': 'Documentos Contables'
  }
  
  // Buscar coincidencia exacta primero
  if (titles[route.path]) {
    return titles[route.path]
  }
  
  // Buscar coincidencia parcial
  for (const [path, title] of Object.entries(titles)) {
    if (route.path.startsWith(path) && path !== '/') {
      return title
    }
  }
  
  return 'Sistema de Recepción de Facturas'
})

// Breadcrumbs basados en la ruta
const breadcrumbs = computed(() => {
  const path = route.path
  const crumbs = ['Inicio']
  
  if (path.startsWith('/invoices')) {
    crumbs.push('Facturas')
    if (path.includes('/new')) {
      crumbs.push('Nueva Factura')
    } else if (path.includes('/edit/')) {
      crumbs.push('Editar Factura')
    } else if (path.match(/\/\d+$/)) {
      crumbs.push('Detalle')
    }
  } else if (path.startsWith('/suppliers')) {
    crumbs.push('Proveedores')
  } else if (path.startsWith('/users')) {
    crumbs.push('Usuarios')
  } else if (path.startsWith('/accounting-documents')) {
    crumbs.push('Documentos Contables')
  }
  
  return crumbs
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
</script>

<style scoped>
.topbar {
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
  z-index: 1050 !important;
}

.sidebar-toggle {
  margin-right: 8px;
}

.topbar-content {
  display: flex;
  align-items: center;
  flex: 1;
}

.page-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.topbar-title {
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
  line-height: 1.2;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #64748b;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-separator {
  color: #cbd5e1;
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.user-details {
  text-align: right;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.user-role {
  font-size: 12px;
  color: #64748b;
  line-height: 1.2;
}

.user-avatar {
  background: #0f172a !important;
  flex-shrink: 0;
}

.user-menu-toggle {
  color: #64748b;
  transition: all 0.2s ease;
}

.user-menu-toggle:hover {
  color: #0f172a;
  background: #f1f5f9 !important;
}

.user-menu {
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.user-menu-item {
  padding: 12px 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.user-menu-item:hover {
  background: #f8fafc !important;
}

.logout-item:hover {
  background: #fef2f2 !important;
}

/* Responsive */
@media (max-width: 960px) {
  .topbar-title {
    font-size: 18px;
  }
  
  .breadcrumbs {
    display: none;
  }
}

@media (max-width: 599px) {
  .topbar-title {
    font-size: 16px;
  }
}

/* Estados de focus */
.user-menu-toggle:focus,
.user-menu-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Animaciones */
.user-info,
.user-menu-toggle,
.user-menu-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>