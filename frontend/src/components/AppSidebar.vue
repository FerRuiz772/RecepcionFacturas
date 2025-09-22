<!--
/**
 * @fileoverview Componente de navegación lateral (sidebar) del sistema PayQuetzal
 * Muestra menú adaptativo basado en permisos del usuario autenticado
 * Incluye branding y navegación principal de la aplicación
 * 
 * @component AppSidebar
 * @description Barra lateral de navegación que se adapta según el rol del usuario
 * Implementa sistema de permisos granular y navegación responsive
 * 
 * @props {Boolean} modelValue - Estado del drawer (abierto/cerrado)
 * @emits update:modelValue - Actualiza el estado del drawer
 */
-->
<template>
  <v-navigation-drawer
    v-model="drawerModel"
    app
    class="sidebar"
    width="280"
    :temporary="true"
  >
    <!-- Header del sidebar con branding -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <v-icon size="18" color="#0f172a">mdi-file-document-multiple</v-icon>
        </div>
        <div class="sidebar-brand-text">
          <div class="sidebar-title">PayQuetzal</div>
        </div>
      </div>
      <p class="sidebar-subtitle">Sistema de Gestión de Pagos</p>
    </div>

    <!-- Lista de navegación filtrada por permisos -->
    <v-list nav class="sidebar-nav pt-4">
      <v-list-item
        v-for="item in filteredMenuItems"
        :key="item.title"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item--active': isActiveRoute(item.to) }"
      >
        <template v-slot:prepend>
          <v-icon :icon="item.icon" class="nav-icon" />
        </template>

        <v-list-item-title class="nav-title">
          {{ item.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
/**
 * @vue/component AppSidebar
 * @description Componente de navegación lateral con sistema de permisos
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

/**
 * Props del componente
 * @typedef {Object} Props
 * @property {Boolean} modelValue - Estado del drawer (abierto/cerrado)
 */
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: true
  }
})

/**
 * Eventos emitidos por el componente
 * @typedef {Object} Emits
 * @property {Function} update:modelValue - Actualiza el estado del drawer
 */
const emit = defineEmits(['update:modelValue'])

const route = useRoute()
const authStore = useAuthStore()

/**
 * Computed bidireccional para manejar el estado del drawer
 * @type {ComputedRef<boolean>}
 */
const drawerModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/**
 * Configuración de elementos del menú con permisos asociados
 * @type {Array<Object>}
 * @property {string} title - Título del elemento del menú
 * @property {string} icon - Icono MDI del elemento
 * @property {string} to - Ruta de navegación
 * @property {Function} permission - Función que verifica permisos
 */
const menuItems = [
  { 
    title: 'Dashboard', 
    icon: 'mdi-view-dashboard-outline', 
    to: '/dashboard', 
    permission: () => authStore.canViewDashboard
  },
  { 
    title: 'Facturas', 
    icon: 'mdi-receipt-text-outline', 
    to: '/invoices', 
    permission: () => authStore.canViewInvoices
  },
  { 
    title: 'Proveedores', 
    icon: 'mdi-account-group-outline', 
    to: '/suppliers', 
    permission: () => authStore.canViewSuppliers
  },
  { 
    title: 'Usuarios', 
    icon: 'mdi-account-multiple-outline', 
    to: '/users', 
    permission: () => authStore.canViewUsers
  }
]

/**
 * Computed que filtra elementos del menú según permisos del usuario
 * Los super administradores ven todos los elementos
 * @computed filteredMenuItems
 * @returns {Array<Object>} Elementos del menú visibles para el usuario actual
 */
const filteredMenuItems = computed(() => {
  return menuItems.filter(item => {
    if (authStore.isSuperAdmin) return true
    return item.permission()
  })
})

/**
 * Determina si una ruta está activa comparando con la ruta actual
 * @function isActiveRoute
 * @param {string} itemPath - Ruta del elemento del menú
 * @returns {boolean} true si la ruta está activa
 */
const isActiveRoute = (itemPath) => {
  const currentPath = route.path
  if (itemPath === '/dashboard') {
    return currentPath === '/dashboard'
  }
  return currentPath.startsWith(itemPath)
}
</script>

<style scoped>
.sidebar {
  background: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  z-index: 1200 !important;
}

.sidebar-header {
  background: #0f172a;
  color: white;
  padding: 24px 20px;
  position: relative;
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
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.025em;
  line-height: 1.2;
}

.sidebar-subtitle {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
  line-height: 1.3;
}

.sidebar-nav {
  padding-top: 16px !important;
}

.nav-item {
  margin: 2px 12px 6px 12px;
  border-radius: 8px;
  color: #475569;
  font-weight: 500;
  transition: all 0.2s ease;
  min-height: 48px;
}

.nav-item:hover {
  background: #e2e8f0 !important;
  color: #1e293b !important;
}

.nav-item--active {
  background: #0f172a !important;
  color: white !important;
}

.nav-item--active:hover {
  background: #1e293b !important;
  color: white !important;
}

.nav-icon {
  font-size: 20px !important;
  margin-right: 12px;
}

.nav-title {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

@media (max-width: 599px) {
  .sidebar-header {
    padding: 20px 16px;
  }

  .sidebar-title {
    font-size: 16px;
  }

  .sidebar-subtitle {
    font-size: 12px;
  }
}
</style>