# Implementación de Régimen ISR - Resumen de Cambios

## 📋 Descripción General
Se implementó el sistema de Régimen ISR para proveedores, permitiendo marcar proveedores sujetos a definitiva ISR y haciendo condicional el documento ISR en la gestión de facturas.

## ✅ Cambios Realizados

### 1. Base de Datos
**Archivo**: `database/006_add_regimen_isr_and_documentos.sql`
- ✅ Ya existía la migración que agrega `regimen_isr` a la tabla `suppliers`
- ✅ Campo tipo `TINYINT(1)` con default `0`
- ✅ Comentario descriptivo en la columna
- ✅ Índice creado para búsquedas por régimen

### 2. Frontend - Formularios de Proveedor

#### SuppliersView.vue
**Cambios**:
- ✅ Agregado toggle "Régimen Sujeto a Definitiva ISR" en formulario
- ✅ Toggle posicionado después de Dirección y antes de "Proveedor Activo"
- ✅ Hint explicativo incluido
- ✅ Visible tanto en modo crear como editar

**Ubicación**: Línea ~285 en el formulario

```vue
<v-switch
  v-model="supplierForm.regimen_isr"
  label="Régimen Sujeto a Definitiva ISR"
  color="primary"
  hint="Si está activo, las facturas de este proveedor requerirán documento ISR"
  persistent-hint
  class="my-3"
></v-switch>
```

#### suppliers.js
**Cambios**:
- ✅ `supplierForm` inicializado con `regimen_isr: false`
- ✅ `openCreateDialog()` - inicializa regimen_isr en false
- ✅ `editSupplier()` - carga regimen_isr del proveedor existente
- ✅ `closeSupplierDialog()` - resetea regimen_isr a false
- ✅ `saveSupplier()` - simplificado para enviar regimen_isr como JSON
- ✅ Eliminado código innecesario de documento_isr (no se usa en suppliers)

### 3. Backend - Controladores

#### supplierController.js
**Cambios**:
- ✅ `createSupplier()` - acepta y guarda `regimen_isr` del request body
- ✅ `updateSupplier()` - permite actualizar `regimen_isr`
- ✅ Default a `false` si no se proporciona

**Líneas modificadas**: 
- Línea ~245 en createSupplier
- Línea ~285 en updateSupplier

#### invoiceController.js
**Cambios**:
- ✅ Incluir `regimen_isr` en los `attributes` del Supplier en queries clave
- ✅ Línea ~843: Query de creación de factura
- ✅ Línea ~1081: Query de actualización de estado

### 4. Frontend - Gestión de Documentos

#### invoice-manage.js
**Cambio Principal**: Cálculo dinámico de progreso

```javascript
const documentsProgress = computed(() => {
  if (!invoice.value) return 0
  
  // Base: IVA + Proof = 2 documentos
  let required = 2
  let completed = 0
  
  // Contar documentos base (IVA y Proof son siempre requeridos)
  if (hasDocument('iva')) completed++
  if (hasDocument('proof')) completed++
  
  // Si tiene régimen ISR, agregar el documento ISR a requeridos
  if (invoice.value.supplier?.regimen_isr) {
    required = 3
    if (hasDocument('isr')) completed++
  }
  
  return Math.round((completed / required) * 100)
})
```

**Lógica**:
- Proveedores SIN régimen ISR: 2 documentos (IVA + Comprobante)
- Proveedores CON régimen ISR: 3 documentos (ISR + IVA + Comprobante)
- Progreso se calcula dinámicamente según el tipo de proveedor

#### InvoiceManageView.vue
**Cambio Principal**: Documento ISR condicional

```vue
<!-- Retención ISR - CONDICIONAL -->
<div v-if="invoice?.supplier?.regimen_isr" class="document-upload-item mb-4">
  <!-- ... contenido del documento ISR ... -->
</div>
```

**Resultado**:
- Si `regimen_isr = false`: NO aparece el documento ISR
- Si `regimen_isr = true`: SÍ aparece el documento ISR

## 🧪 Testing Requerido

### Test 1: Crear proveedor SIN ISR
1. Ir a Proveedores > Nuevo Proveedor
2. Verificar que toggle "Régimen ISR" aparece
3. Dejar toggle en OFF
4. Crear proveedor
5. Crear factura del proveedor
6. **Esperado**: 
   - Solo aparecen 2 documentos: IVA + Comprobante
   - Progreso: 0% (0/2), 50% (1/2), 100% (2/2)

### Test 2: Crear proveedor CON ISR
1. Ir a Proveedores > Nuevo Proveedor
2. Activar toggle "Régimen ISR" (ON)
3. Crear proveedor
4. Crear factura del proveedor
5. **Esperado**: 
   - Aparecen 3 documentos: ISR + IVA + Comprobante
   - Progreso: 0% (0/3), 33% (1/3), 67% (2/3), 100% (3/3)

### Test 3: Editar proveedor - Activar ISR
1. Abrir proveedor existente SIN ISR
2. Toggle debe estar OFF
3. Activar toggle
4. Guardar
5. Abrir facturas del proveedor
6. **Esperado**: Ahora aparece documento ISR

### Test 4: Editar proveedor - Desactivar ISR
1. Abrir proveedor CON ISR
2. Toggle debe estar ON
3. Desactivar toggle
4. Guardar
5. Abrir facturas del proveedor
6. **Esperado**: Ya NO aparece documento ISR

## 📁 Archivos Modificados

### Frontend
1. `/frontend/src/views/SuppliersView.vue`
2. `/frontend/src/scripts/suppliers.js`
3. `/frontend/src/views/InvoiceManageView.vue`
4. `/frontend/src/scripts/invoice-manage.js`

### Backend
1. `/backend/src/controllers/supplierController.js`
2. `/backend/src/controllers/invoiceController.js`

### Base de Datos
1. `/database/006_add_regimen_isr_and_documentos.sql` (ya existía)

## 🚀 Próximos Pasos

1. ✅ Código implementado
2. ⏳ Correr migración 006 si no se ha ejecutado
3. ⏳ Testing de los 4 escenarios
4. ⏳ Verificar que progreso se calcula correctamente
5. ⏳ Confirmar que ISR aparece/desaparece según regimen_isr

## 📝 Notas Técnicas

- El campo `regimen_isr` es booleano (0/1) en la BD
- Default es `false` (0) para proveedores existentes
- El progreso se calcula en tiempo real según el proveedor asociado
- No se requiere refrescar la página cuando se cambia el régimen
- Compatible con proveedores existentes (migración agrega default 0)

## ⚠️ Consideraciones

- **Migración**: Asegurarse de correr la migración 006 antes de usar
- **Proveedores Existentes**: Todos quedan con `regimen_isr = false` por default
- **Facturas Existentes**: El comportamiento cambia según el estado actual del proveedor
- **Performance**: El cálculo de progreso es computed, no afecta performance

---

**Fecha de Implementación**: 6 de Octubre, 2025
**Desarrollado por**: GitHub Copilot
**Estado**: ✅ Implementado - Pendiente de Testing
