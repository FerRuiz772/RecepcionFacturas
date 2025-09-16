#!/bin/bash

# Script de desarrollo híbrido para RecepcionFacturas
# Uso: ./dev-hybrid.sh [start|stop|status|logs]

set -e

PROJECT_DIR="/Users/joseruiz/Desktop/RecepcionFacturas"
FRONTEND_DIR="$PROJECT_DIR/frontend"

function show_help() {
    echo "Desarrollo Híbrido - RecepcionFacturas"
    echo "====================================="
    echo ""
    echo "Uso: ./dev-hybrid.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  start    - Iniciar backend en Docker + frontend local"
    echo "  stop     - Detener todos los servicios"
    echo "  status   - Mostrar estado de los servicios"
    echo "  logs     - Mostrar logs del backend"
    echo "  restart  - Reiniciar todos los servicios"
    echo ""
    echo "URLs de desarrollo:"
    echo "  🌐 Frontend: http://localhost:8081"
    echo "  🚀 Backend:  http://localhost:3000"
    echo "  💾 MySQL:    localhost:3306"
}

function start_services() {
    echo "🚀 Iniciando desarrollo híbrido..."
    
    cd "$PROJECT_DIR"
    
    # Iniciar backend en Docker (base de datos + API)
    echo "📦 Iniciando backend en Docker..."
    docker compose up -d db api
    
    # Esperar a que el backend esté listo
    echo "⏳ Esperando que el backend esté listo..."
    sleep 5
    
    # Verificar que el backend responda
    for i in {1..30}; do
        if curl -s http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ Backend listo!"
            break
        fi
        echo "   Esperando backend... (${i}/30)"
        sleep 2
    done
    
    # Iniciar frontend local
    echo "🎨 Iniciando frontend local..."
    cd "$FRONTEND_DIR"
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependencias del frontend..."
        npm install
    fi
    
    echo "🎯 Frontend iniciándose en puerto 8081..."
    echo ""
    echo "=== URLs de desarrollo ==="
    echo "🌐 Frontend: http://localhost:8081"
    echo "🚀 Backend:  http://localhost:3000"
    echo "💾 MySQL:    localhost:3306"
    echo ""
    echo "Para detener: Ctrl+C en el frontend y luego: ./dev-hybrid.sh stop"
    echo ""
    
    # Ejecutar Vite en puerto 8081 para evitar conflictos
    npx vite --host 0.0.0.0 --port 8081
}

function stop_services() {
    echo "🛑 Deteniendo servicios..."
    
    cd "$PROJECT_DIR"
    docker compose down
    
    # Matar procesos de Vite si existen
    pkill -f "vite" 2>/dev/null || true
    
    echo "✅ Todos los servicios detenidos"
}

function show_status() {
    echo "📊 Estado de los servicios:"
    echo ""
    
    cd "$PROJECT_DIR"
    docker compose ps
    
    echo ""
    echo "🔍 Verificando conectividad:"
    
    # Verificar backend
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend: OK (http://localhost:3000)"
    else
        echo "❌ Backend: No disponible"
    fi
    
    # Verificar frontend
    if curl -s http://localhost:8081 > /dev/null 2>&1; then
        echo "✅ Frontend: OK (http://localhost:8081)"
    else
        echo "❌ Frontend: No disponible"
    fi
}

function show_logs() {
    cd "$PROJECT_DIR"
    echo "📋 Logs del backend (Ctrl+C para salir):"
    docker compose logs -f api
}

function restart_services() {
    stop_services
    sleep 2
    start_services
}

# Main
case "${1:-help}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    restart)
        restart_services
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo "❌ Comando desconocido: $1"
        show_help
        exit 1
        ;;
esac
