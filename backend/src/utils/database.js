const { sequelize } = require('../models');

const initializeDatabase = async () => {
    try {
        // Verificar conexión
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos establecida correctamente.');

        // Sincronizar modelos (solo verificar, no alterar)
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ force: false, alter: false });
            console.log('✅ Modelos verificados con la base de datos.');
        }

        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
        return false;
    }
};

const closeDatabase = async () => {
    try {
        await sequelize.close();
        console.log('✅ Conexión a la base de datos cerrada.');
    } catch (error) {
        console.error('❌ Error al cerrar la conexión:', error);
    }
};

module.exports = {
    initializeDatabase,
    closeDatabase
};