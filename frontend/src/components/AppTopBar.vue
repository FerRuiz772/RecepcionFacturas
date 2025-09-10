<template>
  <!-- App Bar -->
  <v-app-bar app class="app-bar" height="64" elevation="0">
    <!-- Botón hamburguesa personalizado para móviles -->
    <v-btn
      icon
      @click="toggleSidebar"
      class="hamburger-btn ml-2"
      v-if="$vuetify.display.mdAndDown"
    >
      <div class="hamburger-icon">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </div>
    </v-btn>
    
    <v-spacer></v-spacer>
    
    <!-- Notificaciones -->
    <v-menu
      v-model="notificationMenu"
      offset-y
      max-width="400"
      close-on-content-click
    >
      <template v-slot:activator="{ props }">
        <v-btn 
          icon 
          class="notification-btn"
          v-bind="props"
        >
          <v-badge 
            :color="unreadCount > 0 ? '#ef4444' : 'transparent'" 
            :content="unreadCount > 0 ? unreadCount.toString() : ''" 
            offset-x="12" 
            offset-y="12"
            :model-value="unreadCount > 0"
          >
            <v-icon 
              :color="unreadCount > 0 ? '#ef4444' : '#64748b'" 
              size="20"
              :class="{ 'bell-ring': unreadCount > 0 }"
            >
              mdi-bell
            </v-icon>
          </v-badge>
        </v-btn>
      </template>
      
      <!-- Panel de notificaciones -->
      <v-card class="notification-panel">
        <v-card-title class="notification-header">
          <div class="d-flex align-center justify-space-between">
            <span class="notification-title">Notificaciones</span>
            <v-btn
              v-if="unreadCount > 0"
              variant="text"
              size="small"
              color="primary"
              @click="markAllAsRead"
            >
              Marcar todas como leídas
            </v-btn>
          </div>
        </v-card-title>
        
        <v-divider></v-divider>
        
        <div class="notification-content">
          <div v-if="notifications.length === 0" class="no-notifications">
            <v-icon size="48" color="#e2e8f0">mdi-bell-sleep-outline</v-icon>
            <p>No tienes notificaciones</p>
          </div>
          
          <v-list v-else class="notification-list">
            <v-list-item
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="{ 'unread': !notification.read }"
              @click="handleNotificationClick(notification)"
            >
              <template v-slot:prepend>
                <div :class="['notification-icon', getNotificationIconClass(notification.type)]">
                  <v-icon size="16" color="white">{{ getNotificationIcon(notification.type) }}</v-icon>
                </div>
              </template>
              
              <v-list-item-title class="notification-text">
                {{ notification.title }}
              </v-list-item-title>
              <v-list-item-subtitle class="notification-description">
                {{ notification.message }}
              </v-list-item-subtitle>
              <div class="notification-time">
                {{ getTimeAgo(notification.created_at) }}
              </div>
              
              <template v-slot:append>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click.stop="markAsRead(notification)"
                  v-if="!notification.read"
                >
                  <v-icon size="16" color="#64748b">mdi-check</v-icon>
                </v-btn>
              </template>
            </v-list-item>
          </v-list>
          
          <div v-if="notifications.length > 5" class="notification-footer">
            <v-btn
              variant="text"
              color="primary"
              block
              @click="viewAllNotifications"
            >
              Ver todas las notificaciones
            </v-btn>
          </div>
        </div>
      </v-card>
    </v-menu>
    
    <!-- Menú de usuario -->
    <v-menu offset-y>
      <template v-slot:activator="{ props }">
        <div v-bind="props" class="user-menu-trigger d-flex align-center">
          <v-avatar size="32" style="background: #0f172a;">
            <span class="text-white font-weight-bold text-caption">{{ userInitials }}</span>
          </v-avatar>
          <div class="user-info d-none d-sm-block">
            <div class="user-name">{{ authStore.userName }}</div>
            <div class="user-role">{{ roleDisplayName }}</div>
          </div>
          <v-icon color="#64748b" class="ml-2">mdi-chevron-down</v-icon>
        </div>
      </template>
      <v-list>
        <v-list-item @click="goToProfile">
          <template v-slot:prepend>
            <v-icon color="#64748b">mdi-account-outline</v-icon>
          </template>
          <v-list-item-title>Mi Perfil</v-list-item-title>
        </v-list-item>
        <v-list-item @click="goToSettings">
          <template v-slot:prepend>
            <v-icon color="#64748b">mdi-cog-outline</v-icon>
          </template>
          <v-list-item-title>Configuración</v-list-item-title>
        </v-list-item>
        <v-divider></v-divider>
        <v-list-item @click="logout">
          <template v-slot:prepend>
            <v-icon color="#ef4444">mdi-logout</v-icon>
          </template>
          <v-list-item-title>Cerrar Sesión</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-app-bar>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from 'vue-toastification'
