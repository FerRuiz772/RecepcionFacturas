<template>
    <div class="invoice-detail-layout">
      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn icon @click="goBack" color="#64748b" class="ml-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Detalle de Factura</div>
          <div class="header-subtitle" v-if="invoice">{{ invoice.number }}</div>
        </div>
        <v-spacer></v-spacer>
        <!-- Botón para contaduría -->
        <v-btn 
          v-if="authStore.isContaduria && invoice"
          color="primary" 
          @click="goToManagement"
          prepend-icon="mdi-cog"
          class="manage-btn"
        >
          Gestionar Documentos
        </v-btn>
      </v-app-bar>
  
      <v-main class="main-content">
        <v-container class="py-8" max-width="1000">
          <div v-if="loading" class="loading-container">
            <v-progress-circular size="64" indeterminate color="primary"></v-progress-circular>
            <p class="mt-4">Cargando factura...</p>
          </div>
  
          <div v-else-if="invoice">
            <!-- Información principal -->
            <v-row class="mb-6">
              <v-col cols="12" lg="8">
                <v-card class="info-card" elevation="2">
                  <v-card-title class="card-title-bg">
                    <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                    Información de la Factura
                  </v-card-title>
                  <v-card-text class="pa-6">
                    <v-row>
                      <v-col cols="12" md="6">
                        <div class="info-field">
                          <label>Número de Factura</label>
                          <div class="info-value invoice-number">{{ invoice.number }}</div>
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="info-field">
                          <label>Monto</label>
                          <div class="info-value amount">{{ formatCurrency(invoice.amount) }}</div>
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="info-field">
                          <label>Fecha de Creación</label>
                          <div class="info-value">{{ formatDate(invoice.created_at) }}</div>
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="info-field">
                          <label>Fecha Límite</label>
                          <div class="info-value">{{ invoice.due_date ? formatDate(invoice.due_date) : 'No especificada' }}</div>
                        </div>
                      </v-col>
                      <v-col cols="12">
                        <div class="info-field">
                          <label>Descripción</label>
                          <div class="info-value">{{ invoice.description }}</div>
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-col>
  
              <!-- Estado y proveedor -->
              <v-col cols="12" lg="4">
                <v-card class="status-card" elevation="2">
                  <v-card-title class="card-title-bg">
                    <v-icon class="mr-2">mdi-information-outline</v-icon>
                    Estado Actual
                  </v-card-title>
                  <v-card-text class="pa-6">
                    <div class="status-display">
                      <v-chip 
                        :color="getStatusColor(invoice.status)" 
                        size="large"
                        class="status-chip-large mb-4"
                      >
                        <v-icon class="mr-2">mdi-circle</v-icon>
                        {{ getStatusText(invoice.status) }}
                      </v-chip>
                    </div>
                    
                    <div class="info-field" v-if="!authStore.isProveedor">
                      <label>Proveedor</label>
                      <div class="info-value">{{ invoice.Supplier?.business_name }}</div>
                      <div class="info-subtitle">NIT: {{ invoice.Supplier?.nit }}</div>
                    </div>
  
                    <div class="info-field" v-if="invoice.assignedUser">
                      <label>Asignado a</label>
                      <div class="info-value">{{ invoice.assignedUser.name }}</div>
                      <div class="info-subtitle">{{ invoice.assignedUser.email }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
  
            <!-- Archivos y documentos -->
            <v-row class="mb-6">
              <!-- Archivos originales -->
              <v-col cols="12" lg="6">
                <v-card class="files-card" elevation="2">
                  <v-card-title class="card-title-bg">
                    <v-icon class="mr-2">mdi-file-multiple</v-icon>
                    Archivos Originales
                  </v-card-title>
                  <v-card-text class="pa-6">
                    <div v-if="!invoice.uploaded_files || invoice.uploaded_files.length === 0" class="no-files">
                      <v-icon size="48" color="#e2e8f0">mdi-file-outline</v-icon>
                      <p>No hay archivos disponibles</p>
                    </div>
                    <v-list v-else>
                      <v-list-item 
                        v-for="(file, index) in invoice.uploaded_files" 
                        :key="index"
                        class="file-item"
                      >
                        <template v-slot:prepend>
                          <v-icon color="red">mdi-file-pdf-box</v-icon>
                        </template>
                        <v-list-item-title>{{ file.originalName }}</v-list-item-title>
                        <v-list-item-subtitle>{{ formatFileSize(file.size) }}</v-list-item-subtitle>
                        <template v-slot:append>
                          <v-btn
                            icon
                            size="small"
                            color="primary"
                            @click="downloadFile(file)"
                          >
                            <v-icon size="16">mdi-download</v-icon>
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-card-text>
                </v-card>
              </v-col>
  
              <!-- Documentos generados -->
              <v-col cols="12" lg="6">
                <v-card class="documents-card" elevation="2">
                  <v-card-title class="card-title-bg">
                    <v-icon class="mr-2">mdi-file-document-multiple</v-icon>
                    Documentos Generados
                  </v-card-title>
                  <v-card-text class="pa-6">
                    <div class="document-list">
                      <!-- Retención ISR -->
                      <div class="document-item">
                        <div class="document-info">
                          <v-icon :color="hasRetentionISR ? 'blue' : '#e2e8f0'" class="mr-3">
                            mdi-file-document
                          </v-icon>
                          <div>
                            <div class="document-name">Retención ISR</div>
                            <div class="document-status">
                              {{ hasRetentionISR ? 'Disponible' : 'Pendiente' }}
                            </div>
                          </div>
                        </div>
                        <v-btn
                          v-if="hasRetentionISR"
                          icon
                          size="small"
                          color="blue"
                          @click="downloadRetentionISR"
                        >
                          <v-icon size="16">mdi-download</v-icon>
                        </v-btn>
                      </div>
  
                      <!-- Retención IVA -->
                      <div class="document-item">
                        <div class="document-info">
                          <v-icon :color="hasRetentionIVA ? 'cyan' : '#e2e8f0'" class="mr-3">
                            mdi-file-certificate
                          </v-icon>
                          <div>
                            <div class="document-name">Retención IVA</div>
                            <div class="document-status">
                              {{ hasRetentionIVA ? 'Disponible' : 'Pendiente' }}
                            </div>
                          </div>
                        </div>
                        <v-btn
                          v-if="hasRetentionIVA"
                          icon
                          size="small"
                          color="cyan"
                          @click="downloadRetentionIVA"
                        >
                          <v-icon size="16">mdi-download</v-icon>
                        </v-btn>
                      </div>
  
                      <!-- Comprobante de Pago -->
                      <div class="document-item">
                        <div class="document-info">
                          <v-icon :color="hasPaymentProof ? 'green' : '#e2e8f0'" class="mr-3">
                            mdi-receipt
                          </v-icon>
                          <div>
                            <div class="document-name">Comprobante de Pago</div>
                            <div class="document-status">
                              {{ hasPaymentProof ? 'Disponible' : 'Pendiente' }}
                            </div>
                          </div>
                        </div>
                        <v-btn
                          v-if="hasPaymentProof"
                          icon
                          size="small"
                          color="green"
                          @click="downloadPaymentProof"
                        >
                          <v-icon size="16">mdi-download</v-icon>
                        </v-btn>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
  
            <!-- Historial de estados -->
            <v-card elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-history</v-icon>
                Historial de Estados
              </v-card-title>
              <v-card-text class="pa-0">
                <v-timeline side="end" class="timeline">
                  <v-timeline-item
                    v-for="(state, index) in invoice.states"
                    :key="index"
                    :dot-color="getTimelineColor(state.to_state)"
                    size="small"
                  >
                    <template v-slot:opposite>
                      <div class="timeline-date">{{ formatDateTime(state.timestamp) }}</div>
                    </template>
                    <div class="timeline-content">
                      <div class="timeline-status">{{ getStatusText(state.to_state) }}</div>
                      <div class="timeline-user">Por: {{ state.user?.name }}</div>
                      <div v-if="state.notes" class="timeline-notes">{{ state.notes }}</div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </div>
  
          <!-- Error state -->
          <div v-else class="error-container">
            <v-icon size="64" color="error">mdi-alert-circle</v-icon>
            <h3>Factura no encontrada</h3>
            <p>La factura solicitada no existe o no tienes permisos para verla.</p>
            <v-btn color="primary" @click="goBack">Volver</v-btn>
          </div>
        </v-container>
      </v-main>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useToast } from 'vue-toastification'
  import axios from 'axios'
  
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const invoice = ref(null)
  const loading = ref(true)
  
  const hasRetentionISR = computed(() => {
    return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value?.status)
  })
  
  const hasRetentionIVA = computed(() => {
    return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value?.status)
  })
  
  const hasPaymentProof = computed(() => {
    return invoice.value?.status === 'proceso_completado'
  })
  
  const loadInvoice = async () => {
  try {
    const invoiceId = route.params.id
    const response = await axios.get(`/api/invoices/${invoiceId}`)
    invoice.value = response.data
  } catch (error) {
    console.error('Error loading invoice:', error)
    if (error.response?.status === 403) {
      toast.error('No tienes permisos para ver esta factura')
    } else if (error.response?.status === 404) {
      toast.error('Factura no encontrada')
    } else {
      toast.error('Error al cargar la factura')
    }
    invoice.value = null
  } finally {
    loading.value = false
  }
}
  
  const goBack = () => {
    router.push('/invoices')
  }
  
  const goToManagement = () => {
    router.push(`/invoices/${invoice.value.id}/manage`)
  }
  
  const downloadFile = async (file) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = file.originalName
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Archivo descargado')
    } catch (error) {
      toast.error('Error al descargar archivo')
    }
  }
  
  const downloadRetentionISR = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-isr-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención ISR descargada')
    } catch (error) {
      toast.error('Error al descargar retención ISR')
    }
  }
  
  const downloadRetentionIVA = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-iva-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Retención IVA descargada')
    } catch (error) {
      toast.error('Error al descargar retención IVA')
    }
  }
  
  const downloadPaymentProof = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `comprobante-pago-${invoice.value.number}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      toast.success('Comprobante de pago descargado')
    } catch (error) {
      toast.error('Error al descargar comprobante')
    }
  }
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(amount)
  }
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-GT')
  }
  
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('es-GT')
  }
  
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }
  
  const getStatusColor = (status) => {
    const colors = {
      'factura_subida': 'blue',
      'asignada_contaduria': 'orange',
      'en_proceso': 'purple',
      'contrasena_generada': 'indigo',
      'retencion_isr_generada': 'cyan',
      'retencion_iva_generada': 'teal',
      'pago_realizado': 'green',
      'proceso_completado': 'success',
      'rechazada': 'error'
    }
    return colors[status] || 'grey'
  }
  
  const getStatusText = (status) => {
    const texts = {
      'factura_subida': 'Factura Subida',
      'asignada_contaduria': 'Asignada a Contaduría',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña Generada',
      'retencion_isr_generada': 'Retención ISR',
      'retencion_iva_generada': 'Retención IVA',
      'pago_realizado': 'Pago Realizado',
      'proceso_completado': 'Proceso Completado',
      'rechazada': 'Rechazada'
    }
    return texts[status] || status
  }
  
  const getTimelineColor = (status) => {
    return getStatusColor(status)
  }
  
  onMounted(() => {
  loadInvoice()
})
</script>

<style scoped>
.invoice-detail-layout {
  min-height: 100vh;
  background: #f8fafc;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.header-subtitle {
  font-size: 13px;
  color: #64748b;
}

.main-content {
  background: #f8fafc;
  min-height: calc(100vh - 64px);
}

.manage-btn {
  text-transform: none;
  font-weight: 600;
}

.loading-container, .error-container {
  text-align: center;
  padding: 80px 20px;
  color: #64748b;
}

.info-card, .status-card, .files-card, .documents-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-title-bg {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.info-field {
  margin-bottom: 20px;
}

.info-field label {
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  display: block;
  margin-bottom: 4px;
}

.info-value {
  font-size: 16px;
  font-weight: 500;
  color: #0f172a;
}

.info-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 2px;
}

.invoice-number {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #0f172a;
}

.amount {
  font-weight: 600;
  color: #059669;
  font-size: 18px;
}

.status-display {
  text-align: center;
  margin-bottom: 20px;
}

.status-chip-large {
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
}

.no-files {
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
}

.file-item {
  border-bottom: 1px solid #f1f5f9;
}

.file-item:last-child {
  border-bottom: none;
}

.document-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.document-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.document-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.document-name {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.document-status {
  font-size: 12px;
  color: #64748b;
}

.timeline {
  padding: 20px;
}

.timeline-date {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.timeline-content {
  padding: 8px 0;
}

.timeline-status {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.timeline-user {
  font-size: 12px;
  color: #64748b;
  margin-top: 2px;
}

.timeline-notes {
  font-size: 13px;
  color: #475569;
  margin-top: 4px;
  font-style: italic;
}
</style>