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
  
          <!-- Formulario de factura -->
          <v-form ref="invoiceForm" v-model="valid">
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
            </v-card>
          </v-form>
  
          <!-- Botones de acción -->
          <div class="action-buttons">
            <v-btn @click="goBack" variant="outlined" class="cancel-btn">
              <v-icon class="mr-2">mdi-arrow-left</v-icon>
              Cancelar
            </v-btn>
            <v-btn 
              color="primary" 
              @click="submitInvoice"
              :disabled="!valid || uploadedFiles.length === 0"
              :loading="submitting"
              class="submit-btn"
            >
              <v-icon class="mr-2">mdi-send</v-icon>
              Enviar Factura
            </v-btn>
          </div>
        </v-container>
      </v-main>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useToast } from 'vue-toastification'
  import axios from 'axios'
  
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const valid = ref(false)
  const submitting = ref(false)
  const isDragging = ref(false)
  const uploadedFiles = ref([])
  
  const form = ref({
    number: '',
    amount: '',
    date: '',
    due_date: '',
    description: ''
  })
  
  const supplierInfo = computed(() => {
    return {
      business_name: authStore.user?.supplier_name || 'Nombre de la empresa',
      nit: authStore.user?.supplier_nit || 'NIT no disponible'
    }
  })
  
  const goBack = () => {
    if (form.value.number || form.value.description || uploadedFiles.value.length > 0) {
      if (confirm('¿Estás seguro? Se perderán los cambios no guardados.')) {
        router.push('/dashboard')
      }
    } else {
      router.push('/dashboard')
    }
  }
  
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files)
    processFiles(files)
    event.target.value = ''
  }
  
  const handleDrop = (event) => {
    isDragging.value = false
    const files = Array.from(event.dataTransfer.files)
    processFiles(files)
  }
  
  const processFiles = (files) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    const maxSize = 10 * 1024 * 1024 // 10MB
    const maxFiles = 5
  
    if (uploadedFiles.value.length + files.length > maxFiles) {
      toast.error(`Máximo ${maxFiles} archivos permitidos`)
      return
    }
  
    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`Tipo de archivo no válido: ${file.name}`)
        return
      }
  
      if (file.size > maxSize) {
        toast.error(`Archivo muy grande: ${file.name} (máximo 10MB)`)
        return
      }
  
      uploadedFiles.value.push(file)
    })
  }
  
  const removeFile = (index) => {
    uploadedFiles.value.splice(index, 1)
  }
  
  const getFileIcon = (type) => {
    if (type.includes('pdf')) return 'mdi-file-pdf-box'
    if (type.includes('image')) return 'mdi-file-image'
    return 'mdi-file-document'
  }
  
  const getFileIconColor = (type) => {
    if (type.includes('pdf')) return '#ef4444'
    if (type.includes('image')) return '#10b981'
    return '#64748b'
  }
  
  const formatFileSize = (bytes) => {
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(1)} MB`
    return `${kb.toFixed(1)} KB`
  }
  
  const submitInvoice = async () => {
    if (!valid.value) {
      toast.error('Por favor complete todos los campos requeridos')
      return
    }
  
    if (uploadedFiles.value.length === 0) {
      toast.error('Debe subir al menos un documento')
      return
    }
  
    submitting.value = true
    try {
      const formData = new FormData()
      formData.append('number', form.value.number)
      formData.append('amount', form.value.amount)
      formData.append('date', form.value.date)
      formData.append('due_date', form.value.due_date)
      formData.append('description', form.value.description)
  
      uploadedFiles.value.forEach((file, index) => {
        formData.append(`files`, file)
      })
  
      await axios.post('/api/invoices', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
  
      toast.success('Factura enviada exitosamente')
      setTimeout(() => {
        router.push('/invoices')
      }, 1500)
  
    } catch (error) {
      console.error('Error al enviar factura:', error)
      toast.error(error.response?.data?.error || 'Error al enviar la factura')
    } finally {
      submitting.value = false
    }
  }
  
  onMounted(() => {
    // Inicializar fecha actual
    form.value.date = new Date().toISOString().split('T')[0]
  })
  </script>
  
  <style scoped>
  .invoice-layout {
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
  
  .form-card {
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
  
  .custom-input :deep(.v-field) {
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }
  
  .custom-input :deep(.v-field:hover) {
    border-color: #cbd5e1;
  }
  
  .custom-input :deep(.v-field--focused) {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
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
  
  .upload-title {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    margin: 16px 0 8px 0;
  }
  
  .upload-subtitle {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }
  
  .files-title {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
    margin-bottom: 12px;
  }
  
  .file-list {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  
  .file-item {
    border-bottom: 1px solid #e2e8f0;
  }
  
  .file-item:last-child {
    border-bottom: none;
  }
  
  .file-name {
    font-size: 14px;
    font-weight: 500;
    color: #0f172a;
  }
  
  .file-size {
    font-size: 12px;
    color: #64748b;
  }
  
  .action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    border-top: 1px solid #e2e8f0;
    padding: 20px 0;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
  
  .cancel-btn {
    color: #64748b;
    border: 1px solid #e2e8f0;
    font-weight: 500;
    text-transform: none;
    border-radius: 8px;
    height: 44px;
    padding: 0 24px;
  }
  
  .submit-btn {
    background: #0f172a;
    color: white;
    font-weight: 600;
    text-transform: none;
    border-radius: 8px;
    height: 44px;
    padding: 0 24px;
  }
  
  .submit-btn:hover {
    background: #1e293b;
  }
  </style>