import axios from 'axios'

// Props
const props = defineProps({
  sidebarModel: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['update:sidebarModel'])

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

// Estados reactivos
const notificationMenu = ref(false)
const notifications = ref([])
const notificationInterval = ref(null)

// Computed properties
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

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.read).length
})

// Funciones del sidebar
const toggleSidebar = () => {
  emit('update:sidebarModel', !props.sidebarModel)
}

// Funciones de notificaciones
const loadNotifications = async () => {
  try {
    console.log('🔔 Cargando notificaciones...')
    const response = await axios.get('/api/dashboard/notifications')
    notifications.value = response.data.notifications || []
    console.log('✅ Notificaciones cargadas:', notifications.value.length)
  } catch (error) {
    console.error('Error loading notifications:', error)
    // Cargar notificaciones mock si hay error
    loadMockNotifications()
  }
}

const loadMockNotifications = () => {
  const mockNotifications = [
    {
      id: 1,
      type: 'invoice_uploaded',
      title: 'Nueva factura subida',
      message: 'Proveedor ABC S.A. ha subido la factura #12345',
      created_at: new Date().toISOString(),
      read: false,
      data: { invoiceId: 123, supplierId: 45 }
    },
    {
      id: 2,
      type: 'payment_completed',
      title: 'Pago completado',
      message: 'El pago de la factura #12340 ha sido procesado exitosamente',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      read: false,
      data: { invoiceId: 120 }
    },
    {
      id: 3,
      type: 'invoice_assigned',
      title: 'Factura asignada',
      message: 'Se te ha asignado la factura #12338 para procesar',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      read: true,
      data: { invoiceId: 118 }
    },
    {
      id: 4,
      type: 'retention_generated',
      title: 'Retención generada',
      message: 'Retención ISR generada para factura #12335',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      read: true,
      data: { invoiceId: 115 }
    },
    {
      id: 5,
      type: 'password_generated',
      title: 'Contraseña generada',
      message: 'Contraseña de pago generada para factura #12333',
      created_at: new Date(Date.now() - 172800000).toISOString(),
      read: false,
      data: { invoiceId: 113 }
    }
  ]
  
  // Filtrar por rol
  if (authStore.isProveedor) {
    notifications.value = mockNotifications.filter(n => 
      ['payment_completed', 'retention_generated', 'password_generated'].includes(n.type)
    )
  } else {
    notifications.value = mockNotifications
  }
}

const getNotificationIcon = (type) => {
  const icons = {
    'invoice_uploaded': 'mdi-file-upload',
    'payment_completed': 'mdi-check-circle',
    'invoice_assigned': 'mdi-account-arrow-right',
    'retention_generated': 'mdi-file-document',
    'invoice_rejected': 'mdi-close-circle',
    'password_generated': 'mdi-key'
  }
  return icons[type] || 'mdi-information'
}

const getNotificationIconClass = (type) => {
  const classes = {
    'invoice_uploaded': 'notification-icon-info',
    'payment_completed': 'notification-icon-success',
    'invoice_assigned': 'notification-icon-warning',
    'retention_generated': 'notification-icon-primary',
    'invoice_rejected': 'notification-icon-error',
    'password_generated': 'notification-icon-primary'
  }
  return classes[type] || 'notification-icon-default'
}

const getTimeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now - date) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Ahora'
  if (diffInMinutes < 60) return `${diffInMinutes} min`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  
  return date.toLocaleDateString('es-GT')
}

const handleNotificationClick = async (notification) => {
  // Marcar como leída si no lo está
  if (!notification.read) {
    await markAsRead(notification)
  }
  
  // Cerrar el menú
  notificationMenu.value = false
  
  // Navegar según el tipo de notificación
  switch (notification.type) {
    case 'invoice_uploaded':
    case 'invoice_assigned':
    case 'payment_completed':
    case 'retention_generated':
    case 'password_generated':
      if (notification.data?.invoiceId) {
        router.push(`/invoices/${notification.data.invoiceId}`)
      }
      break
    case 'invoice_rejected':
      if (notification.data?.invoiceId) {
        router.push(`/invoices/${notification.data.invoiceId}/edit`)
      }
      break
    default:
      toast.info('Navegando a detalle...')
  }
}

const markAsRead = async (notification) => {
  try {
    await axios.patch(`/api/dashboard/notifications/${notification.id}/read`)
    notification.read = true
    toast.success('Notificación marcada como leída')
  } catch (error) {
    console.error('Error marking notification as read:', error)
    // Mock para desarrollo
    notification.read = true
  }
}

