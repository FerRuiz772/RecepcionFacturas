# 📋 PLAN COMPLETO PARA ARREGLAR REGIMEN_ISR TOGGLE

## 🎯 PROBLEMA IDENTIFICADO

**Síntoma:** El toggle de "Régimen Sujeto a Definitiva ISR" se guarda pero inmediatamente vuelve a 0 cuando se recarga la lista de proveedores.

**Causa raíz:** Error en la conversión de tipos de datos entre backend y frontend.

---

## ✅ CAMBIOS REALIZADOS

### 1. **Backend - Modelo Supplier.js** ✅
**Archivo:** `/backend/src/models/Supplier.js`

**Problema:** El modelo Sequelize NO tenía definido el campo `regimen_isr`.

**Solución:** Agregado el campo al modelo:
```javascript
regimen_isr: {
    type: DataTypes.TINYINT(1),
    defaultValue: 0,
    allowNull: false,
    comment: 'Indica si el proveedor está sujeto a retención definitiva ISR (1) o no (0)'
}
```

### 2. **Frontend - suppliers.js (editSupplier)** ✅
**Archivo:** `/frontend/src/scripts/suppliers.js` línea ~123

**Problema:** Conversión incorrecta de tipo de dato.
```javascript
// ❌ ANTES (problema con valores falsy)
regimen_isr: supplier.regimen_isr || false,

// ✅ DESPUÉS (conversión explícita a booleano)
regimen_isr: Boolean(supplier.regimen_isr), // Convert 0/1 to false/true
```

**Explicación:** 
- Backend guarda `0` (número) cuando el toggle está OFF
- `0` es un valor falsy en JavaScript
- La expresión `0 || false` siempre devuelve `false`
- Ahora `Boolean(0)` = `false` y `Boolean(1)` = `true` ✅

---

## 🧪 PRUEBAS NECESARIAS

### Fase 1: Verificación de Base de Datos
```bash
docker-compose -f docker-compose.local.yml exec db mysql -u admin -padmin123 recepcion_facturas -e "SELECT id, business_name, regimen_isr FROM suppliers;"
```

**Resultado esperado:**
```
+----+--------------+-------------+
| id | business_name| regimen_isr |
+----+--------------+-------------+
|  1 | sin isr      |           0 |
|  2 | con isr      |           1 |
+----+--------------+-------------+
```

### Fase 2: Prueba de Toggle (Activar ISR)

1. Iniciar servicios:
   ```bash
   docker-compose -f docker-compose.local.yml --env-file .env.local up
   ```

2. Abrir navegador en `http://localhost:8080`

3. Ir a **Proveedores** → Editar proveedor "sin isr"

4. **Activar** toggle "Régimen Sujeto a Definitiva ISR" ☑️

5. **Guardar**

6. **Verificar en consola del navegador:**
   ```
   📤 Actualizando proveedor: {business_name: 'sin isr', ..., regimen_isr: 1, ...}
   ✅ Response: 200 /api/suppliers/1
   ```

7. **Verificar en logs del backend:**
   ```
   📝 Actualizando proveedor: { id: '1', regimen_isr: 1, ... }
   UPDATE `suppliers` SET `regimen_isr`=?,`updated_at`=? WHERE `id` = ?
   ✅ Proveedor actualizado: { id: 1, regimen_isr: 1 }
   ```

8. **Verificar en DB:**
   ```bash
   docker-compose -f docker-compose.local.yml exec db mysql -u admin -padmin123 recepcion_facturas -e "SELECT id, business_name, regimen_isr FROM suppliers WHERE id = 1;"
   ```
   **Debe mostrar:** `regimen_isr = 1`

9. **Recargar página (F5)**

10. **Editar proveedor "sin isr" de nuevo**

11. **VERIFICAR:** El toggle debe seguir **ACTIVADO** ☑️ ✅

### Fase 3: Prueba de Toggle (Desactivar ISR)

