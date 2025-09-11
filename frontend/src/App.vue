<template>
  <v-app>
    <!-- Layout global solo para rutas autenticadas -->
    <template v-if="showLayout">
      <AppSidebar v-model="drawer" />
      <v-main>
        <router-view />
      </v-main>
    </template>
    
    <!-- Sin layout para login y otras rutas públicas -->
    <template v-else>
      <router-view />
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'

const route = useRoute()
const drawer = ref(true)

// Mostrar layout solo en rutas que no sean login
const showLayout = computed(() => {
  const publicRoutes = ['/login', '/']
  return !publicRoutes.includes(route.path)
})
</script>

<style>
* {
  font-family: 'Inter', sans-serif;
}

body {
  margin: 0;
  padding: 0;
}

/* Mover contenido - reducido otro 5% hacia la izquierda */
.v-main {
  padding-left: 8px !important;
  margin-left: 266px !important; /* Reducido 14px (5%) desde 280px */
}

/* En dispositivos móviles mantener padding normal */
@media (max-width: 1023px) {
  .v-main {
    padding-left: 16px !important;
    margin-left: 0 !important;
  }
}
</style>