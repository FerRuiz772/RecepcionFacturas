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
          <span class="breadcrumb-item active">GestiÃ³n Documentos</span>
        </div>
      </v-container>
    </div>

    <!-- Header de pÃ¡gina -->
    <div class="page-header">
      <v-container>
        <div class="d-flex align-center justify-space-between">
          <div>
            <h1 class="page-title">GestiÃ³n de Documentos</h1>
            <p class="page-subtitle" v-if="invoice">
              Factura {{ invoice.number }} - {{ invoice.supplier?.business_name }}
            </p>
          </div>
          <div>
            <v-btn 
              variant="outlined"
              @click="$router.go(-1)"
              prepend-icon="mdi-arrow-left"
              class="back-btn"
            >
              Volver
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
        <p class="mt-4">Cargando informaciÃ³n de la factura...</p>
      </div>

      <div v-else-if="invoice">
        <!-- InformaciÃ³n de la factura -->
        <v-row class="mb-6">
          <v-col cols="12">
            <v-card class="invoice-info-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                InformaciÃ³n de la Factura
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row>
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>NÃºmero de Factura</label>
                      <div class="info-value">{{ invoice.number }}</div>
                    </div>
                  </v-col>
                  <v-col cols="12" md="3">
                    <div class="info-field">
                      <label>Monto</label>
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
                </v-row>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Workflow de documentos -->
        <v-row>
          <v-col cols="12">
            <v-card class="workflow-card" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-file-document-multiple</v-icon>
                Workflow de Documentos
              </v-card-title>
              <v-card-text class="pa-6">
                <!-- Paso 1: Generar ContraseÃ±a -->
                <div class="workflow-step" :class="{ 'completed': isStepCompleted('password') }">
                  <div class="step-header">
                    <div class="step-number">1</div>
                    <div class="step-info">
                      <h3>Generar ContraseÃ±a de Pago</h3>
                      <p>Genera la contraseÃ±a Ãºnica para el pago de esta factura</p>
                    </div>
                    <div class="step-status">
                      <v-icon v-if="isStepCompleted('password')" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else color="warning">mdi-clock-outline</v-icon>
                    </div>
                  </div>
                  <div class="step-content">
                    <div v-if="!canGeneratePassword()" class="step-disabled">
                      <v-alert type="info" variant="tonal">
                        La factura debe estar "En Proceso" para generar contraseÃ±a
                      </v-alert>
                    </div>
                    <div v-else-if="isStepCompleted('password')" class="step-completed">
                      <v-alert type="success" variant="tonal">
                        ContraseÃ±a generada exitosamente
                      </v-alert>
                    </div>
                    <div v-else class="step-actions">
                      <v-btn 
                        color="primary"
                        @click="generatePassword"
                        :loading="generatingPassword"
                        prepend-icon="mdi-key"
                      >
                        Generar ContraseÃ±a
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Paso 2: Subir RetenciÃ³n ISR -->
                <div class="workflow-step" :class="{ 'completed': isStepCompleted('isr') }">
                  <div class="step-header">
                    <div class="step-number">2</div>
                    <div class="step-info">
                      <h3>Subir RetenciÃ³n ISR</h3>
                      <p>Sube la constancia de retenciÃ³n del Impuesto Sobre la Renta</p>
                    </div>
                    <div class="step-status">
                      <v-icon v-if="isStepCompleted('isr')" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else-if="canUploadISR()" color="warning">mdi-clock-outline</v-icon>
                      <v-icon v-else color="grey">mdi-lock</v-icon>
                    </div>
                  </div>
                  <div class="step-content">
                    <div v-if="!canUploadISR()" class="step-disabled">
                      <v-alert type="info" variant="tonal">
                        Primero debe generar la contraseÃ±a de pago
                      </v-alert>
                    </div>
                    <div v-else-if="isStepCompleted('isr')" class="step-completed">
                      <v-alert type="success" variant="tonal">
                        RetenciÃ³n ISR subida exitosamente
                      </v-alert>
                      <v-btn 
                        variant="outlined" 
                        color="primary" 
                        @click="downloadISR"
                        prepend-icon="mdi-download"
                        class="mt-3"
                      >
                        Descargar ISR
                      </v-btn>
                    </div>
                    <div v-else class="step-actions">
                      <input
                        ref="isrFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleISRUpload"
                      >
                      <v-btn 
                        color="indigo"
                        @click="$refs.isrFileInput.click()"
                        :loading="uploadingISR"
                        prepend-icon="mdi-upload"
                      >
                        Subir RetenciÃ³n ISR
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Paso 3: Subir RetenciÃ³n IVA -->
                <div class="workflow-step" :class="{ 'completed': isStepCompleted('iva') }">
                  <div class="step-header">
                    <div class="step-number">3</div>
                    <div class="step-info">
                      <h3>Subir RetenciÃ³n IVA</h3>
                      <p>Sube la constancia de retenciÃ³n del Impuesto al Valor Agregado</p>
                    </div>
                    <div class="step-status">
                      <v-icon v-if="isStepCompleted('iva')" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else-if="canUploadIVA()" color="warning">mdi-clock-outline</v-icon>
                      <v-icon v-else color="grey">mdi-lock</v-icon>
                    </div>
                  </div>
                  <div class="step-content">
                    <div v-if="!canUploadIVA()" class="step-disabled">
                      <v-alert type="info" variant="tonal">
                        Primero debe subir la retenciÃ³n ISR
                      </v-alert>
                    </div>
                    <div v-else-if="isStepCompleted('iva')" class="step-completed">
                      <v-alert type="success" variant="tonal">
                        RetenciÃ³n IVA subida exitosamente
                      </v-alert>
                      <v-btn 
                        variant="outlined" 
                        color="primary" 
                        @click="downloadIVA"
                        prepend-icon="mdi-download"
                        class="mt-3"
                      >
                        Descargar IVA
                      </v-btn>
                    </div>
                    <div v-else class="step-actions">
                      <input
                        ref="ivaFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleIVAUpload"
                      >
                      <v-btn 
                        color="teal"
                        @click="$refs.ivaFileInput.click()"
                        :loading="uploadingIVA"
                        prepend-icon="mdi-upload"
                      >
                        Subir RetenciÃ³n IVA
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Paso 4: Marcar Pago Realizado -->
                <div class="workflow-step" :class="{ 'completed': isStepCompleted('payment') }">
                  <div class="step-header">
                    <div class="step-number">4</div>
                    <div class="step-info">
                      <h3>Marcar Pago Realizado</h3>
                      <p>Confirma que el pago ha sido realizado exitosamente</p>
                    </div>
                    <div class="step-status">
                      <v-icon v-if="isStepCompleted('payment')" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else-if="canMarkPaid()" color="warning">mdi-clock-outline</v-icon>
                      <v-icon v-else color="grey">mdi-lock</v-icon>
                    </div>
                  </div>
                  <div class="step-content">
                    <div v-if="!canMarkPaid()" class="step-disabled">
                      <v-alert type="info" variant="tonal">
                        Primero debe subir ambas retenciones (ISR e IVA)
                      </v-alert>
                    </div>
                    <div v-else-if="isStepCompleted('payment')" class="step-completed">
                      <v-alert type="success" variant="tonal">
                        Pago marcado como realizado
                      </v-alert>
                    </div>
                    <div v-else class="step-actions">
                      <v-btn 
                        color="green"
                        @click="markPaymentDone"
                        :loading="markingPayment"
                        prepend-icon="mdi-cash-check"
                      >
                        Marcar Pago Realizado
                      </v-btn>
                    </div>
                  </div>
                </div>

                <v-divider class="my-6"></v-divider>

                <!-- Paso 5: Subir Comprobante -->
                <div class="workflow-step" :class="{ 'completed': isStepCompleted('proof') }">
                  <div class="step-header">
                    <div class="step-number">5</div>
                    <div class="step-info">
                      <h3>Subir Comprobante de Pago</h3>
                      <p>Sube el comprobante final del pago realizado</p>
                    </div>
                    <div class="step-status">
                      <v-icon v-if="isStepCompleted('proof')" color="success">mdi-check-circle</v-icon>
                      <v-icon v-else-if="canUploadProof()" color="warning">mdi-clock-outline</v-icon>
                      <v-icon v-else color="grey">mdi-lock</v-icon>
                    </div>
                  </div>
                  <div class="step-content">
                    <div v-if="!canUploadProof()" class="step-disabled">
                      <v-alert type="info" variant="tonal">
                        Primero debe marcar el pago como realizado
                      </v-alert>
                    </div>
                    <div v-else-if="isStepCompleted('proof')" class="step-completed">
                      <v-alert type="success" variant="tonal">
                        Â¡Proceso completado exitosamente!
                      </v-alert>
                      <v-btn 
                        variant="outlined" 
                        color="primary" 
                        @click="downloadProof"
                        prepend-icon="mdi-download"
                        class="mt-3"
                      >
                        Descargar Comprobante
                      </v-btn>
                    </div>
                    <div v-else class="step-actions">
                      <input
                        ref="proofFileInput"
                        type="file"
                        accept=".pdf"
                        style="display: none"
                        @change="handleProofUpload"
                      >
                      <v-btn 
                        color="success"
                        @click="$refs.proofFileInput.click()"
                        :loading="uploadingProof"
                        prepend-icon="mdi-upload"
                      >
                        Subir Comprobante
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
          No se pudo cargar la informaciÃ³n de la factura
        </v-alert>
      </div>
    </v-container>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAccountingDocuments } from '../scripts/accounting-documents.js'

const {
  // Reactive state
  loading,
  invoice,
  generatingPassword,
  uploadingISR,
  uploadingIVA,
  uploadingProof,
  markingPayment,
  
  // Functions
  loadInvoice,
  isStepCompleted,
  canGeneratePassword,
  canUploadISR,
  canUploadIVA,
  canMarkPaid,
  canUploadProof,
  generatePassword,
  handleISRUpload,
  handleIVAUpload,
  markPaymentDone,
  handleProofUpload,
  downloadISR,
  downloadIVA,
  downloadProof,
  getStatusColor,
  getStatusText,
  formatNumber,
  initializeAccountingDocuments
} = useAccountingDocuments()

onMounted(initializeAccountingDocuments)
</script>

<style src="../styles/accounting-documents.css" scoped></style>
