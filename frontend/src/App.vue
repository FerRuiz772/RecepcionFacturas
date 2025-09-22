<!--
/**
 * @fileoverview Componente raíz de la aplicación Vue
 * Gestiona el layout principal y la visibilidad del sidebar/topbar según la ruta
 * Aplica la directiva no-accents globalmente y configura el tema principal
 * 
 * @component App
 * @description Componente principal que contiene la estructura base de la aplicación
 * Determina si mostrar el layout completo (sidebar + topbar) o solo el contenido
 * para páginas públicas como login, registro de contraseña, etc.
 */
-->
<template>
  <v-app v-no-accents>
    <!-- Layout completo para páginas autenticadas -->
    <template v-if="showLayout">
      <AppSidebar v-model="drawer" />
      <AppTopBar @toggle-sidebar="toggleDrawer" :drawer-open="drawer" />
      <v-main :class="{ 'with-layout': true }">
        <router-view />
      </v-main>
    </template>
    <!-- Layout simple para páginas públicas -->
    <template v-else>
      <v-main :class="{ 'public-page': true }">
        <router-view />
      </v-main>
    </template>
  </v-app>
</template>

<script setup>
/**
 * @vue/component App
 * @description Componente raíz que gestiona el layout principal de la aplicación
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppSidebar from './components/AppSidebar.vue'
import AppTopBar from './components/AppTopBar.vue'

const route = useRoute()
const authStore = useAuthStore()

/**
 * Estado del drawer/sidebar (abierto/cerrado)
 * @type {Ref<boolean>}
 */
const drawer = ref(false)

/**
 * Alterna el estado del drawer
 * @function toggleDrawer
 */
const toggleDrawer = () => {
  drawer.value = !drawer.value
}

/**
 * Computed que determina si mostrar el layout completo
 * @computed showLayout
 * @returns {boolean} true si debe mostrar sidebar y topbar, false para páginas públicas
 */
const showLayout = computed(() => {
  const publicRoutes = ['Login', 'ForgotPassword', 'ResetPassword']
  return !publicRoutes.includes(route.name)
})

/**
 * Inicialización del componente
 * Carga los datos del usuario si existe un token válido
 */
onMounted(async () => {
  if (authStore.token) {
    try {
      await authStore.loadUserFromToken()
    } catch (error) {
      console.error('Error al cargar usuario:', error)
    }
  }
})
</script>

<style>
/**
 * Estilos globales para el componente principal
 */

/* Fondo por defecto de la aplicación */
.v-main {
  background: #f8fafc;
}

/* Padding superior para páginas con layout completo (compensa el topbar fijo) */
.v-main.with-layout {
  padding-top: 64px !important;
}

/* Estilos para páginas públicas sin layout */
.v-main.public-page {
  padding-top: 0 !important;
  background: transparent !important;
}
</style>