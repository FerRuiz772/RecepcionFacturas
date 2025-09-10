<template>
  <v-navigation-drawer 
    v-model="drawerModel" 
    app 
    class="sidebar" 
    width="280"
    :permanent="$vuetify.display.lgAndUp"
    :temporary="$vuetify.display.mdAndDown"
  >
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <v-icon size="18" color="#0f172a">mdi-file-document-multiple</v-icon>
        </div>
        <div>
          <div class="sidebar-title">Recepción Facturas</div>
        </div>
      </div>
      <p class="sidebar-subtitle">Sistema de Gestión de Pagos</p>
    </div>
    
    <v-list nav class="pt-4">
      <v-list-item
        v-for="item in filteredMenuItems"
        :key="item.title"
        :to="item.to"
        class="nav-item"
        rounded="lg"
        :class="{ 'nav-item--active': isActiveRoute(item.to) }"
        exact
      >
        <template v-slot:prepend>
          <v-icon>{{ item.icon }}</v-icon>
        </template>
        <v-list-item-title>{{ item.title }}</v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Información del usuario en el sidebar (móvil) -->
    <template v-if="$vuetify.display.mdAndDown">
      <v-divider class="my-4"></v-divider>
      <div class="sidebar-user-info">
        <div class="d-flex align-center pa-4">
          <v-avatar size="40" style="background: #0f172a;">
            <span class="text-white font-weight-bold">{{ userInitials }}</span>
          </v-avatar>
          <div class="ml-3">
            <div class="sidebar-user-name">{{ authStore.userName }}</div>
            <div class="sidebar-user-role">{{ roleDisplayName }}</div>
          </div>
        </div>
        
        <v-list dense>
          <v-list-item @click="goToProfile" class="sidebar-menu-item">
            <template v-slot:prepend>
              <v-icon color="#64748b" size="20">mdi-account-outline</v-icon>
            </template>
            <v-list-item-title>Mi Perfil</v-list-item-title>
          </v-list-item>
          
          <v-list-item @click="goToSettings" class="sidebar-menu-item">
            <template v-slot:prepend>
              <v-icon color="#64748b" size="20">mdi-cog-outline</v-icon>
            </template>
            <v-list-item-title>Configuración</v-list-item-title>
          </v-list-item>
          
          <v-list-item @click="logout" class="sidebar-menu-item">
            <template v-slot:prepend>
              <v-icon color="#ef4444" size="20">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Computed para el v-model del drawer
const drawerModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Definición de elementos del menú con permisos específicos
const menuItems = [
  { 
    title: 'Dashboard', 
    icon: 'mdi-view-dashboard-outline', 
    to: '/dashboard', 
    roles: ['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'],
    exactMatch: true
  },
  { 
    title: 'Facturas', 
    icon: 'mdi-receipt-text-outline', 
    to: '/invoices', 
    roles: ['super_admin', 'admin_contaduria', 'trabajador_contaduria', 'proveedor'],
    exactMatch: false
  },
  { 
    title: 'Proveedores', 
    icon: 'mdi-account-group-outline', 
    to: '/suppliers', 
    roles: ['super_admin', 'admin_contaduria'],
    exactMatch: false
  },
  { 
    title: 'Usuarios', 
    icon: 'mdi-account-multiple-outline', 
    to: '/users', 
    roles: ['super_admin', 'admin_contaduria'],
    exactMatch: false
  }
]

// Filtrado de elementos del menú basado en el rol del usuario
const filteredMenuItems = computed(() => {
  console.log('Rol actual del usuario:', authStore.userRole)
  console.log('Todos los items del menú:', menuItems)
  
  const filtered = menuItems.filter(item => {
    const hasPermission = item.roles.includes(authStore.userRole)
    console.log(`Item: ${item.title}, Roles permitidos: ${item.roles}, Usuario: ${authStore.userRole}, Tiene permiso: ${hasPermission}`)
    return hasPermission
  })
  
  console.log('Items filtrados:', filtered)
  return filtered
})

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

// Función para determinar si una ruta está activa
const isActiveRoute = (itemPath) => {
  const currentPath = route.path
  
  // Para el dashboard, coincidencia exacta
  if (itemPath === '/dashboard') {
    return currentPath === '/dashboard'
  }
  
  // Para otras rutas, verificar si la ruta actual comienza con el path del item
  return currentPath.startsWith(itemPath)
}

const goToProfile = () => {
  toast.info('Funcionalidad de perfil en desarrollo')
  // Cerrar sidebar en móvil
  if (window.innerWidth <= 960) {
    drawerModel.value = false
  }
}

const goToSettings = () => {
  toast.info('Funcionalidad de configuración en desarrollo')
  // Cerrar sidebar en móvil
  if (window.innerWidth <= 960) {
    drawerModel.value = false
  }
}

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  background: #f8fafc !important;
  border-right: 1px solid #e2e8f0;
}

.sidebar-header {
  background: #0f172a;
  color: white;
  padding: 24px 20px;
  border-radius: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.sidebar-logo {
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
}

.sidebar-subtitle {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
}

.nav-item {
  margin: 4px 12px;
  border-radius: 8px;
  color: #475569;
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: #e2e8f0;
}

.nav-item--active {
  background: #0f172a !important;
  color: white !important;
}

.nav-item--active:hover {
  background: #1e293b !important;
}

/* Información del usuario en sidebar móvil */
.sidebar-user-info {
  background: #f1f5f9;
  margin: 16px 12px;
  border-radius: 8px;
  overflow: hidden;
}

.sidebar-user-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  line-height: 1.2;
}

.sidebar-user-role {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.sidebar-menu-item {
  padding: 8px 16px;
  min-height: 40px;
  border-radius: 6px;
  margin: 2px 8px;
  transition: background-color 0.2s ease;
}

.sidebar-menu-item:hover {
  background: #e2e8f0;
}

/* Responsive adjustments */
@media (max-width: 960px) {
  .sidebar {
    z-index: 1000;
  }
}

/* Animaciones suaves */
.nav-item,
.sidebar-menu-item {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Estados de focus para accesibilidad */
.nav-item:focus,
.sidebar-menu-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>