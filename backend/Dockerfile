FROM node:20-alpine

RUN apk add --no-cache build-base python3 make g++ libc6-compat

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001

COPY package*.json ./

# Instalar dependencias según NODE_ENV
RUN if [ "$NODE_ENV" = "production" ] ; then \
        npm ci --omit=dev ; \
    else \
        npm ci ; \
    fi && npm cache clean --force

# Instalar exceljs de forma explícita
RUN npm install exceljs

COPY --chown=nodeuser:nodejs . .

# Crear TODOS los directorios necesarios incluyendo src/uploads
RUN mkdir -p uploads logs src/uploads && \
    chown -R nodeuser:nodejs uploads logs src

USER nodeuser

EXPOSE 3000

# Comando según NODE_ENV
CMD if [ "$NODE_ENV" = "production" ] ; then \
        npm start ; \
    else \
        npm run dev ; \
    fi
