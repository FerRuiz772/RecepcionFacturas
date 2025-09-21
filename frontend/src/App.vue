<template>
  <v-app v-no-accents>
    <template v-if="showLayout">
      <AppSidebar v-model="drawer" />
      <AppTopBar @toggle-sidebar="toggleDrawer" :drawer-open="drawer" />
      <v-main :class="{ 'with-layout': true }">
        <router-view />
      </v-main>
    </template>
    <template v-else>
      <v-main :class="{ 'public-page': true }">
        <router-view />
      </v-main>
    </template>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import AppSidebar from './components/AppSidebar.vue'
import AppTopBar from './components/AppTopBar.vue'

const route = useRoute()
const authStore = useAuthStore()

const drawer = ref(false)

const toggleDrawer = () => {
  drawer.value = !drawer.value
}

const showLayout = computed(() => {
  const publicRoutes = ['Login', 'ForgotPassword', 'ResetPassword']
  return !publicRoutes.includes(route.name)
})

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
.v-main {
  background: #f8fafc;
}

.v-main.with-layout {
  padding-top: 64px !important;
}

.v-main.public-page {
  padding-top: 0 !important;
  background: transparent !important;
}
</style>