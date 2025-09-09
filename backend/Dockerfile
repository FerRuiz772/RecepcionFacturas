# Usar Node.js LTS
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && ln -sf python3 /usr/bin/python

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p uploads logs

# Cambiar permisos
RUN chown -R node:node /app

# Usar usuario no root
USER node

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]