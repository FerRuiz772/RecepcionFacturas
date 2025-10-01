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
      class="sidebar-toggle mobile-toggle"
    >
      <v-icon>mdi-menu</v-icon>
    </v-app-bar-nav-icon>

    <!-- Toggle sidebar en desktop - MEJORADO -->
    <v-btn 
      v-if="$vuetify.display.lgAndUp"
      @click="toggleSidebar"
      class="sidebar-toggle desktop-toggle"
      variant="text"
      size="small"
    >
      <img src="/slidemenu.png" alt="Menú" class="menu-icon-img">
    </v-btn>

    <v-spacer />

    <!-- Información del usuario y controles (solo en desktop) -->
    <div v-if="$vuetify.display.lgAndUp" class="topbar-user">
      <!-- Menú de usuario - SOLO AVATAR -->
      <v-menu offset-y location="bottom end">
        <template v-slot:activator="{ props }">
          <div 
            class="user-avatar-trigger"
            v-bind="props"
          >
            <v-avatar size="40" class="user-avatar">
              <span class="text-white font-weight-bold">{{ userInitials }}</span>
            </v-avatar>
            <!-- Badge de estado -->
            <div class="user-status-indicator"></div>
          </div>
        </template>
        
        <v-list class="user-menu" min-width="220">
          <!-- Header del menú con información del usuario -->
          <v-list-item class="user-menu-header">
            <template v-slot:prepend>
              <v-avatar size="44" class="user-avatar-large">
                <span class="text-white font-weight-bold">{{ userInitials }}</span>
              </v-avatar>
            </template>
            <v-list-item-title class="user-menu-name">
              {{ authStore.userName }}
            </v-list-item-title>
            <v-list-item-subtitle class="user-menu-role">
              {{ roleDisplayName }}
            </v-list-item-subtitle>
          </v-list-item>
          
          <v-divider class="my-2" />
          
          <v-list-item @click="goToProfile" class="user-menu-item">
            <template v-slot:prepend>
              <v-icon color="#64748b" size="20">mdi-account-cog-outline</v-icon>
            </template>
            <v-list-item-title>Configuración de cuenta</v-list-item-title>
          </v-list-item>
          
          <v-divider class="my-2" />
          
          <v-list-item @click="logout" class="user-menu-item logout-item">
            <template v-slot:prepend>
              <v-icon color="#ef4444" size="20">mdi-logout</v-icon>
            </template>
            <v-list-item-title>Cerrar Sesión</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </div>

    <!-- Versión móvil del menú de usuario -->
    <div v-if="$vuetify.display.mdAndDown" class="topbar-user-mobile">
      <v-menu offset-y>
        <template v-slot:activator="{ props }">
          <v-avatar 
            size="36" 
            class="user-avatar-mobile"
            v-bind="props"
          >
            <span class="text-white font-weight-bold">{{ userInitials }}</span>
          </v-avatar>
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
  padding-left: 16px !important;
  padding-right: 16px !important;
}

/* Ajustar posición cuando el drawer está abierto en desktop */
.topbar--with-drawer {
  left: 0 !important;
  width: 100% !important;
}

/* Botón de toggle del sidebar - MEJORADO */
.sidebar-toggle {
  margin-right: 8px;
}

.mobile-toggle {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-left: 8px !important;
}

.desktop-toggle {
  border-radius: 8px !important;
  background: transparent !important;
  color: #000000 !important; /* Color negro/gris oscuro */
  border: 1px solid #e2e8f0 !important;
  min-width: 44px !important;
  height: 44px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin-left: 16px !important; /* Separación del borde izquierdo */
}

.desktop-toggle:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.desktop-toggle:active {
  transform: translateY(0);
}

/* Contenedor del usuario */
.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 16px !important; 
}

/* Trigger del avatar - MEJORADO */
.user-avatar-trigger {
  position: relative;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.user-avatar-trigger:hover {
  border-color: #e2e8f0;
  background: #f8fafc;
  transform: scale(1.05);
}

.user-avatar {
  background: linear-gradient(135deg, #0f172a, #1e293b) !important;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
  transition: all 0.3s ease;
}

.user-avatar-large {
  background: linear-gradient(135deg, #0f172a, #1e293b) !important;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.2);
}

/* Indicador de estado (punto verde) */
.user-status-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #10b981;
  border: 2px solid white;
  border-radius: 50%;
  z-index: 2;
}

/* Menú de usuario - MEJORADO */
.user-menu {
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-top: 8px;
  z-index: 2000 !important;
}

.user-menu-header {
  background: linear-gradient(135deg, #f8fafc, #f0f4f1);
  padding: 20px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.user-menu-name {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}

.user-menu-role {
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
  line-height: 1.2;
}

.user-menu-item {
  padding: 12px 16px;
  transition: all 0.2s ease;
  cursor: pointer;
  border-radius: 8px;
  margin: 2px 8px;
}

.user-menu-item:hover {
  background: #f8fafc !important;
  transform: translateX(4px);
}

.logout-item:hover {
  background: #fef2f2 !important;
  color: #ef4444;
}

/* Versión móvil */
.topbar-user-mobile {
  display: flex;
  align-items: center;
  margin-right: 12px !important;
}

.user-avatar-mobile {
  background: linear-gradient(135deg, #0f172a, #1e293b) !important;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
}

/* Responsive */
@media (max-width: 1023px) {
  .topbar--with-drawer {
    left: 0 !important;
    width: 100% !important;
  }
  
  .topbar {
    padding: 0 8px !important;
  }
}

@media (max-width: 599px) {
  .topbar {
    padding: 0 4px !important;
  }
}

/* Estados de focus mejorados */
.user-avatar-trigger:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.user-menu-item:focus {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

/* Animaciones mejoradas */
.user-avatar-trigger,
.user-menu-item {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Efecto de pulso sutil en el avatar */
@keyframes subtle-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.user-avatar-trigger:hover .user-avatar {
  animation: subtle-pulse 0.6s ease-in-out;
}

.menu-icon-img {
  width: 24px;
  height: 24px;
  filter: brightness(0); /* Para asegurar que sea negro */
}

</style>