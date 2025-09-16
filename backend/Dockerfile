# Dockerfile optimizado
FROM node:18-alpine AS base

# Instalar dependencias del sistema necesarias para algunas librerías de Node
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    g++ \
    libc6-compat

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Crear usuario node
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copiar código fuente (excluyendo archivos en .dockerignore)
COPY --chown=nodeuser:nodejs . .

# Crear directorios necesarios
RUN mkdir -p uploads logs && \
    chown -R nodeuser:nodejs uploads logs

# Cambiar a usuario no root
USER nodeuser

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
