# Entorno de Desarrollo Híbrido - RecepcionFacturas

## 🎯 Resumen

Debido a incompatibilidades de Rollup con arquitecturas ARM64 en contenedores Docker, se implementó una solución híbrida que combina:

- **Backend**: Ejecutándose en contenedores Docker (optimizado)
- **Frontend**: Ejecutándose localmente con Vite (nativo)

Esta configuración ofrece el mejor rendimiento y compatibilidad para el desarrollo.

## 🚀 Inicio Rápido

### Opción 1: Script Automático (Recomendado)
```bash
# Hacer ejecutable el script (solo la primera vez)
chmod +x dev-hybrid.sh

# Iniciar todo el entorno
./dev-hybrid.sh start
```

### Opción 2: Manual

#### 1. Iniciar Backend (Docker)
```bash
# Base de datos + API
docker compose up -d db api

# Verificar estado
docker compose ps
```

#### 2. Iniciar Frontend (Local)
```bash
cd frontend
npm install  # Solo primera vez
npm run dev  # Iniciará en puerto 8081
```

## 📋 Comandos Disponibles

### Script de Desarrollo
```bash
./dev-hybrid.sh start     # Iniciar todo el entorno
./dev-hybrid.sh stop      # Detener todos los servicios
./dev-hybrid.sh status    # Ver estado de servicios
./dev-hybrid.sh logs      # Ver logs del backend
./dev-hybrid.sh restart   # Reiniciar todo
./dev-hybrid.sh help      # Mostrar ayuda
```

### Comandos Docker Manuales
```bash
# Ver contenedores activos
docker compose ps

# Ver logs del backend
docker compose logs -f api

# Detener todo
docker compose down

# Reconstruir imágenes (si hay cambios)
docker compose build --no-cache
```

## 🌐 URLs de Desarrollo

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend** | http://localhost:8081 | Interfaz Vue.js con Vite |
| **Backend API** | http://localhost:3000 | API REST con Express |
| **Health Check** | http://localhost:3000/health | Estado del API |
| **Base de Datos** | localhost:3306 | MySQL 8.0 |

## 👤 Credenciales de Prueba

El sistema se inicializa automáticamente con usuarios de prueba:

| Rol | Email | Password |
|-----|-------|----------|
| Super Admin | admin@recepcionfacturas.com | admin123 |
| Admin Contaduría | contaduria@recepcionfacturas.com | contaduria123 |
| Trabajador | trabajador@recepcionfacturas.com | trabajador123 |
| Proveedor | proveedor@recepcionfacturas.com | proveedor123 |

## 🔧 Solución de Problemas

### Backend no responde
```bash
# Verificar estado de contenedores
docker compose ps

# Ver logs de errores
docker compose logs api

# Reiniciar backend
docker compose restart api
```

### Frontend no inicia
```bash
# Limpiar node_modules
cd frontend
rm -rf node_modules package-lock.json
npm install

# Verificar puerto 8081 libre
lsof -ti:8081 | xargs kill -9

# Iniciar manualmente
npm run dev
```

### Puerto 8081 ocupado
```bash
# Matar proceso en puerto 8081
lsof -ti:8081 | xargs kill -9

# O usar puerto diferente
cd frontend
npx vite --port 8082
```

### Base de datos no conecta
```bash
# Verificar contenedor MySQL
docker compose logs db

# Reiniciar base de datos
docker compose restart db

# Verificar conectividad
mysql -h localhost -P 3306 -u recepcion_user -p
```

## 🚧 Limitaciones Conocidas

1. **Frontend Docker**: Rollup tiene incompatibilidades con ARM64 en contenedores
2. **Hot Reload**: Funciona perfectamente en frontend local
3. **Puertos**: Frontend usa 8081 en lugar de 8080 para evitar conflictos

## 🔄 Flujo de Desarrollo

### Desarrollo Normal
1. Ejecutar `./dev-hybrid.sh start`
2. Desarrollar en frontend (cambios se reflejan automáticamente)
3. Desarrollar en backend (reiniciar contenedor si es necesario)
4. Al terminar: `./dev-hybrid.sh stop`

### Cambios en Backend
```bash
# Después de cambios en código backend
docker compose restart api

# O para ver logs en tiempo real
docker compose logs -f api
```

### Cambios en Base de Datos
```bash
# Aplicar migraciones o cambios de esquema
docker compose exec api npm run migrate

# O reiniciar completamente
docker compose down -v  # ⚠️ Borra datos
docker compose up -d db api
```

## 📊 Rendimiento

### Antes (Docker completo)
- ⏱️ Tiempo de build: ~2000+ segundos
- 💾 Contexto transferido: 34.72MB
- ❌ Errores de Rollup constantes

### Después (Híbrido)
- ⏱️ Tiempo de inicio: ~15 segundos
- 💾 Contexto transferido: ~300KB
- ✅ Desarrollo fluido sin errores

## 🔮 Futuro

Cuando se resuelvan las incompatibilidades de Rollup con ARM64:
1. Volver a intentar frontend en Docker
2. Usar imágenes base más nuevas
3. Evaluar alternativas a Rollup (Webpack, ESBuild)

---

## 📞 Soporte

Si encuentras problemas:
1. Verificar que Docker esté ejecutándose
2. Revisar puertos disponibles (3000, 3306, 8081)
3. Consultar logs con `./dev-hybrid.sh logs`
4. Reiniciar con `./dev-hybrid.sh restart`
