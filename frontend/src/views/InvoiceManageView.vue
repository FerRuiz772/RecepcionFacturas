<!-- InvoiceManageView.vue
Propósito: Vista especializada para la gestión documental completa de una factura específica.

Funcionalidades principales:

Visualización y edición de información de facturas

Gestión de documentos obligatorios (retención ISR, retención IVA)

Subida de comprobantes de pago y documentos de contraseña

Progreso del proceso documental

Rechazo de facturas (para contaduría/administradores) -->



<!-- InvoiceManageView.vue - Versión Mejorada -->
<template>
  <div class="accounting-layout">
    <!-- Breadcrumb -->
    <div class="breadcrumb-container">
      <v-container>
        <div class="d-flex align-center">
          <router-link to="/dashboard" class="breadcrumb-item">Dashboard</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <router-link to="/invoices" class="breadcrumb-item">Facturas</router-link>
          <v-icon size="16" color="#cbd5e1" class="mx-2">mdi-chevron-right</v-icon>
          <span class="breadcrumb-item active">Gestión Documentos</span>
        </div>
      </v-container>
    </div>

    <!-- Header de página -->
    <div class="page-header">
      <v-container>
        <div class="header-content">
          <div class="header-left">
            <div class="title-section">
              <h1 class="page-title">Gestión de Documentos</h1>
              <p class="page-subtitle" v-if="invoice">
                Factura {{ invoice.number }} - {{ invoice.supplier?.business_name }}
              </p>
            </div>
          </div>
          <div class="header-right">
            <v-btn 
              variant="outlined"
              @click="$router.go(-1)"
              prepend-icon="mdi-arrow-left"
              class="back-btn"
            >
              Volver
            </v-btn>
            <v-btn
              v-if="authStore.isContaduria || authStore.isAdmin"
              color="error"
              variant="outlined"
              class="ml-2 reject-btn"
              @click="openRejectDialog"
            >
              <v-icon left>mdi-close-circle</v-icon>
              Rechazar factura
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
        <!-- Información de la factura -->
        <v-row class="mb-6">
          <v-col cols="12">
            <v-card class="invoice-info-card" elevation="2">
              <v-card-title class="card-title-bg d-flex justify-space-between align-center">
                <div class="d-flex align-center">
                  <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                  Información de la Factura
                </div>
                <div v-if="!editMode">
                  <v-btn 
                    variant="outlined" 
                    size="small" 
                    @click="startEdit"
                    prepend-icon="mdi-pencil"
                    class="edit-btn"
                  >
                    Editar
                  </v-btn>
                </div>
                <div v-else class="d-flex gap-2">
                  <v-btn 
                    variant="outlined" 
                    size="small" 
                    @click="cancelEdit"
                    :disabled="saving"
                  >
                    Cancelar
                  </v-btn>
                  <v-btn 
                    color="primary" 
                    size="small" 
                    @click="saveEdit"
                    :loading="saving"
                    prepend-icon="mdi-content-save"
                  >
                    Guardar
                  </v-btn>
                </div>
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row v-if="!editMode">
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>Número de Factura</label>
                      <div class="info-value invoice-number">{{ invoice.number }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>Monto Total</label>
                      <div class="info-value amount">Q{{ formatNumber(invoice.amount) }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>Estado Actual</label>
                      <v-chip
                        :color="getStatusColor(invoice.status)"
                        size="small"
                        class="status-chip"
                      >
                        {{ getStatusText(invoice.status) }}
                      </v-chip>
                    </div>
                  </v-col>
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>Proveedor</label>
                      <div class="info-value">{{ invoice.supplier?.business_name }}</div>
                      <div class="info-subtitle">NIT: {{ invoice.supplier?.nit }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12">
                    <div class="info-field">
                      <label>Descripción</label>
                      <div class="info-value description">
                        {{ invoice.description || 'Sin descripción' }}
                        <v-chip 
                          v-if="!invoice.description || invoice.description.trim() === ''"
                          color="warning"
                          size="small"
                          class="ml-2"
                        >
                          Pendiente de completar
                        </v-chip>
                      </div>
                    </div>
                  </v-col>
                </v-row>
                
                <!-- Modo de edición -->
                <v-row v-else>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.amount"
                      label="Monto"
                      type="number"
                      step="0.01"
                      min="0.01"
                      prepend-inner-icon="mdi-currency-usd"
                      variant="outlined"
                      density="compact"
                      :disabled="saving"
                      required
                      :rules="[
                        v => !!v || 'El monto es requerido',
                        v => parseFloat(v) > 0 || 'El monto debe ser mayor a 0'
                      ]"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="editForm.priority"
                      label="Prioridad"
                      :items="[
                        { title: 'Baja', value: 'baja' },
                        { title: 'Media', value: 'media' },
                        { title: 'Alta', value: 'alta' },
                        { title: 'Urgente', value: 'urgente' }
                      ]"
                      variant="outlined"
                      density="compact"
                      :disabled="saving"
                    />
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model="editForm.due_date"
                      label="Fecha de Vencimiento"
                      type="date"
                      variant="outlined"
                      density="compact"
                      :disabled="saving"
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.serie"
                      label="Número de Serie"
                      variant="outlined"
                      density="compact"
                      :disabled="saving"
                      hint="Ejemplo: A001, Serie-2024, etc."
                      persistent-hint
                      clearable
                    />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="editForm.numero_dte"
                      label="Número de DTE"
                      variant="outlined"
                      density="compact"
                      :disabled="saving"
                      hint="Documento Tributario Electrónico"
                      persistent-hint
                      clearable
                    />
                  </v-col>
                  <v-col cols="12">
                    <v-alert
                      type="info"
                      variant="tonal"
                      density="compact"
                      class="mb-3"
                      icon="mdi-information-outline"
                    >
                      <span class="text-body-2">
                        <strong>Importante:</strong> Complete la descripción con detalles específicos de la factura 
                        (productos/servicios, fechas relevantes, observaciones especiales, etc.)
                      </span>
                    </v-alert>
                    <v-textarea
                      v-model="editForm.description"
                      label="Descripción"
                      variant="outlined"
                      density="compact"
                      rows="3"
                      :disabled="saving"
                      required
                      placeholder="Describa detalladamente los productos/servicios de esta factura..."
                    />
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Layout Principal: Factura + Gestión de Documentos -->
        <v-row>
          <!-- Visualización de la Factura Original -->
          <v-col cols="12" lg="6">
            <v-card class="invoice-viewer-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-file-pdf-box</v-icon>
                Factura Original
              </v-card-title>
              <v-card-text class="pa-0">
                <div v-if="!invoice.uploaded_files || invoice.uploaded_files.length === 0" class="no-files-display">
                  <v-icon size="80" color="#e2e8f0">mdi-file-outline</v-icon>
                  <p class="mt-4 text-grey">No hay archivos disponibles para visualizar</p>
                </div>
                <div v-else class="invoice-frame-container">
                  <!-- Lista de archivos si hay múltiples -->
                  <div v-if="invoice.uploaded_files.length > 1" class="file-selector pa-4">
                    <v-select
                      v-model="selectedFileIndex"
                      :items="fileOptions"
                      label="Seleccionar archivo"
                      variant="outlined"
                      density="compact"
                      prepend-icon="mdi-file-document-multiple"
                    ></v-select>
                  </div>
                  
                  <!-- Visualizador del archivo -->
                  <div class="file-viewer">
                    <iframe
                      v-if="currentFileUrl"
                      :src="currentFileUrl"
                      width="100%"
                      height="500"
                      frameborder="0"
                      @error="handleFrameError"
                      class="document-frame"
                    ></iframe>
                    <div v-else class="frame-error pa-6 text-center">
                      <v-icon size="48" color="warning">mdi-alert-circle</v-icon>
                      <p class="mt-3">No se puede visualizar este archivo</p>
                      <v-btn 
                        variant="outlined" 
                        color="primary" 
                        @click="downloadCurrentFile"
                        prepend-icon="mdi-download"
                        class="mt-3"
                      >
                        Descargar Archivo
                      </v-btn>
                    </div>
                  </div>
                  
                  <!-- Controles adicionales -->
                  <div class="file-controls pa-4 d-flex justify-space-between">
                    <div class="file-actions">
                      <v-btn 
                        variant="outlined" 
                        color="primary" 
                        @click="downloadCurrentFile"
                        prepend-icon="mdi-download"
                        size="small"
                      >
                        Descargar
                      </v-btn>
                      <v-btn 
                        variant="outlined" 
                        color="secondary" 
                        @click="openInNewTab"
                        prepend-icon="mdi-open-in-new"
                        size="small"
                        class="ml-2"
                      >
                        Abrir en nueva pestaña
                      </v-btn>
                    </div>
                    <v-btn
                      v-if="authStore.isContaduria || authStore.isAdmin"
                      variant="outlined"
                      color="error"
                      size="small"
                      @click="openRejectDialog"
                      prepend-icon="mdi-close-circle"
                    >
                      Rechazar
                    </v-btn>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Panel de Gestión de Documentos -->
          <v-col cols="12" lg="6">
            <v-card class="documents-management-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-file-document-multiple</v-icon>
                Gestión de Documentos
                <v-spacer></v-spacer>
                <v-chip 
                  :color="getCompletionColor()" 
                  size="small"
                  class="completion-indicator"
                >
                  {{ getCompletionText() }}
                </v-chip>
              </v-card-title>
              <v-card-text class="pa-6">
                
                <!-- Progreso general -->
                <div class="progress-section mb-6">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-subtitle-2 font-weight-medium">Progreso del Proceso</span>
                    <span class="text-caption font-weight-bold">{{ documentsProgress }}%</span>
                  </div>
                  <v-progress-linear
                    :model-value="documentsProgress"
                    :color="getProgressColor()"
                    height="10"
                    rounded
                    class="mb-2"
                  ></v-progress-linear>
                  <div class="text-center">
                    <v-chip 
                      :color="getCompletionColor()" 
                      size="small" 
                      variant="tonal"
                      class="font-weight-bold"
                    >
                      {{ getCompletionText() }}
                    </v-chip>
                  </div>
                </div>

                <!-- Documentos Requeridos -->
                <div class="required-documents">
                  <h3 class="section-title mb-4">
                    <v-icon class="mr-2" color="error">mdi-asterisk</v-icon>
                    Documentos Obligatorios
                  </h3>

                  <!-- Retención ISR - CONDICIONAL -->
                  <div v-if="invoice?.supplier?.regimen_isr" class="document-upload-item mb-4">
                    <div class="document-header d-flex justify-space-between align-center mb-2">
                      <div class="document-info d-flex align-center">
                        <v-icon color="indigo" class="mr-3">mdi-file-percent</v-icon>
                        <div>
                          <h4 class="mb-1">Retención ISR</h4>
                          <p class="text-caption mb-0">Constancia de retención del Impuesto Sobre la Renta</p>
                        </div>
                      </div>
                      <div class="document-status">
                        <v-chip 
                          :color="hasDocument('isr') ? 'success' : 'warning'" 
                          size="small"
                          variant="tonal"
                        >
                          {{ hasDocument('isr') ? 'Completado' : 'Pendiente' }}
                        </v-chip>
                      </div>
                    </div>
                    
                    <div v-if="hasDocument('isr')" class="document-completed">
                      <v-alert type="success" variant="tonal" density="compact" class="mb-0">
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-caption">Documento subido exitosamente</span>
                          <div>
                            <v-btn 
                              variant="text" 
                              color="primary" 
                              size="small"
                              @click="downloadISR"
                              prepend-icon="mdi-download"
                            >
                              Descargar
                            </v-btn>
                            <v-btn 
                              variant="text" 
                              color="warning" 
                              size="small"
                              @click="triggerReplaceISR"
                              prepend-icon="mdi-refresh"
                              class="ml-1"
                            >
                              Reemplazar
                            </v-btn>
                          </div>
                        </div>
                      </v-alert>
                    </div>
                    
                    <div v-else class="document-upload">
                      <input
                        ref="isrFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleISRUpload"
                      >
                      <v-btn 
                        color="indigo"
                        variant="outlined"
                        @click="$refs.isrFileInput?.click()"
                        :loading="uploadingISR"
                        prepend-icon="mdi-upload"
                        block
                        size="small"
                      >
                        Subir Retención ISR
                      </v-btn>
                    </div>
                  </div>

                  <!-- Retención IVA -->
                  <div class="document-upload-item mb-4">
                    <div class="document-header d-flex justify-space-between align-center mb-2">
                      <div class="document-info d-flex align-center">
                        <v-icon color="teal" class="mr-3">mdi-file-percent</v-icon>
                        <div>
                          <h4 class="mb-1">Retención IVA</h4>
                          <p class="text-caption mb-0">Constancia de retención del Impuesto al Valor Agregado</p>
                        </div>
                      </div>
                      <div class="document-status">
                        <v-chip 
                          :color="hasDocument('iva') ? 'success' : 'warning'" 
                          size="small"
                          variant="tonal"
                        >
                          {{ hasDocument('iva') ? 'Completado' : 'Pendiente' }}
                        </v-chip>
                      </div>
                    </div>
                    
                    <div v-if="hasDocument('iva')" class="document-completed">
                      <v-alert type="success" variant="tonal" density="compact" class="mb-0">
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-caption">Documento subido exitosamente</span>
                          <div>
                            <v-btn 
                              variant="text" 
                              color="primary" 
                              size="small"
                              @click="downloadIVA"
                              prepend-icon="mdi-download"
                            >
                              Descargar
                            </v-btn>
                            <v-btn 
                              variant="text" 
                              color="warning" 
                              size="small"
                              @click="triggerReplaceIVA"
                              prepend-icon="mdi-refresh"
                              class="ml-1"
                            >
                              Reemplazar
                            </v-btn>
                          </div>
                        </div>
                      </v-alert>
                    </div>
                    
                    <div v-else class="document-upload">
                      <input
                        ref="ivaFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleIVAUpload"
                      >
                      <v-btn 
                        color="teal"
                        variant="outlined"
                        @click="$refs.ivaFileInput?.click()"
                        :loading="uploadingIVA"
                        prepend-icon="mdi-upload"
                        block
                        size="small"
                      >
                        Subir Retención IVA
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Comprobante de Pago -->
                <div class="payment-documents">
                  <h3 class="section-title mb-4">
                    <v-icon class="mr-2" color="success">mdi-file-document-check</v-icon>
                    Comprobante de Pago
                  </h3>

                  <div class="document-upload-item mb-4">
                    <div class="document-header d-flex justify-space-between align-center mb-2">
                      <div class="document-info d-flex align-center">
                        <v-icon color="success" class="mr-3">mdi-receipt</v-icon>
                        <div>
                          <h4 class="mb-1">Comprobante de Pago</h4>
                          <p class="text-caption mb-0">Comprobante final del pago realizado</p>
                        </div>
                      </div>
                      <div class="document-status">
                        <v-chip 
                          :color="hasDocument('proof') ? 'success' : 'warning'" 
                          size="small"
                          variant="tonal"
                        >
                          {{ hasDocument('proof') ? 'Subido' : 'Pendiente' }}
                        </v-chip>
                      </div>
                    </div>
                    
                    <div v-if="hasDocument('proof')" class="document-completed">
                      <v-alert type="success" variant="tonal" density="compact" class="mb-0">
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-caption">Comprobante de pago subido</span>
                          <div>
                            <v-btn 
                              variant="text" 
                              color="primary" 
                              size="small"
                              @click="downloadProof"
                              prepend-icon="mdi-download"
                            >
                              Descargar
                            </v-btn>
                            <v-btn 
                              variant="text" 
                              color="warning" 
                              size="small"
                              @click="triggerReplaceProof"
                              prepend-icon="mdi-refresh"
                              class="ml-1"
                            >
                              Reemplazar
                            </v-btn>
                          </div>
                        </div>
                      </v-alert>
                    </div>
                    
                    <div v-else class="document-upload">
                      <input
                        ref="proofFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleProofUpload"
                      >
                      <v-btn 
                        color="success"
                        variant="outlined"
                        @click="$refs.proofFileInput?.click()"
                        :loading="uploadingProof"
                        prepend-icon="mdi-upload"
                        block
                        size="small"
                      >
                        Subir Comprobante de Pago
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Documento de Contraseña -->
                <div class="password-documents">
                  <h3 class="section-title mb-4">
                    <v-icon class="mr-2" color="purple">mdi-key-variant</v-icon>
                    Documento de Contraseña
                  </h3>

                  <div class="document-upload-item mb-4">
                    <div class="document-header d-flex justify-space-between align-center mb-2">
                      <div class="document-info d-flex align-center">
                        <v-icon color="purple" class="mr-3">mdi-lock</v-icon>
                        <div>
                          <h4 class="mb-1">Documento de Contraseña</h4>
                          <p class="text-caption mb-0">Documento físico con contraseña de acceso</p>
                        </div>
                      </div>
                      <div class="document-status">
                        <v-chip 
                          :color="hasPasswordFile ? 'success' : 'warning'" 
                          size="small"
                          variant="tonal"
                        >
                          {{ hasPasswordFile ? 'Subido' : 'Pendiente' }}
                        </v-chip>
                      </div>
                    </div>
                    
                    <div v-if="hasPasswordFile" class="document-completed">
                      <v-alert type="success" variant="tonal" density="compact" class="mb-0">
                        <div class="d-flex justify-space-between align-center">
                          <span class="text-caption">Documento de contraseña subido</span>
                          <div>
                            <v-btn 
                              variant="text" 
                              color="primary" 
                              size="small"
                              @click="downloadPassword"
                              prepend-icon="mdi-download"
                            >
                              Descargar
                            </v-btn>
                            <v-btn 
                              variant="text" 
                              color="warning" 
                              size="small"
                              @click="triggerReplacePassword"
                              prepend-icon="mdi-refresh"
                              class="ml-1"
                            >
                              Reemplazar
                            </v-btn>
                          </div>
                        </div>
                      </v-alert>
                    </div>
                    
                    <div v-else class="document-upload">
                      <input
                        ref="passwordFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handlePasswordUpload"
                      >
                      <v-btn 
                        color="purple"
                        variant="outlined"
                        @click="$refs.passwordFileInput?.click()"
                        :loading="uploadingPassword"
                        prepend-icon="mdi-upload"
                        block
                        size="small"
                      >
                        Subir Documento de Contraseña
                      </v-btn>
                    </div>
                  </div>
                </div>
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

    <!-- Inputs ocultos para reemplazo de documentos -->
    <input 
      id="replace-isr-input" 
      type="file" 
      accept=".pdf" 
      style="display: none" 
      @change="replaceISR"
    />
    <input 
      id="replace-iva-input" 
      type="file" 
      accept=".pdf" 
      style="display: none" 
      @change="replaceIVA"
    />
    <input 
      id="replace-proof-input" 
      type="file" 
      accept=".pdf" 
      style="display: none" 
      @change="replaceProof"
    />
    <input 
      id="replace-password-input" 
      type="file" 
      accept=".pdf" 
      style="display: none" 
      @change="replacePassword"
    />

    <!-- Dialog para rechazar factura -->
    <v-dialog v-model="rejectDialog" max-width="600">
      <v-card>
        <v-card-title class="card-title-bg">
          <v-icon class="mr-2">mdi-close-circle</v-icon>
          Rechazar Factura
        </v-card-title>
        <v-card-text class="pa-6">
          <v-alert type="warning" variant="tonal" class="mb-4">
            Esta acción notificará al proveedor y cambiará el estado de la factura a "Rechazada".
          </v-alert>
          <v-textarea 
            v-model="rejectReason" 
            label="Motivo del rechazo" 
            rows="4" 
            auto-grow 
            required
            variant="outlined"
            placeholder="Describa detalladamente el motivo del rechazo..."
          />
        </v-card-text>
        <v-card-actions class="pa-6 pt-0">
          <v-spacer />
          <v-btn variant="outlined" @click="rejectDialog = false">Cancelar</v-btn>
          <v-btn color="error" @click="confirmReject" :disabled="!rejectReason.trim()">
            Confirmar Rechazo
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
// El script se mantiene igual que en la versión original
import { onMounted, ref } from 'vue'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { useInvoiceManage } from '../scripts/invoice-manage.js'
import { useAuthStore } from '../stores/auth.js'

const {
  // Estado reactivo
  loading,
  invoice,
  isrFile,
  ivaFile,
  proofFile,
  passwordFile,
  uploadingPassword,
  replaceFile,
  replaceDialog,
  selectedFileIndex,
  generatingPassword,
  uploadingISR,
  uploadingIVA,
  uploadingProof,
  replacingFile,
  
  // Edit state
  editMode,
  editForm,
  saving,
  
  // Computed properties
  canGeneratePassword,
  canUploadISR,
  canUploadIVA,
  canUploadProof,
  fileOptions,
  currentFile,
  currentFileUrl,
  hasPasswordFile,
  documentsProgress,
  
  // Funciones
  loadInvoice,
  hasDocument,
  generatePassword,
  copyPassword,
  uploadISRFile,
  uploadIVAFile,
  uploadProofFile,
  uploadPasswordFile,
  handleISRUpload,
  handleIVAUpload,
  handleProofUpload,
  handlePasswordUpload,
  triggerReplaceISR,
  triggerReplaceIVA,
  triggerReplaceProof,
  triggerReplacePassword,
  replaceISR,
  replaceIVA,
  replaceProof,
  replacePassword,
  downloadOriginalFile,
  downloadCurrentFile,
  downloadISR,
  downloadIVA,
  downloadProof,
  downloadPassword,
  openInNewTab,
  handleFrameError,
  getProgressColor,
  getCompletionText,
  getCompletionColor,
  getStatusColor,
  getStatusText,
  getPriorityColor,
  getPriorityText,
  getFileIcon,
  getFileName,
  formatNumber,
  formatFileSize,
  startEdit,
  cancelEdit,
  saveEdit,
  initializeInvoiceManage
} = useInvoiceManage()
const toast = useToast()

// Auth store to control role-based UI
const authStore = useAuthStore()

// Rechazar dialog state and action exposed from composition
const rejectDialog = ref(false)
const rejectReason = ref('')

const openRejectDialog = () => {
  rejectReason.value = ''
  rejectDialog.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value || rejectReason.value.trim() === '') {
    // simple client-side validation
    return toast.error('Debe proporcionar una razón para rechazar la factura')
  }
  try {
    const token = localStorage.getItem('token')
    await axios.put(`/api/invoices/${invoice.value.id}/reject`, { reason: rejectReason.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    rejectDialog.value = false
    // Refresh invoice
    await loadInvoice()
    toast.success('Factura marcada como rechazada y se notificó al proveedor')
  } catch (error) {
    console.error('Error rechazando factura:', error)
    toast.error(error.response?.data?.error || 'Error al rechazar la factura')
  }
}

onMounted(initializeInvoiceManage)
</script>

<style scoped src="../styles/invoice-manage.css"></style>