<template>
  <div class="invoice-detail-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <router-link to="/invoices" class="breadcrumb-item">Facturas</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <span class="breadcrumb-item active">Detalle</span>
        </div>
      </v-container>
    </div>

    <!-- Header de página -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">Detalle de Factura</h1>
            <p class="page-subtitle" v-if="invoice">
              {{ invoice.number }} - {{ invoice.supplier?.business_name }}
            </p>
          </div>
          <div class="d-flex gap-3">
            <v-btn 
              variant="outlined"
              @click="$router.go(-1)"
              prepend-icon="mdi-arrow-left"
              class="back-btn"
            >
              Volver
            </v-btn>
            <v-btn 
              v-if="canManage"
              color="primary"
              @click="$router.push(`/invoices/${$route.params.id}/manage`)"
              prepend-icon="mdi-cog"
              class="manage-btn"
            >
              Gestionar
            </v-btn>
          </div>
        </div>
      </v-container>
    </div>

    <v-container class="py-8">
      <div v-if="loading" class="loading-container">
        <v-progress-circular
          color="primary"
          indeterminate
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Cargando información de la factura...</p>
      </div>

      <div v-else-if="invoice">
        <!-- Información principal -->
        <v-row class="mb-6">
          <!-- Datos básicos -->
          <v-col cols="12" lg="8">
            <v-card class="invoice-info-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                Información de la Factura
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="info-field">
                      <label>Número de Factura</label>
                      <div class="info-value">{{ invoice.number }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="info-field">
                      <label>Monto Total</label>
                      <div class="info-value amount">Q{{ formatNumber(invoice.amount) }}</div>
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
                      <label>Fecha de Vencimiento</label>
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
                  <div class="info-value">{{ invoice.supplier?.business_name }}</div>
                  <div class="info-subtitle">NIT: {{ invoice.supplier?.nit }}</div>
                </div>

                <div class="info-field" v-if="invoice.assignedUser">
                  <label>Asignado a</label>
                  <div class="info-value">{{ invoice.assignedUser.name }}</div>
                  <div class="info-subtitle">{{ invoice.assignedUser.email }}</div>
                </div>

                <div class="info-field">
                  <label>Prioridad</label>
                  <v-chip 
                    :color="getPriorityColor(invoice.priority)" 
                    size="small"
                    class="priority-chip"
                  >
                    {{ getPriorityText(invoice.priority) }}
                  </v-chip>
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
                      <v-icon color="primary">{{ getFileIcon(file.mimetype) }}</v-icon>
                    </template>
                    <v-list-item-title>{{ file.originalName }}</v-list-item-title>
                    <v-list-item-subtitle>{{ formatFileSize(file.size) }}</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn
                        variant="outlined"
                        size="small"
                        color="primary"
                        @click="downloadOriginalFile(file)"
                      >
                        <v-icon class="mr-1">mdi-download</v-icon>
                        Descargar
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
                <v-list>
                  <!-- Retención ISR -->
                  <v-list-item v-if="hasDocument('isr')" class="document-item">
                    <template v-slot:prepend>
                      <v-icon color="blue">mdi-file-document</v-icon>
                    </template>
                    <v-list-item-title>Retención ISR</v-list-item-title>
                    <v-list-item-subtitle>Constancia de retención del impuesto</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn
                        variant="outlined"
                        size="small"
                        color="blue"
                        @click="downloadISR"
                      >
                        <v-icon class="mr-1">mdi-download</v-icon>
                        Descargar
                      </v-btn>
                    </template>
                  </v-list-item>

                  <!-- Retención IVA -->
                  <v-list-item v-if="hasDocument('iva')" class="document-item">
                    <template v-slot:prepend>
                      <v-icon color="cyan">mdi-file-certificate</v-icon>
                    </template>
                    <v-list-item-title>Retención IVA</v-list-item-title>
                    <v-list-item-subtitle>Constancia de retención del IVA</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn
                        variant="outlined"
                        size="small"
                        color="cyan"
                        @click="downloadIVA"
                      >
                        <v-icon class="mr-1">mdi-download</v-icon>
                        Descargar
                      </v-btn>
                    </template>
                  </v-list-item>

                  <!-- Comprobante de pago -->
                  <v-list-item v-if="hasDocument('proof')" class="document-item">
                    <template v-slot:prepend>
                      <v-icon color="green">mdi-receipt</v-icon>
                    </template>
                    <v-list-item-title>Comprobante de Pago</v-list-item-title>
                    <v-list-item-subtitle>Comprobante final del pago</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn
                        variant="outlined"
                        size="small"
                        color="green"
                        @click="downloadProof"
                      >
                        <v-icon class="mr-1">mdi-download</v-icon>
                        Descargar
                      </v-btn>
                    </template>
                  </v-list-item>

                  <!-- Mensaje si no hay documentos -->
                  <v-list-item v-if="!hasAnyDocuments()" class="no-documents">
                    <template v-slot:prepend>
                      <v-icon color="#e2e8f0">mdi-file-outline</v-icon>
                    </template>
                    <v-list-item-title>No hay documentos generados</v-list-item-title>
                    <v-list-item-subtitle>Los documentos aparecerán según avance el proceso</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Historial de estados -->
        <v-row>
          <v-col cols="12">
            <v-card class="history-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-history</v-icon>
                Historial de Estados
              </v-card-title>
              <v-card-text class="pa-6">
                <v-timeline>
                  <v-timeline-item
                    v-for="(state, index) in invoice.states"
                    :key="index"
                    :dot-color="getStatusColor(state.to_state)"
                    size="small"
                  >
                    <template v-slot:opposite>
                      <div class="timeline-time">
                        {{ formatDateTime(state.timestamp) }}
                      </div>
                    </template>
                    <div class="timeline-content">
                      <div class="timeline-title">
                        {{ getStatusText(state.to_state) }}
                      </div>
                      <div class="timeline-subtitle" v-if="state.user">
                        Por: {{ state.user.name }}
                      </div>
                      <div class="timeline-notes" v-if="state.notes">
                        {{ state.notes }}
                      </div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <div v-else class="error-container">
        <v-alert type="error" variant="tonal">
          No se pudo cargar la información de la factura
        </v-alert>
      </div>
    </v-container>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useInvoiceDetail } from '../scripts/invoice-detail.js'

const {
  // Reactive state
  loading,
  invoice,
  
  // Stores
  authStore,
  
  // Computed properties
  canManage,
  
  // Functions
  loadInvoice,
  hasDocument,
  hasAnyDocuments,
  downloadOriginalFile,
  downloadISR,
  downloadIVA,
  downloadProof,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  getFileIcon,
  formatNumber,
  formatDate,
  formatDateTime,
  formatFileSize,
  initializeInvoiceDetail
} = useInvoiceDetail()

onMounted(initializeInvoiceDetail)
</script>

<style src="../styles/invoice-detail.css" scoped></style>

