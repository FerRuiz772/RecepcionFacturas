<template>
    <div class="accounting-layout">
      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn icon @click="goBack" color="#64748b" class="ml-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Gestión de Documentos</div>
          <div class="header-subtitle">Subir retenciones y comprobantes de pago</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn icon color="#64748b">
          <v-icon>mdi-help-circle-outline</v-icon>
        </v-btn>
      </v-app-bar>
  
      <v-main class="main-content">
        <!-- Breadcrumb -->
        <div class="breadcrumb-container">
          <v-container>
            <div class="d-flex align-center">
              <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
              <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
              <router-link to="/invoices" class="breadcrumb-item">Facturas</router-link>
              <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
              <span class="breadcrumb-item active">Gestión de Documentos</span>
            </div>
          </v-container>
        </div>
  
        <v-container class="py-8" max-width="1000">
          <!-- Información de la factura -->
          <v-card class="form-card mb-6" elevation="2">
            <v-card-title class="card-title-bg">
              <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
              Información de la Factura
            </v-card-title>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="4">
                  <v-text-field
                    :value="invoice?.number"
                    label="Número de Factura"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-pound"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :value="invoice?.Supplier?.business_name"
                    label="Proveedor"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-domain"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field
                    :value="formatCurrency(invoice?.amount)"
                    label="Monto"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-currency-usd"
                  ></v-text-field>
                </v-col>
                <v-col cols="12">
                  <v-chip 
                    :color="getStatusColor(invoice?.status)" 
                    size="large"
                    class="status-chip-large"
                  >
                    <v-icon class="mr-2">mdi-circle</v-icon>
                    {{ getStatusText(invoice?.status) }}
                  </v-chip>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
  
          <!-- Gestión de documentos -->
          <v-row>
            <!-- Facturas del proveedor (descargar) -->
            <v-col cols="12" lg="6">
              <v-card class="document-card" elevation="2">
                <v-card-title class="card-title-bg">
                  <v-icon class="mr-2">mdi-download</v-icon>
                  Facturas del Proveedor
                </v-card-title>
                <v-card-text class="pa-6">
                  <div class="document-section">
                    <div class="document-info">
                      <v-icon color="success" class="mr-3">mdi-file-pdf-box</v-icon>
                      <div>
                        <div class="document-name">Factura Original</div>
                        <div class="document-subtitle">Documento subido por el proveedor</div>
                      </div>
                    </div>
                    <v-btn
                      color="success"
                      variant="outlined"
                      @click="downloadInvoiceFiles"
                      class="download-btn"
                    >
                      <v-icon class="mr-2">mdi-download</v-icon>
                      Descargar
                    </v-btn>
                  </div>
                  
                  <div v-if="invoice?.uploaded_files?.length > 1" class="mt-4">
                    <v-divider class="mb-4"></v-divider>
                    <div class="document-info">
                      <v-icon color="primary" class="mr-3">mdi-file-document-multiple</v-icon>
                      <div>
                        <div class="document-name">Documentos Adicionales</div>
                        <div class="document-subtitle">{{ invoice.uploaded_files.length - 1 }} archivo(s) adicional(es)</div>
                      </div>
                    </div>
                    <v-btn
                      color="primary"
                      variant="outlined"
                      @click="downloadAdditionalFiles"
                      class="download-btn"
                    >
                      <v-icon class="mr-2">mdi-download</v-icon>
                      Descargar Todos
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
  
            <!-- Acciones de contaduría -->
            <v-col cols="12" lg="6">
              <v-card class="document-card" elevation="2">
                <v-card-title class="card-title-bg">
                  <v-icon class="mr-2">mdi-upload</v-icon>
                  Documentos a Generar
                </v-card-title>
                <v-card-text class="pa-6">
                  <!-- Generar contraseña -->
                  <div v-if="canGeneratePassword" class="action-section">
                    <div class="action-info">
                      <v-icon color="indigo" class="mr-3">mdi-key</v-icon>
                      <div>
                        <div class="action-name">Generar Contraseña</div>
                        <div class="action-subtitle">Crear contraseña para el proceso de pago</div>
                      </div>
                    </div>
                    <v-btn
                      color="indigo"
                      @click="generatePassword"
                      :loading="generatingPassword"
                    >
                      <v-icon class="mr-2">mdi-key</v-icon>
                      Generar
                    </v-btn>
                  </div>
  
                  <!-- Subir Retención ISR -->
                  <div v-if="canUploadISR" class="action-section">
                    <v-divider class="mb-4"></v-divider>
                    <div class="action-info">
                      <v-icon color="blue" class="mr-3">mdi-file-document</v-icon>
                      <div>
                        <div class="action-name">Retención ISR</div>
                        <div class="action-subtitle">Subir constancia de retención de ISR</div>
                      </div>
                    </div>
                    <v-btn
                      v-if="!hasISRFile"
                      color="blue"
                      @click="openUploadDialog('isr')"
                    >
                      <v-icon class="mr-2">mdi-upload</v-icon>
                      Subir ISR
                    </v-btn>
                    <div v-else class="uploaded-file">
                      <v-icon color="blue" class="mr-2">mdi-check-circle</v-icon>
                      <span>ISR subido correctamente</span>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="blue"
                        @click="downloadISR"
                        title="Descargar ISR"
                      >
                        <v-icon size="16">mdi-download</v-icon>
                      </v-btn>
                    </div>
                  </div>
  
                  <!-- Subir Retención IVA -->
                  <div v-if="canUploadIVA" class="action-section">
                    <v-divider class="mb-4"></v-divider>
                    <div class="action-info">
                      <v-icon color="cyan" class="mr-3">mdi-file-certificate</v-icon>
                      <div>
                        <div class="action-name">Retención IVA</div>
                        <div class="action-subtitle">Subir constancia de retención de IVA</div>
                      </div>
                    </div>
                    <v-btn
                      v-if="!hasIVAFile"
                      color="cyan"
                      @click="openUploadDialog('iva')"
                    >
                      <v-icon class="mr-2">mdi-upload</v-icon>
                      Subir IVA
                    </v-btn>
                    <div v-else class="uploaded-file">
                      <v-icon color="cyan" class="mr-2">mdi-check-circle</v-icon>
                      <span>IVA subido correctamente</span>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="cyan"
                        @click="downloadIVA"
                        title="Descargar IVA"
                      >
                        <v-icon size="16">mdi-download</v-icon>
                      </v-btn>
                    </div>
                  </div>
  
                  <!-- Realizar pago (cambio de estado) -->
                  <div v-if="canMarkAsPaid" class="action-section">
                    <v-divider class="mb-4"></v-divider>
                    <div class="action-info">
                      <v-icon color="orange" class="mr-3">mdi-cash</v-icon>
                      <div>
                        <div class="action-name">Marcar como Pagado</div>
                        <div class="action-subtitle">Confirmar que el pago ha sido realizado</div>
                      </div>
                    </div>
                    <v-btn
                      color="orange"
                      @click="markAsPaid"
                      :loading="markingPaid"
                    >
                      <v-icon class="mr-2">mdi-cash</v-icon>
                      Marcar Pagado
                    </v-btn>
                  </div>
  
                  <!-- Subir comprobante de pago -->
                  <div v-if="canUploadPaymentProof" class="action-section">
                    <v-divider class="mb-4"></v-divider>
                    <div class="action-info">
                      <v-icon color="green" class="mr-3">mdi-receipt</v-icon>
                      <div>
                        <div class="action-name">Comprobante de Pago</div>
                        <div class="action-subtitle">Subir comprobante final del pago realizado</div>
                      </div>
                    </div>
                    <v-btn
                      v-if="!hasPaymentProofFile"
                      color="green"
                      @click="openUploadDialog('payment_proof')"
                    >
                      <v-icon class="mr-2">mdi-upload</v-icon>
                      Subir Comprobante
                    </v-btn>
                    <div v-else class="uploaded-file">
                      <v-icon color="green" class="mr-2">mdi-check-circle</v-icon>
                      <span>Comprobante subido</span>
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="green"
                        @click="downloadPaymentProof"
                        title="Descargar comprobante"
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
          <v-card class="mt-6" elevation="2">
            <v-card-title class="card-title-bg">
              <v-icon class="mr-2">mdi-history</v-icon>
              Historial de Estados
            </v-card-title>
            <v-card-text class="pa-0">
              <v-timeline side="end" class="timeline">
                <v-timeline-item
                  v-for="(state, index) in invoiceStates"
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
        </v-container>
      </v-main>
  
      <!-- Dialog para subir archivos -->
      <v-dialog v-model="uploadDialog" max-width="600">
        <v-card>
          <v-card-title>{{ uploadDialogTitle }}</v-card-title>
          <v-card-text>
            <div 
              class="upload-zone"
              @click="$refs.fileInput?.click()"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              :class="{ 'dragging': isDragging }"
            >
              <v-icon size="48" color="#cbd5e1">mdi-cloud-upload</v-icon>
              <h3>Arrastra el archivo aquí o haz clic para seleccionar</h3>
              <p>Solo archivos PDF • Máximo 10MB</p>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept=".pdf"
              style="display: none"
              @change="handleFileSelect"
            >
            <div v-if="selectedFile" class="mt-4">
              <v-list-item class="file-preview">
                <template v-slot:prepend>
                  <v-icon color="red">mdi-file-pdf-box</v-icon>
                </template>
                <v-list-item-title>{{ selectedFile.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatFileSize(selectedFile.size) }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-btn
                    icon
                    size="small"
                    @click="selectedFile = null"
                    color="error"
                  >
                    <v-icon size="16">mdi-close</v-icon>
                  </v-btn>
                </template>
              </v-list-item>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="uploadDialog = false">Cancelar</v-btn>
            <v-btn 
              color="primary" 
              @click="submitUpload"
              :disabled="!selectedFile"
              :loading="uploading"
            >
              Subir Archivo
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
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
  const invoiceStates = ref([])
  const uploadDialog = ref(false)
  const uploadDialogTitle = ref('')
  const uploadType = ref('')
  const selectedFile = ref(null)
  const uploading = ref(false)
  const isDragging = ref(false)
  const generatingPassword = ref(false)
  const markingPaid = ref(false)
  
  // Estados computados
  const canGeneratePassword = computed(() => {
    return invoice.value?.status === 'en_proceso'
  })
  
  const canUploadISR = computed(() => {
    return ['en_proceso', 'contrasena_generada'].includes(invoice.value?.status)
  })
  
  const canUploadIVA = computed(() => {
    return invoice.value?.status === 'retencion_isr_generada'
  })
  
  const canMarkAsPaid = computed(() => {
    return invoice.value?.status === 'retencion_iva_generada'
  })
  
  const canUploadPaymentProof = computed(() => {
    return invoice.value?.status === 'pago_realizado'
  })
  
  const hasISRFile = computed(() => {
    return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value?.status)
  })
  
  const hasIVAFile = computed(() => {
    return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.value?.status)
  })
  
  const hasPaymentProofFile = computed(() => {
    return invoice.value?.status === 'proceso_completado'
  })
  
  const goBack = () => {
    router.push('/invoices')
  }
  
  const loadInvoice = async () => {
    try {
      const invoiceId = route.params.id
      const response = await axios.get(`/api/invoices/${invoiceId}`)
      invoice.value = response.data
      invoiceStates.value = response.data.states || []
    } catch (error) {
      console.error('Error loading invoice:', error)
      toast.error('Error al cargar la factura')
      router.push('/invoices')
    }
  }
  
  const generatePassword = async () => {
    generatingPassword.value = true
    try {
      await axios.post(`/api/invoices/${invoice.value.id}/generate-password`)
      toast.success('Contraseña generada exitosamente')
      await loadInvoice()
    } catch (error) {
      toast.error('Error al generar contraseña')
    } finally {
      generatingPassword.value = false
    }
  }
  
  const markAsPaid = async () => {
    markingPaid.value = true
    try {
      await axios.put(`/api/invoices/${invoice.value.id}/status`, {
        status: 'pago_realizado',
        notes: 'Pago confirmado por contaduría'
      })
      toast.success('Factura marcada como pagada')
      await loadInvoice()
    } catch (error) {
      toast.error('Error al marcar como pagada')
    } finally {
      markingPaid.value = false
    }
  }
  
  const openUploadDialog = (type) => {
    uploadType.value = type
    const titles = {
      'isr': 'Subir Retención ISR',
      'iva': 'Subir Retención IVA',
      'payment_proof': 'Subir Comprobante de Pago'
    }
    uploadDialogTitle.value = titles[type]
    uploadDialog.value = true
    selectedFile.value = null
  }
  
  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('El archivo no puede ser mayor a 10MB')
        return
      }
      selectedFile.value = file
    }
  }
  
  const handleDrop = (event) => {
    isDragging.value = false
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect({ target: { files } })
    }
  }
  
  const submitUpload = async () => {
    if (!selectedFile.value) return
  
    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('type', uploadType.value)
  
      await axios.post(`/api/invoices/${invoice.value.id}/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
  
      toast.success('Documento subido exitosamente')
      uploadDialog.value = false
      await loadInvoice()
    } catch (error) {
      toast.error('Error al subir documento')
    } finally {
      uploading.value = false
    }
  }
  
  // Funciones de descarga
  const downloadInvoiceFiles = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-invoice`, {
        responseType: 'blob'
      })
      downloadBlob(response.data, `factura-${invoice.value.number}.pdf`)
      toast.success('Factura descargada')
    } catch (error) {
      toast.error('Error al descargar factura')
    }
  }
  
  const downloadAdditionalFiles = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-all-files`, {
        responseType: 'blob'
      })
      downloadBlob(response.data, `documentos-${invoice.value.number}.zip`)
      toast.success('Documentos descargados')
    } catch (error) {
      toast.error('Error al descargar documentos')
    }
  }
  
  const downloadISR = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      downloadBlob(response.data, `retencion-isr-${invoice.value.number}.pdf`)
    } catch (error) {
      toast.error('Error al descargar ISR')
    }
  }
  
  const downloadIVA = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      downloadBlob(response.data, `retencion-iva-${invoice.value.number}.pdf`)
    } catch (error) {
      toast.error('Error al descargar IVA')
    }
  }
  
  const downloadPaymentProof = async () => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.value.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      downloadBlob(response.data, `comprobante-pago-${invoice.value.number}.pdf`)
    } catch (error) {
      toast.error('Error al descargar comprobante')
    }
  }
  
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    window.URL.revokeObjectURL(url)
  }
  
  // Funciones de utilidad
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ'
    }).format(amount)
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
  
  onMounted(() => {
    loadInvoice()
  })
  </script>
  
  <style scoped>
.accounting-layout {
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

.breadcrumb-container {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 0;
}

.breadcrumb-item {
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.breadcrumb-item.active {
  color: #0f172a;
}

.breadcrumb-item:hover {
  color: #0f172a;
}

.form-card, .document-card {
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

.status-chip-large {
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
}

.document-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.document-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.document-name {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.document-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 2px;
}

.download-btn {
  text-transform: none;
  font-weight: 500;
}

.action-section {
  padding: 16px 0;
}

.action-info {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.action-name {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.action-subtitle {
  font-size: 14px;
  color: #64748b;
  margin-top: 2px;
}

.uploaded-file {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 14px;
  color: #166534;
}

.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  background: #f8fafc;
  padding: 40px 20px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-zone:hover,
.upload-zone.dragging {
  border-color: #0f172a;
  background: #f1f5f9;
  transform: scale(1.01);
}

.upload-zone h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 16px 0 8px 0;
}

.upload-zone p {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.file-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
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