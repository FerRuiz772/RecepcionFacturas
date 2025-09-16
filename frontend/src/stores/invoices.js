import { defineStore } from 'pinia'
import axios from 'axios'

export const useInvoicesStore = defineStore('invoices', {
  state: () => ({
    invoices: [],
    dashboardStats: null,
    loading: false,
    lastUpdated: null
  }),

  getters: {
    getInvoiceById: (state) => (id) => {
      return state.invoices.find(invoice => invoice.id === parseInt(id))
    },
    
    getInvoicesByStatus: (state) => (status) => {
      return state.invoices.filter(invoice => invoice.status === status)
    },
    
    totalInvoices: (state) => state.invoices.length,
    
    pendingInvoices: (state) => {
      return state.invoices.filter(invoice => 
        !['proceso_completado', 'rechazada'].includes(invoice.status)
      ).length
    }
  },

  actions: {
    // Cargar todas las facturas
    async loadInvoices() {
      try {
        this.loading = true
        console.log('📊 Cargando facturas...')
        
        const response = await axios.get('/api/invoices')
        console.log('📋 Respuesta completa:', response.data)
        
        // El backend devuelve { invoices: [...], total: N, ... }
        if (response.data && response.data.invoices && Array.isArray(response.data.invoices)) {
          this.invoices = response.data.invoices
          console.log('✅ Facturas extraídas correctamente del objeto response')
        } else if (Array.isArray(response.data)) {
          this.invoices = response.data
          console.log('✅ Facturas obtenidas directamente como array')
        } else {
          console.warn('⚠️ Formato de respuesta inesperado:', response.data)
          this.invoices = []
        }
        
        this.lastUpdated = new Date()
        
        console.log('✅ Facturas cargadas:', this.invoices.length)
        console.log('📋 Primera factura:', this.invoices[0])
        return this.invoices
      } catch (error) {
        console.error('❌ Error cargando facturas:', error)
        this.invoices = []
        throw error
      } finally {
        this.loading = false
      }
    },

    // Cargar estadísticas del dashboard
    async loadDashboardStats() {
      try {
        console.log('📊 Cargando estadísticas del dashboard...')
        
        const response = await axios.get('/api/dashboard/stats')
        this.dashboardStats = response.data
        
        console.log('✅ Estadísticas cargadas:', this.dashboardStats)
        return this.dashboardStats
      } catch (error) {
        console.error('❌ Error cargando estadísticas:', error)
        throw error
      }
    },

    // Cargar una factura específica y actualizar la lista
    async loadInvoice(id) {
      try {
        console.log('📋 Cargando factura:', id)
        
        const response = await axios.get(`/api/invoices/${id}`)
        const updatedInvoice = response.data
        
        // Actualizar la factura en la lista
        this.updateInvoiceInList(updatedInvoice)
        
        console.log('✅ Factura cargada y actualizada:', updatedInvoice.id)
        return updatedInvoice
      } catch (error) {
        console.error('❌ Error cargando factura:', error)
        throw error
      }
    },

    // Actualizar una factura en la lista local
    updateInvoiceInList(updatedInvoice) {
      const index = this.invoices.findIndex(invoice => invoice.id === updatedInvoice.id)
      
      if (index !== -1) {
        // Actualizar factura existente
        this.invoices[index] = { ...this.invoices[index], ...updatedInvoice }
        console.log('🔄 Factura actualizada en lista:', updatedInvoice.id, 'Estado:', updatedInvoice.status)
      } else {
        // Agregar nueva factura si no existe
        this.invoices.push(updatedInvoice)
        console.log('➕ Nueva factura agregada a lista:', updatedInvoice.id)
      }
      
      this.lastUpdated = new Date()
      
      // Actualizar estadísticas si es necesario
      this.updateDashboardStatsIfNeeded()
    },

    // Actualizar el estado de una factura específica
    async updateInvoiceStatus(invoiceId, newStatus, notes = null) {
      try {
        console.log('🔄 Actualizando estado de factura:', invoiceId, 'Nuevo estado:', newStatus)
        
        const response = await axios.put(`/api/invoices/${invoiceId}/status`, {
          status: newStatus,
          notes: notes
        })
        
        // Actualizar la factura en la lista local
        this.updateInvoiceInList(response.data.invoice)
        
        console.log('✅ Estado actualizado exitosamente')
        return response.data
      } catch (error) {
        console.error('❌ Error actualizando estado:', error)
        throw error
      }
    },

    // Actualizar las estadísticas del dashboard si es necesario
    updateDashboardStatsIfNeeded() {
      if (this.dashboardStats) {
        // Recalcular estadísticas básicas
        const stats = {
          total_invoices: this.invoices.length,
          pending_invoices: this.invoices.filter(inv => 
            !['proceso_completado', 'rechazada'].includes(inv.status)
          ).length,
          completed_invoices: this.invoices.filter(inv => 
            inv.status === 'proceso_completado'
          ).length,
          rejected_invoices: this.invoices.filter(inv => 
            inv.status === 'rechazada'
          ).length
        }
        
        this.dashboardStats = { ...this.dashboardStats, ...stats }
        console.log('📊 Estadísticas actualizadas automáticamente')
      }
    },

    // Marcar que una factura necesita ser recargada en todas las vistas
    async refreshInvoice(invoiceId) {
      console.log('🔄 Refrescando factura en todas las vistas:', invoiceId)
      
      try {
        // Recargar la factura desde el servidor
        const updatedInvoice = await this.loadInvoice(invoiceId)
        
        // Emitir evento para que otros componentes se actualicen
        this.notifyInvoiceUpdate(updatedInvoice)
        
        return updatedInvoice
      } catch (error) {
        console.error('❌ Error refrescando factura:', error)
        throw error
      }
    },

    // Notificar a otros componentes sobre la actualización
    notifyInvoiceUpdate(invoice) {
      // Esto se puede usar para notificaciones toast, websockets, etc.
      console.log('📢 Notificando actualización de factura:', invoice.id, 'Estado:', invoice.status)
      
      // Si hay un sistema de eventos global, se puede usar aquí
      if (window.EventBus) {
        window.EventBus.emit('invoice-updated', invoice)
      }
    },

    // Limpiar el store
    clearStore() {
      this.invoices = []
      this.dashboardStats = null
      this.lastUpdated = null
      console.log('🧹 Store de facturas limpiado')
    },

    // Función helper para determinar si una factura cambió de estado significativamente
    hasSignificantStatusChange(oldInvoice, newInvoice) {
      const significantStatuses = [
        'retencion_isr_generada',
        'retencion_iva_generada', 
        'pago_realizado',
        'proceso_completado',
        'rechazada'
      ]
      
      return oldInvoice.status !== newInvoice.status && 
             significantStatuses.includes(newInvoice.status)
    }
  }
})
