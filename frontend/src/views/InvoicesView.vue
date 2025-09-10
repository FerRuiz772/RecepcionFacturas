<template>
    <div class="invoices-layout">
      <!-- Header -->
      <v-app-bar app color="white" elevation="1" height="64">
        <v-btn icon @click="goBack" color="#64748b" class="ml-2">
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        <div class="ml-4">
          <div class="header-title">Facturas</div>
          <div class="header-subtitle">Gestión de facturas del sistema</div>
        </div>
        <v-spacer></v-spacer>
        <v-btn 
          v-if="authStore.isProveedor"
          color="primary" 
          @click="$router.push('/invoices/new')"
          prepend-icon="mdi-plus"
          class="new-invoice-btn"
        >
          Nueva Factura
        </v-btn>
      </v-app-bar>
  
      <v-main class="main-content">
        <v-container class="py-8">
          <!-- Filtros -->
          <v-card class="filter-card mb-6" elevation="2">
            <v-card-text class="pa-6">
              <v-row>
                <v-col cols="12" md="3">
                  <v-select
                    v-model="filters.status"
                    :items="statusOptions"
                    label="Estado"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    @update:model-value="applyFilters"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3" v-if="!authStore.isProveedor">
                  <v-select
                    v-model="filters.supplier_id"
                    :items="suppliers"
                    item-title="business_name"
                    item-value="id"
                    label="Proveedor"
                    variant="outlined"
                    density="comfortable"
                    clearable
                    @update:model-value="applyFilters"
                  ></v-select>
                </v-col>
                <v-col cols="12" md="3">
                  <v-text-field
                    v-model="filters.search"
                    label="Buscar por número"
                    variant="outlined"
                    density="comfortable"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    @input="debounceSearch"
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="3">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    @click="exportInvoices"
                    prepend-icon="mdi-download"
                    class="export-btn"
                  >
                    Exportar
                  </v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
  
          <!-- Tabla de facturas -->
          <v-card elevation="2">
            <v-card-title class="d-flex align-center justify-space-between pa-6">
              <div class="card-title">
                <v-icon class="mr-2">mdi-receipt-text-outline</v-icon>
                Lista de Facturas ({{ totalInvoices }})
              </div>
            </v-card-title>
            
            <v-data-table-server
              v-model:items-per-page="itemsPerPage"
              :headers="headers"
              :items="invoices"
              :items-length="totalInvoices"
              :loading="loading"
              :search="filters.search"
              @update:options="loadInvoices"
              class="invoices-table"
            >
              <template v-slot:item.number="{ item }">
                <div class="invoice-number">{{ item.number }}</div>
              </template>
  
              <template v-slot:item.supplier="{ item }">
                <div class="supplier-info">
                  <div class="supplier-name">{{ item.Supplier?.business_name }}</div>
                  <div class="supplier-nit">{{ item.Supplier?.nit }}</div>
                </div>
              </template>
  
              <template v-slot:item.amount="{ item }">
                <div class="amount-cell">Q{{ formatNumber(item.amount) }}</div>
              </template>
  
              <template v-slot:item.status="{ item }">
                <v-chip
                  :color="getStatusColor(item.status)"
                  size="small"
                  class="status-chip"
                >
                  {{ getStatusText(item.status) }}
                </v-chip>
              </template>
  
              <template v-slot:item.created_at="{ item }">
                <div class="date-cell">{{ formatDate(item.created_at) }}</div>
              </template>
  
              <template v-slot:item.assigned_to="{ item }">
                <div v-if="item.assignedUser" class="assigned-info">
                  <div class="assigned-name">{{ item.assignedUser.name }}</div>
                </div>
                <span v-else class="text-grey">Sin asignar</span>
              </template>
  
              <template v-slot:item.actions="{ item }">
                <div class="actions-cell">
                  <!-- ACCIONES PARA PROVEEDOR -->
                  <template v-if="authStore.isProveedor">
                    <!-- Ver detalles -->
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="primary"
                      @click="viewInvoice(item)"
                      title="Ver detalles de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-eye-outline</v-icon>
                    </v-btn>
                    
                    <!-- Descargar facturas -->
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="success"
                      @click="downloadInvoiceFiles(item)"
                      title="Descargar factura #${item.number} en formato PDF"
                    >
                      <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                    
                    <!-- Descargar retenciones ISR (si disponible) -->
                    <v-btn
                      v-if="hasRetentionISR(item)"
                      icon
                      size="small"
                      variant="text"
                      color="blue"
                      @click="downloadRetentionISR(item)"
                      title="Descargar constancia de retención ISR de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-file-download-outline</v-icon>
                    </v-btn>
                    
                    <!-- Descargar retenciones IVA (si disponible) -->
                    <v-btn
                      v-if="hasRetentionIVA(item)"
                      icon
                      size="small"
                      variant="text"
                      color="cyan"
                      @click="downloadRetentionIVA(item)"
                      title="Descargar constancia de retención IVA de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-file-certificate-outline</v-icon>
                    </v-btn>
                    
                    <!-- Descargar comprobante de pago (si disponible) -->
                    <v-btn
                      v-if="hasPaymentProof(item)"
                      icon
                      size="small"
                      variant="text"
                      color="green"
                      @click="downloadPaymentProof(item)"
                      title="Descargar comprobante de pago de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-check-circle-outline</v-icon>
                    </v-btn>
                  </template>
  
                  <!-- ACCIONES PARA CONTADURÍA -->
                  <template v-if="authStore.isContaduria || authStore.isAdmin">
                    <!-- Ver detalles -->
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="primary"
                      @click="viewInvoice(item)"
                      title="Ver todos los detalles de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-eye-outline</v-icon>
                    </v-btn>
                    
                    <!-- Descargar facturas del proveedor -->
                    <v-btn
                      icon
                      size="small"
                      variant="text"
                      color="success"
                      @click="downloadInvoiceFiles(item)"
                      title="Descargar factura #${item.number} del proveedor ${item.Supplier?.business_name}"
                    >
                      <v-icon size="18">mdi-download</v-icon>
                    </v-btn>
                    
                    <!-- Subir Retención ISR -->
                    <v-btn
                      v-if="canUploadRetentionISR(item)"
                      icon
                      size="small"
                      variant="text"
                      color="blue"
                      @click="uploadRetentionISR(item)"
                      title="Subir constancia de retención ISR para la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-file-upload-outline</v-icon>
                    </v-btn>
                    
                    <!-- Subir Retención IVA -->
                    <v-btn
                      v-if="canUploadRetentionIVA(item)"
                      icon
                      size="small"
                      variant="text"
                      color="cyan"
                      @click="uploadRetentionIVA(item)"
                      title="Subir constancia de retención IVA para la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-file-certificate</v-icon>
                    </v-btn>
                    
                    <!-- Subir Comprobante de Pago -->
                    <v-btn
                      v-if="canUploadPaymentProof(item)"
                      icon
                      size="small"
                      variant="text"
                      color="green"
                      @click="uploadPaymentProof(item)"
                      title="Subir comprobante de pago para la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-receipt-text</v-icon>
                    </v-btn>
                    
                    <!-- Cambiar estado -->
                    <v-btn
                      v-if="canChangeStatus(item)"
                      icon
                      size="small"
                      variant="text"
                      color="warning"
                      @click="changeStatus(item)"
                      title="Modificar el estado actual de la factura #${item.number}"
                    >
                      <v-icon size="18">mdi-swap-horizontal</v-icon>
                    </v-btn>
                  </template>
  
                  <!-- Menú de más opciones -->
                  <v-menu>
                    <template v-slot:activator="{ props }">
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="secondary"
                        v-bind="props"
                      >
                        <v-icon size="18">mdi-dots-vertical</v-icon>
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="viewInvoiceHistory(item)">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-history</v-icon>
                          Ver historial de cambios de la factura #${item.number}
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="authStore.isContaduria && canGeneratePassword(item)" @click="generatePassword(item)">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-key</v-icon>
                          Generar contraseña para la factura #${item.number}
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="authStore.isAdmin" @click="reassignInvoice(item)">
                        <v-list-item-title>
                          <v-icon class="mr-2">mdi-account-switch</v-icon>
                          Reasignar factura #${item.number} a otro usuario
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </template>
  
              <template v-slot:loading>
                <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
              </template>
  
              <template v-slot:no-data>
                <div class="no-data">
                  <v-icon size="64" color="grey-lighten-2">mdi-receipt-text-outline</v-icon>
                  <h3>No hay facturas</h3>
                  <p>No se encontraron facturas con los filtros aplicados</p>
                </div>
              </template>
            </v-data-table-server>
          </v-card>
        </v-container>
      </v-main>
  
      <!-- Dialog para cambiar estado -->
      <v-dialog v-model="statusDialog" max-width="500">
        <v-card>
          <v-card-title>Cambiar Estado de Factura</v-card-title>
          <v-card-text>
            <v-select
              v-model="newStatus"
              :items="availableStatuses"
              label="Nuevo Estado"
              variant="outlined"
            ></v-select>
            <v-textarea
              v-model="statusNotes"
              label="Notas (opcional)"
              variant="outlined"
              rows="3"
              class="mt-4"
            ></v-textarea>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="statusDialog = false">Cancelar</v-btn>
            <v-btn color="primary" @click="updateStatus">Actualizar</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
  
      <!-- Dialog para subir archivos -->
      <v-dialog v-model="uploadDialog" max-width="600">
        <v-card>
          <v-card-title>{{ uploadDialogTitle }}</v-card-title>
          <v-card-text>
            <div class="upload-area" @click="$refs.uploadInput?.click()">
              <v-icon size="48" color="#cbd5e1">mdi-cloud-upload</v-icon>
              <p>Haz clic para seleccionar archivo</p>
              <p class="text-caption">PDF máximo 10MB</p>
            </div>
            <input
              ref="uploadInput"
              type="file"
              accept=".pdf"
              style="display: none"
              @change="handleFileUpload"
            >
            <div v-if="selectedFile" class="mt-4">
              <v-list-item>
                <template v-slot:prepend>
                  <v-icon color="red">mdi-file-pdf-box</v-icon>
                </template>
                <v-list-item-title>{{ selectedFile.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ formatFileSize(selectedFile.size) }}</v-list-item-subtitle>
              </v-list-item>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn @click="uploadDialog = false">Cancelar</v-btn>
            <v-btn 
              color="primary" 
              @click="submitFileUpload"
              :disabled="!selectedFile"
              :loading="uploadingFile"
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
  import { useRouter } from 'vue-router'
  import { useAuthStore } from '../stores/auth'
  import { useToast } from 'vue-toastification'
  import axios from 'axios'
  
  const router = useRouter()
  const authStore = useAuthStore()
  const toast = useToast()
  
  const loading = ref(false)
  const invoices = ref([])
  const suppliers = ref([])
  const totalInvoices = ref(0)
  const itemsPerPage = ref(10)
  const statusDialog = ref(false)
  const uploadDialog = ref(false)
  const selectedInvoice = ref(null)
  const newStatus = ref('')
  const statusNotes = ref('')
  const selectedFile = ref(null)
  const uploadingFile = ref(false)
  const uploadType = ref('')
  const uploadDialogTitle = ref('')
  
  const filters = ref({
    status: null,
    supplier_id: null,
    search: ''
  })
  
  const statusOptions = [
    { title: 'Factura Subida', value: 'factura_subida' },
    { title: 'Asignada Contaduría', value: 'asignada_contaduria' },
    { title: 'En Proceso', value: 'en_proceso' },
    { title: 'Contraseña Generada', value: 'contrasena_generada' },
    { title: 'Retención ISR', value: 'retencion_isr_generada' },
    { title: 'Retención IVA', value: 'retencion_iva_generada' },
    { title: 'Pago Realizado', value: 'pago_realizado' },
    { title: 'Proceso Completado', value: 'proceso_completado' },
    { title: 'Rechazada', value: 'rechazada' }
  ]
  
  const headers = computed(() => {
    const baseHeaders = [
      { title: 'No. Factura', key: 'number', width: '140px' },
      { title: 'Monto', key: 'amount', width: '120px' },
      { title: 'Estado', key: 'status', width: '150px' },
      { title: 'Fecha', key: 'created_at', width: '120px' },
      { title: 'Acciones', key: 'actions', sortable: false, width: '280px' }
    ]
  
    if (!authStore.isProveedor) {
      baseHeaders.splice(1, 0, { title: 'Proveedor', key: 'supplier', width: '200px' })
      baseHeaders.splice(-1, 0, { title: 'Asignado a', key: 'assigned_to', width: '150px' })
    }
  
    return baseHeaders
  })
  
  const availableStatuses = computed(() => {
    if (!authStore.isContaduria) return []
    
    return [
      { title: 'En Proceso', value: 'en_proceso' },
      { title: 'Contraseña Generada', value: 'contrasena_generada' },
      { title: 'Retención ISR', value: 'retencion_isr_generada' },
      { title: 'Retención IVA', value: 'retencion_iva_generada' },
      { title: 'Pago Realizado', value: 'pago_realizado' },
      { title: 'Proceso Completado', value: 'proceso_completado' },
      { title: 'Rechazada', value: 'rechazada' }
    ]
  })
  
  // Funciones para verificar disponibilidad de documentos (PROVEEDOR)
  const hasRetentionISR = (invoice) => {
    return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.status)
  }
  
  const hasRetentionIVA = (invoice) => {
    return ['retencion_iva_generada', 'pago_realizado', 'proceso_completado'].includes(invoice.status)
  }
  
  const hasPaymentProof = (invoice) => {
    return ['proceso_completado'].includes(invoice.status)
  }
  
  // Funciones para verificar permisos de subida (CONTADURÍA)
  const canUploadRetentionISR = (invoice) => {
    // Se puede subir ISR cuando está en proceso o tiene contraseña generada
    return ['en_proceso', 'contrasena_generada'].includes(invoice.status)
  }
  
  const canUploadRetentionIVA = (invoice) => {
    // Se puede subir IVA cuando ya tiene ISR o está en un estado posterior
    return ['retencion_isr_generada', 'retencion_iva_generada', 'pago_realizado'].includes(invoice.status)
  }
  
  const canUploadPaymentProof = (invoice) => {
    // Se puede subir el comprobante cuando tiene ambas retenciones o está en pago realizado
    return ['retencion_iva_generada', 'pago_realizado'].includes(invoice.status)
  }
  
  const canChangeStatus = (invoice) => {
    return authStore.isContaduria || authStore.isAdmin
  }
  
  const canGeneratePassword = (invoice) => {
    return ['en_proceso'].includes(invoice.status)
  }
  
  const goBack = () => {
    router.push('/dashboard')
  }
  
  const loadInvoices = async (options = {}) => {
    loading.value = true
    try {
      const params = {
        page: options.page || 1,
        limit: options.itemsPerPage || itemsPerPage.value,
        ...filters.value
      }
  
      const response = await axios.get('/api/invoices', { params })
      invoices.value = response.data.invoices
      totalInvoices.value = response.data.total
    } catch (error) {
      console.error('Error loading invoices:', error)
      toast.error('Error al cargar las facturas')
    } finally {
      loading.value = false
    }
  }
  
  const loadSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers')
      suppliers.value = response.data.suppliers
    } catch (error) {
      console.error('Error loading suppliers:', error)
    }
  }
  
  // Funciones de descarga para PROVEEDOR
  const downloadInvoiceFiles = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-invoice`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `factura-${invoice.number}.pdf`
      link.click()
      toast.success('Factura descargada')
    } catch (error) {
      toast.error('Error al descargar factura')
    }
  }
  
  const downloadRetentionISR = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-retention-isr`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-isr-${invoice.number}.pdf`
      link.click()
      toast.success('Retención ISR descargada')
    } catch (error) {
      toast.error('Error al descargar retención ISR')
    }
  }
  
  const downloadRetentionIVA = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-retention-iva`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `retencion-iva-${invoice.number}.pdf`
      link.click()
      toast.success('Retención IVA descargada')
    } catch (error) {
      toast.error('Error al descargar retención IVA')
    }
  }
  
  const downloadPaymentProof = async (invoice) => {
    try {
      const response = await axios.get(`/api/invoices/${invoice.id}/download-payment-proof`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `comprobante-pago-${invoice.number}.pdf`
      link.click()
      toast.success('Comprobante de pago descargado')
    } catch (error) {
      toast.error('Error al descargar comprobante de pago')
    }
  }
  
  // Funciones de subida para CONTADURÍA
  const uploadRetentionISR = (invoice) => {
    selectedInvoice.value = invoice
    uploadType.value = 'retention_isr'
    uploadDialogTitle.value = `Subir Retención ISR - Factura ${invoice.number}`
    uploadDialog.value = true
  }
  
  const uploadRetentionIVA = (invoice) => {
    selectedInvoice.value = invoice
    uploadType.value = 'retention_iva'
    uploadDialogTitle.value = `Subir Retención IVA - Factura ${invoice.number}`
    uploadDialog.value = true
  }
  
  const uploadPaymentProof = (invoice) => {
    selectedInvoice.value = invoice
    uploadType.value = 'payment_proof'
    uploadDialogTitle.value = `Subir Comprobante de Pago - Factura ${invoice.number}`
    uploadDialog.value = true
  }
  
  const handleFileUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      selectedFile.value = file
    }
  }
  
  const submitFileUpload = async () => {
    if (!selectedFile.value || !selectedInvoice.value) return
  
    uploadingFile.value = true
    try {
      const formData = new FormData()
      formData.append('file', selectedFile.value)
      formData.append('type', uploadType.value)
  
      await axios.post(`/api/invoices/${selectedInvoice.value.id}/upload-document`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
  
      toast.success('Documento subido exitosamente')
      uploadDialog.value = false
      selectedFile.value = null
      loadInvoices()
    } catch (error) {
      toast.error('Error al subir documento')
    } finally {
      uploadingFile.value = false
    }
  }
  
  // Funciones adicionales
  const generatePassword = async (invoice) => {
    try {
      await axios.post(`/api/invoices/${invoice.id}/generate-password`)
      toast.success('Contraseña generada exitosamente')
      loadInvoices()
    } catch (error) {
      toast.error('Error al generar contraseña')
    }
  }
  
  const applyFilters = () => {
    loadInvoices()
  }
  
  let searchTimeout
  const debounceSearch = () => {
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      loadInvoices()
    }, 500)
  }
  
  const viewInvoice = (invoice) => {
    console.log('Ver factura:', invoice)
  }
  
  const viewInvoiceHistory = (invoice) => {
    console.log('Ver historial:', invoice)
  }
  
  const changeStatus = (invoice) => {
    selectedInvoice.value = invoice
    newStatus.value = invoice.status
    statusNotes.value = ''
    statusDialog.value = true
  }
  
  const updateStatus = async () => {
    try {
      await axios.put(`/api/invoices/${selectedInvoice.value.id}/status`, {
        status: newStatus.value,
        notes: statusNotes.value
      })
  
      toast.success('Estado actualizado exitosamente')
      statusDialog.value = false
      loadInvoices()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Error al actualizar el estado')
    }
  }
  
  const reassignInvoice = (invoice) => {
    console.log('Reasignar factura:', invoice)
  }
  
  const exportInvoices = () => {
    console.log('Exportar facturas')
    toast.info('Función de exportación en desarrollo')
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
      'factura_subida': 'Subida',
      'asignada_contaduria': 'Asignada',
      'en_proceso': 'En Proceso',
      'contrasena_generada': 'Contraseña',
      'retencion_isr_generada': 'ISR',
      'retencion_iva_generada': 'IVA',
      'pago_realizado': 'Pagado',
      'proceso_completado': 'Completado',
      'rechazada': 'Rechazada'
    }
    return texts[status] || status
  }
  
  const formatNumber = (number) => {
    return new Intl.NumberFormat('es-GT').format(number)
  }
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-GT')
  }
  
  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }
  
  onMounted(() => {
    loadInvoices()
    if (!authStore.isProveedor) {
      loadSuppliers()
    }
  })
  </script>
  
  <style scoped>
