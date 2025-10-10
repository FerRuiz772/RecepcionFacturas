import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/reset-password/:token',
    name: 'ResetPassword',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices',
    name: 'Invoices',
    component: () => import('../views/InvoicesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/invoices/new',
    name: 'NewInvoice',
    component: () => import('../views/NewInvoiceView.vue'),
    meta: { requiresAuth: true, permission: 'invoices.create' }
  },
  {
    path: '/suppliers',
    name: 'Suppliers',
    component: () => import('../views/SuppliersView.vue'),
    meta: { requiresAuth: true, permission: 'suppliers.view' }
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/UsersView.vue'),
    meta: { requiresAuth: true, permission: 'users.view' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  // NUEVA RUTA: Configuración de WhatsApp (solo para superadmin)
  {
    path: '/whatsapp',
    name: 'WhatsAppConfig',
    component: () => import('../views/WhatsAppConfigView.vue'),
    meta: { requiresAuth: true, requiresSuperAdmin: true }
  },
  // NUEVA RUTA: Vista detallada de factura (para todos los roles)
  {
    path: '/invoices/:id',
    name: 'InvoiceDetail',
    component: () => import('../views/InvoiceDetailView.vue'),
    meta: { requiresAuth: true }
  },
  // NUEVA RUTA: Vista de gestión de factura (para contaduría y admin)
  {
    path: '/invoices/:id/manage',
    name: 'InvoiceManage',
    component: () => import('../views/InvoiceManageView.vue'),
    meta: { requiresAuth: true, permission: 'invoices.edit' }
  },
  // Ruta de error 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()
    
    // Mostrar loading si es necesario
    if (authStore.loading) {
      // Esperar un momento para que termine de cargar
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    // Si hay token pero no usuario, intentar cargar usuario
    if (authStore.token && !authStore.user && !authStore.loading) {
      console.log('🔄 Cargando usuario desde token...')
      await authStore.loadUserFromToken()
    }
    
    // Validaciones de rutas
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      console.log('❌ Acceso denegado: no autenticado')
      next('/login')
    } 
    else if (to.meta.requiresGuest && authStore.isAuthenticated) {
      console.log('✅ Usuario ya autenticado, redirigiendo a dashboard')
      next('/dashboard')
    }
    else if (to.meta.requiresSuperAdmin && authStore.user?.role !== 'super_admin') {
      console.log('❌ Acceso denegado: requiere rol super_admin')
      next('/dashboard')
    }
    else if (to.meta.permission && !authStore.hasPermission(to.meta.permission)) {
      console.log(`❌ Acceso denegado: no tiene permiso ${to.meta.permission} para ${to.path}`)
      next('/dashboard')
    } 
    else if (to.name === 'InvoiceDetail') {
      // Validar que el ID sea válido (debe ser un número positivo)
      const invoiceId = to.params.id
      if (!invoiceId || isNaN(parseInt(invoiceId)) || parseInt(invoiceId) <= 0) {
        console.log('❌ ID de factura inválido:', invoiceId)
        next('/invoices')
      } else {
        console.log('✅ ID de factura válido:', invoiceId)
        next()
      }
    }
    else {
      next()
    }
  })

// Interceptor para manejar errores de rutas
router.onError((error) => {
  console.error('Router error:', error)
  router.push('/dashboard')
})

export default router