<!-- InvoiceDetailView.vue
Propósito: Vista de solo lectura para ver los detalles completos de una factura.

Funcionalidades principales:

Información general de la factura

Visualización de archivos originales

Lista de documentos generados

Historial de estados y cambios

Redirección a la vista de gestión -->

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
        <div class="header-content">
          <div class="header-left">
            <v-btn 
              variant="outlined"
              @click="$router.go(-1)"
              prepend-icon="mdi-arrow-left"
              class="back-btn"
            >
              Volver
            </v-btn>
            <div class="title-section">
              <h1 class="page-title">Detalle de Factura</h1>
              <p class="page-subtitle" v-if="invoice">
                {{ invoice.number }} - {{ invoice.supplier?.business_name }}
              </p>
            </div>
          </div>
          <div class="header-right">
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
                  <v-col cols="12" md="6" v-if="invoice.payment && invoice.payment.password_generated">
                    <div class="info-field">
                      <label>Contraseña</label>
                      <div class="info-value">{{ invoice.payment.password_generated }}</div>
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
                  <v-col cols="12" md="6">
                    <div class="info-field">
                      <label>Número de Serie</label>
                      <div class="info-value">{{ invoice.serie || 'No especificado' }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="6">
                    <div class="info-field">
                      <label>Número de DTE</label>
                      <div class="info-value">{{ invoice.numero_dte || 'No especificado' }}</div>
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
          <v-col cols="12" lg="8">
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
                      <div class="d-flex gap-2 align-center">
                        <v-btn
                          variant="outlined"
                          size="small"
                          color="primary"
                          @click="downloadOriginalFile(file)"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>

                        <!-- Reemplazar: botón por cada archivo, en la misma línea -->
                        <div v-if="authStore.isProveedor && invoice.supplier_id === authStore.user?.supplier_id">
                          <v-btn
                            variant="outlined"
                            size="small"
                            color="warning"
                            @click.prevent="triggerReplaceOriginal(index)"
                          >
                            <v-icon small class="mr-1">mdi-file-replace</v-icon>
                            Reemplazar
                          </v-btn>
                          <input :id="'replace-original-input-' + index" type="file" accept="application/pdf" style="display:none" @change="handleReplaceOriginal($event, file.filename)" />
                        </div>
                      </div>
                    </template>
                  </v-list-item>
                </v-list>
                <!-- Fin lista de archivos originales -->
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Documentos generados -->
          <v-col cols="12" lg="4">
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
                      <div class="d-flex gap-2">
                        <v-btn
                          variant="outlined"
                          size="small"
                          color="blue"
                          @click="downloadISR"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>

                        <!-- Reemplazar ISR: solo visible para el proveedor dueño de la factura -->
                        <div v-if="authStore.isProveedor && invoice.supplier_id === authStore.user?.supplier_id">
                          <v-btn
                            variant="outlined"
                            size="small"
                            color="warning"
                            @click.prevent="triggerReplaceISR"
                          >
                            <v-icon class="mr-1">mdi-file-replace</v-icon>
                            Reemplazar
                          </v-btn>
                          <input id="replace-isr-input" type="file" accept="application/pdf" style="display:none" @change="replaceISR" />
                        </div>
                      </div>
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
                      <div class="d-flex gap-2">
                        <v-btn
                          variant="outlined"
                          size="small"
                          color="cyan"
                          @click="downloadIVA"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>

                        <!-- Reemplazar IVA: solo visible para el proveedor dueño de la factura -->
                        <div v-if="authStore.isProveedor && invoice.supplier_id === authStore.user?.supplier_id">
                          <v-btn
                            variant="outlined"
                            size="small"
                            color="warning"
                            @click.prevent="triggerReplaceIVA"
                          >
                            <v-icon class="mr-1">mdi-file-replace</v-icon>
                            Reemplazar
                          </v-btn>
                          <input id="replace-iva-input" type="file" accept="application/pdf" style="display:none" @change="replaceIVA" />
                        </div>
                      </div>
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
                      <div class="d-flex gap-2">
                        <v-btn
                          variant="outlined"
                          size="small"
                          color="green"
                          @click="downloadProof"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>

                        <!-- Reemplazar comprobante: solo visible para el proveedor dueño de la factura -->
                        <div v-if="authStore.isProveedor && invoice.supplier_id === authStore.user?.supplier_id">
                          <v-btn
                            variant="outlined"
                            size="small"
                            color="warning"
                            @click.prevent="triggerReplaceProof"
                          >
                            <v-icon class="mr-1">mdi-file-replace</v-icon>
                            Reemplazar
                          </v-btn>
                          <input id="replace-proof-input" type="file" accept="application/pdf" style="display:none" @change="replaceProof" />
                        </div>
                      </div>
                    </template>
                  </v-list-item>

                  <!-- Archivo de contraseña -->
                  <v-list-item v-if="hasDocument('password')" class="document-item">
                    <template v-slot:prepend>
                      <v-icon color="purple">mdi-key</v-icon>
                    </template>
                    <v-list-item-title>Archivo de Contraseña</v-list-item-title>
                    <v-list-item-subtitle>Documento con información de acceso</v-list-item-subtitle>
                    <template v-slot:append>
                      <div class="d-flex gap-2">
                        <v-btn
                          variant="outlined"
                          size="small"
                          color="purple"
                          @click="downloadPassword"
                        >
                          <v-icon class="mr-1">mdi-download</v-icon>
                          Descargar
                        </v-btn>

                        <!-- Reemplazar contraseña: solo visible para el proveedor dueño de la factura -->
                        <div v-if="authStore.isProveedor && invoice.supplier_id === authStore.user?.supplier_id">
                          <v-btn
                            variant="outlined"
                            size="small"
                            color="warning"
                            @click.prevent="triggerReplacePassword"
                          >
                            <v-icon class="mr-1">mdi-file-replace</v-icon>
                            Reemplazar
                          </v-btn>
                          <input id="replace-password-input" type="file" accept="application/pdf" style="display:none" @change="replacePassword" />
                        </div>
                      </div>
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

        <!-- Comentarios (chat) -->
        <v-row class="mb-6">
          <v-col cols="12">
            <InvoiceComments :invoice-id="invoice.id" />
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
import InvoiceComments from '../components/InvoiceComments.vue'

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
  downloadPassword,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  getFileIcon,
  formatNumber,
  formatDate,
  formatDateTime,
  formatFileSize,
  initializeInvoiceDetail,
  replacingFile,
  triggerReplaceISR,
  triggerReplaceIVA,
  triggerReplaceProof,
  triggerReplacePassword,
  replaceISR,
  replaceIVA,
  replaceProof,
  replacePassword
  ,replaceOriginal
} = useInvoiceDetail()

onMounted(initializeInvoiceDetail)

// Handler para el input de reemplazo original
const handleReplaceOriginal = async (event, originalFilename) => {
  const file = event.target.files[0]
  if (!file) return
  try {
    await replaceOriginal(file, originalFilename)
  } catch (err) {
    // ya manejado en composable
  } finally {
    event.target.value = ''
  }
}

// Trigger para abrir el selector de archivo original de forma segura
const triggerReplaceOriginal = (index) => {
  try {
    const el = document.getElementById('replace-original-input-' + index)
    if (el) el.click()
  } catch (err) {
    // En entornos muy aislados document podría no estar disponible; mostrar aviso en consola
    console.error('No se pudo abrir el selector de archivos:', err)
  }
}
</script>

<style src="../styles/invoice-detail.css" scoped></style>

