<template>
    <div class="invoice-layout">
      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn icon @click="goBack" color="#64748b" class="ml-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Nueva Factura</div>
          <div class="header-subtitle">Subir documentos de facturación</div>
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
              <span class="breadcrumb-item active">Nueva Factura</span>
            </div>
          </v-container>
        </div>
  
        <v-container class="py-8" max-width="800">
          <!-- Información del proveedor (solo lectura) -->
          <v-card class="form-card mb-6" elevation="2">
            <v-card-title class="card-title-bg">
              <v-icon class="mr-2">mdi-account-outline</v-icon>
              Información del Proveedor
            </v-card-title>
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    :value="supplierInfo.business_name"
                    label="Razón Social"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    class="custom-input"
                    prepend-inner-icon="mdi-domain"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    :value="supplierInfo.nit"
                    label="NIT"
                    readonly
                    variant="outlined"
                    density="comfortable"
                    class="custom-input"
                    prepend-inner-icon="mdi-card-account-details-outline"
                  ></v-text-field>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
  
          <!-- Formulario de factura - Solo para personal de contaduría -->
          <v-form ref="invoiceForm" v-model="valid" v-if="!isProvider">
            <v-card class="form-card mb-6" elevation="2">
              <v-card-title class="card-title-bg">
                <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                Datos de la Factura
              </v-card-title>
              <v-card-text class="pa-6">
                <v-row>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.number"
                      label="Número de Factura"
                      variant="outlined"
                      density="comfortable"
                      class="custom-input"
                      :rules="[v => !!v || 'Número requerido']"
                      prepend-inner-icon="mdi-pound"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.amount"
                      label="Monto Total"
                      variant="outlined"
                      density="comfortable"
                      class="custom-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      prefix="Q"
                      :rules="[v => !!v || 'Monto requerido', v => v > 0 || 'Monto debe ser mayor a 0']"
                      prepend-inner-icon="mdi-currency-usd"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.date"
                      label="Fecha de Factura"
                      variant="outlined"
                      density="comfortable"
                      class="custom-input"
                      type="date"
                      :rules="[v => !!v || 'Fecha requerida']"
                      prepend-inner-icon="mdi-calendar"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field
                      v-model="form.due_date"
                      label="Fecha Límite de Pago"
                      variant="outlined"
                      density="comfortable"
                      class="custom-input"
                      type="date"
                      prepend-inner-icon="mdi-calendar-clock"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="12">
                    <v-textarea
                      v-model="form.description"
                      label="Descripción de Servicios/Productos"
                      variant="outlined"
                      density="comfortable"
                      class="custom-input"
                      rows="3"
                      :rules="[v => !!v || 'Descripción requerida']"
                      prepend-inner-icon="mdi-text"
                    ></v-textarea>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-form>

          <!-- Instrucciones para proveedores -->
          <v-card v-if="isProvider" class="form-card mb-6" elevation="2">
            <v-card-title class="card-title-bg">
              <v-icon class="mr-2">mdi-information-outline</v-icon>
              Instrucciones para Proveedores
            </v-card-title>
            <v-card-text class="pa-6">
              <v-alert type="info" variant="tonal" class="mb-4">
                <v-icon slot="prepend">mdi-lightbulb-outline</v-icon>
                <strong>Proceso de subida de facturas:</strong>
              </v-alert>
              <div class="instructions-list">
                <div class="instruction-item">
                  <v-icon color="primary" class="mr-3">mdi-numeric-1-circle</v-icon>
                  <div>
                    <strong>Suba únicamente el PDF de su factura</strong>
                    <p class="text-caption text-medium-emphasis mt-1">
                      El personal de contaduría se encargará de procesar los datos de la factura
                    </p>
                  </div>
                </div>
                <div class="instruction-item">
                  <v-icon color="primary" class="mr-3">mdi-numeric-2-circle</v-icon>
                  <div>
                    <strong>Asegúrese de que el PDF sea legible</strong>
                    <p class="text-caption text-medium-emphasis mt-1">
                      Verifique que todos los datos sean claramente visibles
                    </p>
                  </div>
                </div>
                <div class="instruction-item">
                  <v-icon color="primary" class="mr-3">mdi-numeric-3-circle</v-icon>
                  <div>
                    <strong>Recibirá notificación del estado</strong>
                    <p class="text-caption text-medium-emphasis mt-1">
                      Le informaremos cuando su factura sea procesada
                    </p>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Subida de archivos -->
          <v-card class="form-card mb-6" elevation="2">
            <v-card-title class="card-title-bg">
              <v-icon class="mr-2">mdi-cloud-upload-outline</v-icon>
              Documentos Requeridos
            </v-card-title>
            <v-card-text class="pa-6">
              <!-- Zona de drag & drop -->
              <div 
                class="upload-zone"
                @click="$refs.fileInput.click()"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                :class="{ 'dragging': isDragging }"
              >
                <v-icon size="64" color="#cbd5e1">mdi-cloud-upload</v-icon>
                <h3 class="upload-title">Arrastra archivos aquí o haz clic para seleccionar</h3>
                <p class="upload-subtitle">PDF, JPG, PNG • Máximo 10MB por archivo</p>
              </div>
              
              <input 
                ref="fileInput"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                style="display: none"
                @change="handleFileSelect"
              >

              <!-- Lista de archivos -->
              <div v-if="uploadedFiles.length > 0" class="mt-6">
                <h4 class="files-title">Archivos Subidos ({{ uploadedFiles.length }})</h4>
                <v-list class="file-list">
                  <v-list-item v-for="(file, index) in uploadedFiles" :key="index" class="file-item">
                    <template v-slot:prepend>
                      <v-icon :color="getFileIconColor(file.type)">{{ getFileIcon(file.type) }}</v-icon>
                    </template>
                    <v-list-item-title class="file-name">{{ file.name }}</v-list-item-title>
                    <v-list-item-subtitle class="file-size">{{ formatFileSize(file.size) }}</v-list-item-subtitle>
                    <template v-slot:append>
                      <v-btn icon size="small" @click="removeFile(index)" color="error">
                        <v-icon size="16">mdi-close</v-icon>
                      </v-btn>
                    </template>
                  </v-list-item>
                </v-list>
              </div>
            </v-card-text>
          </v-card>          <!-- Botones de acción -->
          <div class="action-buttons">
            <v-btn @click="goBack" variant="outlined" class="cancel-btn">
              <v-icon class="mr-2">mdi-arrow-left</v-icon>
              Cancelar
            </v-btn>
            <v-btn 
              color="primary" 
              @click="submitInvoice"
              :disabled="(!isProvider && !valid) || uploadedFiles.length === 0"
              :loading="submitting"
              class="submit-btn"
            >
              <v-icon class="mr-2">mdi-send</v-icon>
              {{ isProvider ? 'Subir Archivos' : 'Enviar Factura' }}
            </v-btn>
          </div>
        </v-container>
      </v-main>
    </div>
  </template>
  
  <script setup>
  import { onMounted } from 'vue'
  import { useNewInvoice } from '../scripts/new-invoice.js'
  
  const {
    // Reactive state
    valid,
    submitting,
    isDragging,
    uploadedFiles,
    form,
    
    // Computed properties
    supplierInfo,
    isProvider,
    
    // Functions
    goBack,
    handleFileSelect,
    handleDrop,
    processFiles,
    removeFile,
    getFileIcon,
    getFileIconColor,
    formatFileSize,
    submitInvoice,
    initializeNewInvoice
  } = useNewInvoice()
  
  onMounted(initializeNewInvoice)
  </script>
  
  <style src="../styles/new-invoice.css" scoped></style>