.invoices-layout {
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

.filter-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
}

.new-invoice-btn {
  text-transform: none;
  font-weight: 600;
}

.export-btn {
  text-transform: none;
  font-weight: 500;
  width: 100%;
}

.invoices-table {
  border-radius: 0 0 12px 12px;
}

.invoice-number {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #0f172a;
}

.supplier-info {
  display: flex;
  flex-direction: column;
}

.supplier-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 14px;
}

.supplier-nit {
  font-size: 12px;
  color: #64748b;
}

.amount-cell {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.status-chip {
  font-size: 11px;
  font-weight: 600;
}

.date-cell {
  color: #64748b;
  font-size: 14px;
}

.assigned-info {
  display: flex;
  flex-direction: column;
}

.assigned-name {
  font-weight: 500;
  color: #0f172a;
  font-size: 14px;
}

  .actions-cell {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 4px 0;

    .v-btn {
      background-color: rgba(0, 0, 0, 0.05) !important;
      &:hover {
        background-color: rgba(0, 0, 0, 0.1) !important;
      }
    }
  }.no-data {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

.no-data h3 {
  margin: 16px 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.no-data p {
  margin: 0;
  font-size: 14px;
}

.upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-area:hover {
  border-color: #0f172a;
  background-color: #f8fafc;
}
</style>