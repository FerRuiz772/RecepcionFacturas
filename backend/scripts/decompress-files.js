const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');

/**
 * Script para descomprimir archivos PDF que fueron comprimidos incorrectamente
 * Esto corrige el problema de PDFs corrompidos por compresión gzip
 */

const decompressFile = async (gzFilePath) => {
    try {
        console.log(`🔧 Descomprimiendo: ${gzFilePath}`);
        
        // Leer el archivo comprimido
        const compressedData = await fs.readFile(gzFilePath);
        
        // Descomprimir
        const decompressedData = zlib.gunzipSync(compressedData);
        
        // Generar el nombre del archivo descomprimido (quitar .gz)
        const originalFilePath = gzFilePath.replace('.gz', '');
        
        // Escribir el archivo descomprimido
        await fs.writeFile(originalFilePath, decompressedData);
        
        // Eliminar el archivo comprimido
        await fs.unlink(gzFilePath);
        
        console.log(`✅ Descomprimido exitosamente: ${originalFilePath}`);
        return originalFilePath;
    } catch (error) {
        console.error(`❌ Error descomprimiendo ${gzFilePath}:`, error.message);
        return null;
    }
};

const findAndDecompressFiles = async (directory) => {
    try {
        const items = await fs.readdir(directory, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(directory, item.name);
            
            if (item.isDirectory()) {
                // Recursivo para subdirectorios
                await findAndDecompressFiles(fullPath);
            } else if (item.isFile() && item.name.endsWith('.gz')) {
                // Descomprimir archivo .gz
                await decompressFile(fullPath);
            }
        }
    } catch (error) {
        console.error(`❌ Error procesando directorio ${directory}:`, error.message);
    }
};

const main = async () => {
    console.log('🚀 Iniciando descompresión de archivos PDF...');
    
    const uploadsDir = path.join(__dirname, '..', 'src', 'uploads');
    console.log(`📂 Directorio uploads: ${uploadsDir}`);
    
    try {
        await findAndDecompressFiles(uploadsDir);
        console.log('✅ Descompresión completada');
    } catch (error) {
        console.error('❌ Error durante la descompresión:', error);
        process.exit(1);
    }
};

// Ejecutar el script
if (require.main === module) {
    main();
}

module.exports = { decompressFile, findAndDecompressFiles };