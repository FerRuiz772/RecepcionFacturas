<!--
/**
 * @fileoverview Barra superior de navegación del sistema PayQuetzal
 * Incluye toggle del sidebar, información del usuario y menú de opciones
 * Responsive y adapta su comportamiento según el tamaño de pantalla
 * 
 * @component AppTopBar
 * @description Barra de navegación superior con información del usuario y controles
 * Se adapta al estado del sidebar y proporciona acceso rápido a funciones del usuario
 * 
 * @props {Boolean} drawerOpen - Estado del drawer/sidebar (abierto/cerrado)
 * @emits toggle-sidebar - Evento para alternar el estado del sidebar
 */
-->
<template>
  <v-app-bar 
    app 
    fixed
    class="topbar" 
    :class="{ 'topbar--with-drawer': drawerOpen && $vuetify.display.lgAndUp }"
    height="64"
    flat
    color="white"
    elevation="1"
    style="position: fixed !important; top: 0 !important; z-index: 1050 !important;"
  >
    <!-- Toggle sidebar en móvil -->
    <v-app-bar-nav-icon 
      v-if="$vuetify.display.mdAndDown"
      @click="toggleSidebar"
      class="sidebar-toggle"
    >
      <v-icon>mdi-menu</v-icon>
    </v-app-bar-nav-icon>

    <!-- Toggle sidebar en desktop -->
    <v-app-bar-nav-icon 
      v-if="$vuetify.display.lgAndUp"
      @click="toggleSidebar"
      class="sidebar-toggle desktop-toggle"
    >
      <v-icon>{{ drawerOpen ? 'mdi-menu-open' : 'mdi-menu' }}</v-icon>
    </v-app-bar-nav-icon>

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
/**
 * @vue/component AppTopBar
 * @description Barra superior de navegación con información del usuario
 */
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'

/**
 * Props del componente
 * @typedef {Object} Props
 * @property {Boolean} drawerOpen - Estado del drawer/sidebar (abierto/cerrado)
 */
const props = defineProps({
  drawerOpen: {
    type: Boolean,
    default: false
  }
})

/**
 * Eventos emitidos por el componente
 * @typedef {Object} Emits
 * @property {Function} toggle-sidebar - Evento para alternar el estado del sidebar
 */
const emit = defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

/**
 * Emite evento para alternar el estado del sidebar
 * @function toggleSidebar
 */
const toggleSidebar = () => {
  emit('toggle-sidebar')
}

/**
 * Computed que genera las iniciales del usuario
 * @computed userInitials
 * @returns {string} Iniciales del nombre del usuario en mayúsculas
 */
const userInitials = computed(() => {
  return authStore.userName
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U'
})

/**
 * Computed que convierte el rol del usuario a formato legible
 * @computed roleDisplayName
 * @returns {string} Nombre del rol en formato para mostrar
 */
const roleDisplayName = computed(() => {
  const roles = {
    'super_admin': 'Super Admin',
    'admin_contaduria': 'Admin Contaduría',
    'trabajador_contaduria': 'Trabajador Contaduría',
    'proveedor': 'Proveedor'
  }
  return roles[authStore.userRole] || authStore.userRole
})

/**
 * Navega a la página de perfil del usuario
 * @function goToProfile
 */
const goToProfile = () => {
  router.push('/profile')
}

/**
 * Cierra la sesión del usuario y redirige al login
 * @async
 * @function logout
 */
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
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  border-bottom: 1px solid #e2e8f0 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08) !important;
  z-index: 1050 !important;
  background: rgba(255, 255, 255, 0.95) !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

/* Ajustar posición cuando el drawer está abierto en desktop */
.topbar--with-drawer {
  left: 0 !important; /* El topbar siempre empieza desde la izquierda */
  width: 100% !important; /* Y siempre ocupa el ancho completo */
}

/* Transición suave para el cambio de estado */
@media (min-width: 1024px) {
  .topbar {
    transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
}

.sidebar-toggle {
  margin-right: 8px;
}

.desktop-toggle {
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.desktop-toggle:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
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
  margin-top: 8px;
  z-index: 2000 !important;
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
@media (max-width: 1023px) {
  /* En tablet y móvil, el topbar siempre ocupa el ancho completo */
  .topbar--with-drawer {
    left: 0 !important;
    width: 100% !important;
  }
  
  .topbar {
    padding: 0 8px !important;
  }
}

@media (max-width: 959px) {
  /* En móvil, el drawer es temporal, así que el topbar siempre es full width */
  .topbar--with-drawer {
    left: 0 !important;
    width: 100% !important;
  }
}

@media (max-width: 599px) {
  .topbar {
    padding: 0 4px !important;
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