1. Con el mismo proveedor abierto

2. **Desactivar** toggle "Régimen Sujeto a Definitiva ISR" ☐

3. **Guardar**

4. Verificar logs backend muestre: `regimen_isr: 0`

5. Verificar DB: `regimen_isr = 0`

6. **Recargar página**

7. **Editar proveedor**

8. **VERIFICAR:** El toggle debe estar **DESACTIVADO** ☐ ✅

### Fase 4: Prueba de Funcionalidad ISR en Facturas

1. Ir a **Facturas** → Gestionar factura del proveedor "con isr"

2. **VERIFICAR:** Sección "Retención ISR" debe aparecer

3. **VERIFICAR:** Progreso muestra 3 documentos requeridos

4. Ir a factura del proveedor "sin isr"

5. **VERIFICAR:** Sección "Retención ISR" NO debe aparecer

6. **VERIFICAR:** Progreso muestra 2 documentos requeridos

---

## 📝 CHECKLIST DE VALIDACIÓN

- [ ] Base de datos tiene columna `regimen_isr` (migración 006 ejecutada)
- [ ] Modelo Supplier.js incluye campo `regimen_isr`
- [ ] Backend guarda valor correctamente (logs muestran UPDATE exitoso)
- [ ] Backend devuelve `regimen_isr` en GET /api/suppliers
- [ ] Frontend convierte 0/1 a false/true correctamente
- [ ] Toggle se activa y guarda como `regimen_isr = 1`
- [ ] Toggle se desactiva y guarda como `regimen_isr = 0`
- [ ] Valor persiste después de recargar página
- [ ] Sección ISR aparece solo para proveedores con ISR
- [ ] Progreso dinámico funciona (2 vs 3 documentos)

---

## 🐛 DEBUGGING

Si el problema persiste:

### 1. Verificar conversión en frontend
Agregar console.log en `editSupplier`:
```javascript
const editSupplier = (supplier) => {
    console.log('🔍 Original supplier.regimen_isr:', supplier.regimen_isr, typeof supplier.regimen_isr);
    const converted = Boolean(supplier.regimen_isr);
    console.log('✅ Converted to boolean:', converted, typeof converted);
    
    editMode.value = true;
    supplierForm.value = { 
      ...supplier, 
      regimen_isr: converted,
      documento_isr_file: null 
    };
    supplierDialog.value = true;
};
```

### 2. Verificar respuesta del backend
Agregar log en `getAllSuppliers` (supplierController.js):
```javascript
console.log('📊 Suppliers before sending:', suppliers.rows.map(s => ({ 
  id: s.id, 
  name: s.business_name, 
  regimen_isr: s.regimen_isr,
  regimen_isr_type: typeof s.regimen_isr
})));
```

### 3. Verificar query SQL
En los logs del backend buscar:
```sql
SELECT `Supplier`.`regimen_isr` ...
```
Debe incluir el campo en el SELECT.

---

## 🚀 SIGUIENTE PASO

Una vez validado todo:

1. **Crear commit:**
   ```bash
   git add .
   git commit -m "fix: Arreglar persistencia de toggle regimen_isr

   - Agregar campo regimen_isr al modelo Supplier
   - Corregir conversión de tipo en editSupplier (0/1 -> boolean)
   - Mantener valor del toggle después de recargar
   "
   ```

2. **Documentar en CHANGELOG.md**

3. **Actualizar documentación de proveedores**

---

## 📚 ARCHIVOS MODIFICADOS

1. `/backend/src/models/Supplier.js` - Agregado campo `regimen_isr`
2. `/frontend/src/scripts/suppliers.js` - Corregida conversión booleana

## ✨ RESULTADO ESPERADO

✅ Toggle funciona perfectamente  
✅ Valor persiste en DB  
✅ Valor se muestra correctamente al editar  
✅ Sección ISR aparece condicionalmente  
✅ Progreso dinámico funciona