const markAllAsRead = async () => {
  try {
    await axios.patch('/api/dashboard/notifications/mark-all-read')
    notifications.value.forEach(n => n.read = true)
    toast.success('Todas las notificaciones marcadas como leídas')
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    // Mock para desarrollo
    notifications.value.forEach(n => n.read = true)
    toast.success('Todas las notificaciones marcadas como leídas')
  }
}

const viewAllNotifications = () => {
  notificationMenu.value = false
  router.push('/notifications')
}

const startNotificationPolling = () => {
  // Polling cada 30 segundos para nuevas notificaciones
  notificationInterval.value = setInterval(() => {
    loadNotifications()
  }, 30000)
}

const stopNotificationPolling = () => {
  if (notificationInterval.value) {
    clearInterval(notificationInterval.value)
    notificationInterval.value = null
  }
}

// Funciones del menú de usuario
const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

const goToProfile = () => {
  toast.info('Funcionalidad de perfil en desarrollo')
}

const goToSettings = () => {
  toast.info('Funcionalidad de configuración en desarrollo')
}

// Lifecycle hooks
onMounted(async () => {
  console.log('🚀 AppTopBar montado')
  await loadNotifications()
  startNotificationPolling()
})

onUnmounted(() => {
  stopNotificationPolling()
})
</script>

<style scoped>
.app-bar {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06) !important;
}

/* Botón hamburguesa personalizado */
.hamburger-btn {
  background: #f1f5f9;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.hamburger-btn:hover {
  background: #e2e8f0;
}

.hamburger-icon {
  display: flex;
  flex-direction: column;
  width: 18px;
  height: 12px;
  justify-content: space-between;
}

.hamburger-line {
  width: 100%;
  height: 2px;
  background: #0f172a;
  border-radius: 1px;
  transition: all 0.2s ease;
}

/* Estilos del panel de notificaciones */
.notification-panel {
  width: 380px;
  max-height: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border-radius: 12px;
}

.notification-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.notification-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.notification-content {
  max-height: 400px;
  overflow-y: auto;
}

.no-notifications {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.notification-list {
  padding: 0;
}

.notification-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: #f8fafc;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.unread {
  background-color: rgba(59, 130, 246, 0.05);
  border-left: 3px solid #3b82f6;
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.notification-icon-primary {
  background: #0f172a;
}

.notification-icon-success {
  background: #10b981;
}

.notification-icon-warning {
  background: #f59e0b;
}

.notification-icon-info {
  background: #3b82f6;
}

.notification-icon-error {
  background: #ef4444;
}

.notification-icon-default {
  background: #64748b;
}

.notification-text {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.notification-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}

.notification-time {
  font-size: 12px;
  color: #94a3b8;
}

.notification-footer {
  padding: 12px 20px;
  border-top: 1px solid #f1f5f9;
}

.user-menu-trigger {
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.user-menu-trigger:hover {
  background: #e2e8f0;
}

.user-info {
  margin-left: 12px;
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
}

.notification-btn {
  background: #f1f5f9;
  border-radius: 8px;
  margin-right: 12px;
  transition: all 0.2s ease;
}

.notification-btn:hover {
  background: #e2e8f0;
}

/* Animación de campana para notificaciones */
.bell-ring {
  animation: bellRing 2s ease-in-out infinite;
  transform-origin: 50% 4px;
}

@keyframes bellRing {
  0%, 50%, 100% {
    transform: rotate(0deg);
  }
  10%, 30% {
    transform: rotate(10deg);
  }
  20% {
    transform: rotate(-10deg);
  }
  40% {
    transform: rotate(-5deg);
  }
}

/* Animaciones para el badge de notificaciones */
.v-badge__badge {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

/* Responsive para notificaciones */
@media (max-width: 600px) {
  .notification-panel {
    width: 320px;
    max-height: 400px;
  }
  
  .notification-item {
    padding: 12px 16px;
  }
  
  .notification-text {
    font-size: 13px;
  }
  
  .notification-description {
    font-size: 12px;
  }
}

/* Animaciones adicionales */
.hamburger-line:nth-child(1) {
  animation-delay: 0s;
}

.hamburger-line:nth-child(2) {
  animation-delay: 0.1s;
}

.hamburger-line:nth-child(3) {
  animation-delay: 0.2s;
}

.hamburger-btn:hover .hamburger-line {
  background: #1e293b;
}

/* Scrollbar personalizado para las listas */
.notification-content::-webkit-scrollbar {
  width: 6px;
}

.notification-content::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.notification-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.notification-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>