# ✅ Testing Checklist - Régimen ISR

## 🎯 Objetivo
Verificar que el toggle de Régimen ISR funciona correctamente en proveedores y que los documentos ISR aparecen condicionalmente en la gestión de facturas.

---

## 📋 Pre-requisitos

- [ ] Migración 006 ejecutada en la base de datos
- [ ] Backend corriendo sin errores
- [ ] Frontend corriendo sin errores
- [ ] Usuario con permisos de administrador o contaduría

---

## 🧪 Test 1: Crear Proveedor SIN ISR

### Pasos:
1. [ ] Navegar a **Proveedores**
2. [ ] Clic en **Nuevo Proveedor**
3. [ ] Verificar que aparece el toggle **"Régimen Sujeto a Definitiva ISR"**
4. [ ] Verificar que el toggle está **OFF** por defecto
5. [ ] Llenar datos:
   - Nombre: "Proveedor Test Sin ISR"
   - NIT: "12345678"
   - Dirección: "Calle Test 123"
6. [ ] Dejar el toggle de Régimen ISR en **OFF**
7. [ ] Clic en **Crear**
8. [ ] Verificar mensaje de éxito

### Verificación en Factura:
9. [ ] Crear una factura para este proveedor
10. [ ] Ir a **Gestión de Documentos** de la factura
11. [ ] **ESPERADO**: 
    - [ ] NO aparece "Documento ISR"
    - [ ] Solo aparecen: "Documento IVA" y "Comprobante de Pago"
    - [ ] Progreso total: **0/2 = 0%**
12. [ ] Subir documento IVA
13. [ ] **ESPERADO**: Progreso = **1/2 = 50%**
14. [ ] Subir comprobante de pago
15. [ ] **ESPERADO**: Progreso = **2/2 = 100%**

**✅ Test 1 Completado**: _____ (Fecha/Hora)

---

## 🧪 Test 2: Crear Proveedor CON ISR

### Pasos:
1. [ ] Navegar a **Proveedores**
2. [ ] Clic en **Nuevo Proveedor**
3. [ ] Llenar datos:
   - Nombre: "Proveedor Test Con ISR"
   - NIT: "87654321"
   - Dirección: "Avenida Test 456"
4. [ ] **Activar** el toggle "Régimen Sujeto a Definitiva ISR" (**ON**)
5. [ ] Verificar que el hint muestra: "Si está activo, las facturas de este proveedor requerirán documento ISR"
6. [ ] Clic en **Crear**
7. [ ] Verificar mensaje de éxito

### Verificación en Factura:
8. [ ] Crear una factura para este proveedor
9. [ ] Ir a **Gestión de Documentos** de la factura
10. [ ] **ESPERADO**: 
    - [ ] SÍ aparece "Documento ISR"
    - [ ] Aparecen 3 documentos: "ISR", "IVA" y "Comprobante"
    - [ ] Progreso total: **0/3 = 0%**
11. [ ] Subir documento ISR
12. [ ] **ESPERADO**: Progreso = **1/3 = 33%**
13. [ ] Subir documento IVA
14. [ ] **ESPERADO**: Progreso = **2/3 = 67%**
15. [ ] Subir comprobante de pago
16. [ ] **ESPERADO**: Progreso = **3/3 = 100%**

**✅ Test 2 Completado**: _____ (Fecha/Hora)

---

## 🧪 Test 3: Editar Proveedor - Activar ISR

### Pasos:
1. [ ] Ir a **Proveedores**
2. [ ] Buscar "Proveedor Test Sin ISR" (creado en Test 1)
3. [ ] Clic en **Editar**
4. [ ] Verificar que el toggle "Régimen ISR" está **OFF**
5. [ ] **Activar** el toggle (cambiar a ON)
6. [ ] Clic en **Actualizar**
7. [ ] Verificar mensaje de éxito

### Verificación:
8. [ ] Abrir la factura creada en Test 1
9. [ ] Ir a **Gestión de Documentos**
10. [ ] **ESPERADO**: 
    - [ ] Ahora SÍ aparece "Documento ISR"
    - [ ] Aparecen 3 documentos totales
    - [ ] Si tenía 2/2 (100%), ahora tiene 2/3 (67%)
11. [ ] Subir documento ISR
12. [ ] **ESPERADO**: Progreso = **3/3 = 100%**

**✅ Test 3 Completado**: _____ (Fecha/Hora)

---

## 🧪 Test 4: Editar Proveedor - Desactivar ISR

### Pasos:
1. [ ] Ir a **Proveedores**
2. [ ] Buscar "Proveedor Test Con ISR" (creado en Test 2)
3. [ ] Clic en **Editar**
4. [ ] Verificar que el toggle "Régimen ISR" está **ON**
5. [ ] **Desactivar** el toggle (cambiar a OFF)
6. [ ] Clic en **Actualizar**
7. [ ] Verificar mensaje de éxito

### Verificación:
8. [ ] Abrir la factura creada en Test 2
9. [ ] Ir a **Gestión de Documentos**
10. [ ] **ESPERADO**: 
    - [ ] Ya NO aparece "Documento ISR"
    - [ ] Solo aparecen "IVA" y "Comprobante" (2 documentos)
    - [ ] Si tenía 3/3 (100%), ahora tiene 2/2 (100%)

**✅ Test 4 Completado**: _____ (Fecha/Hora)

---

## 🧪 Test 5: Persistencia de Datos

### Pasos:
1. [ ] Editar "Proveedor Test Sin ISR"
2. [ ] Verificar que el estado del toggle se mantiene como estaba
3. [ ] Editar "Proveedor Test Con ISR"
4. [ ] Verificar que el estado del toggle se mantiene como estaba
5. [ ] Refrescar la página del navegador (F5)
6. [ ] Verificar que los estados se mantienen correctos

**✅ Test 5 Completado**: _____ (Fecha/Hora)

---

## 🧪 Test 6: Validación de UI

### Elementos a Verificar:
- [ ] Toggle tiene el color correcto (primary = azul)
- [ ] Hint aparece debajo del toggle
- [ ] Toggle está en la posición correcta (después de Dirección)
- [ ] Toggle aparece tanto en Crear como en Editar
- [ ] El texto del label es claro: "Régimen Sujeto a Definitiva ISR"
- [ ] El hint es descriptivo: "Si está activo, las facturas de este proveedor requerirán documento ISR"

**✅ Test 6 Completado**: _____ (Fecha/Hora)

---

## 📊 Resultados Finales

### Resumen de Tests
- Test 1 (Crear SIN ISR): ⬜ Pasó / ⬜ Falló
- Test 2 (Crear CON ISR): ⬜ Pasó / ⬜ Falló
- Test 3 (Activar ISR): ⬜ Pasó / ⬜ Falló
- Test 4 (Desactivar ISR): ⬜ Pasó / ⬜ Falló
- Test 5 (Persistencia): ⬜ Pasó / ⬜ Falló
- Test 6 (UI Validation): ⬜ Pasó / ⬜ Falló

### Bugs Encontrados
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Notas Adicionales
_______________________________________________
_______________________________________________
_______________________________________________

---

## ✅ Aprobación Final

- [ ] Todos los tests pasaron exitosamente
- [ ] No se encontraron bugs críticos
- [ ] UI es clara y fácil de usar
- [ ] Progreso se calcula correctamente
- [ ] Documentos aparecen/desaparecen según régimen

**Probado por**: _________________
**Fecha**: _________________
**Firma**: _________________

---

## 🚀 Deployment Ready

- [ ] Testing completado
- [ ] Documentación actualizada
- [ ] Código revisado
- [ ] Listo para producción

