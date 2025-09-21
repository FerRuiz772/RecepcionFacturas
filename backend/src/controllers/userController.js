const { validationResult } = require('express-validator');
const { User, Supplier, UserPermission, Op } = require('../models');
const { createResponse } = require('../utils/response');

const userController = {
    // Función para asignar permisos por defecto según el rol
    async assignDefaultPermissions(userId, role) {
        const defaultPermissions = {
            super_admin: {
                'dashboard': { 'view': true, 'view_stats': true, 'view_charts': true, 'export_data': true },
                'invoices': { 'view': true, 'create': true, 'edit': true, 'delete': true, 'approve': true, 'reject': true, 'export': true, 'view_payments': true, 'manage_payments': true },
                'suppliers': { 'view': true, 'create': true, 'edit': true, 'delete': true, 'export': true },
                'users': { 'view': true, 'create': true, 'edit': true, 'delete': true, 'manage_permissions': true, 'reset_passwords': true }
            },
            admin_contaduria: {
                'dashboard': { 'view': true, 'view_stats': true, 'view_charts': true, 'export_data': true },
                'invoices': { 'view': true, 'create': true, 'edit': true, 'delete': true, 'approve': true, 'reject': true, 'export': true, 'view_payments': true, 'manage_payments': true },
                'suppliers': { 'view': true, 'create': true, 'edit': true, 'delete': true, 'export': true },
                'users': { 'view': true, 'create': false, 'edit': false, 'delete': false, 'manage_permissions': false, 'reset_passwords': false }
            },
            trabajador_contaduria: {
                'dashboard': { 'view': true, 'view_stats': true, 'view_charts': true, 'export_data': false },
                'invoices': { 'view': true, 'create': false, 'edit': true, 'delete': false, 'approve': false, 'reject': false, 'export': true, 'view_payments': true, 'manage_payments': true },
                'suppliers': { 'view': true, 'create': false, 'edit': false, 'delete': false, 'export': false },
                'users': { 'view': false, 'create': false, 'edit': false, 'delete': false, 'manage_permissions': false, 'reset_passwords': false }
            },
            proveedor: {
                'dashboard': { 'view': true, 'view_stats': false, 'view_charts': false, 'export_data': false },
                'invoices': { 'view': true, 'create': true, 'edit': false, 'delete': false, 'approve': false, 'reject': false, 'export': false, 'view_payments': false, 'manage_payments': false },
                'suppliers': { 'view': false, 'create': false, 'edit': false, 'delete': false, 'export': false },
                'users': { 'view': false, 'create': false, 'edit': false, 'delete': false, 'manage_permissions': false, 'reset_passwords': false }
            }
        };

        const permissions = defaultPermissions[role] || {};
        
        // Actualizar el campo JSON permissions en la tabla users
        await User.update(
            { permissions: permissions },
            { where: { id: userId } }
        );

        console.log(`✅ Permisos por defecto asignados para rol '${role}' al usuario ID ${userId}`);
    },
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, search = '', role } = req.query;
            const offset = (page - 1) * limit;
            
            const where = {};
            if (role) {
                // Manejar múltiples roles separados por comas
                const roles = role.split(',').map(r => r.trim());
                where.role = { [Op.in]: roles };
            }
            if (search) {
                where.name = { [Op.like]: `%${search}%` };
            }
                // Filtro por activo/inactivo
                if (typeof req.query.is_active !== 'undefined') {
                    where.is_active = req.query.is_active === 'true';
                }

            const users = await User.findAndCountAll({
                where,
                attributes: { exclude: ['password_hash'] },
                include: [{
                    model: Supplier,
                    as: 'supplier',
                    attributes: ['id', 'business_name', 'nit'],
                    required: false
                }],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            res.json(createResponse(true, 'Usuarios obtenidos exitosamente', {
                users: users.rows,
                total: users.count,
                page: parseInt(page),
                totalPages: Math.ceil(users.count / limit)
            }));
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id, {
                attributes: { exclude: ['password_hash'] },
                include: [{
                    model: Supplier,
                    as: 'supplier',
                    required: false
                }]
            });

            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            res.json(createResponse(true, 'Usuario obtenido exitosamente', user));
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    async createUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json(createResponse(false, 'Datos de entrada inválidos', errors.array()));
            }

            const { email, password, name, role, supplier_id } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json(createResponse(false, 'El email ya está registrado', null));
            }

            const user = await User.create({
                email,
                password_hash: password,
                name,
                role,
                supplier_id
            });

            // Asignar permisos por defecto según el rol
            await userController.assignDefaultPermissions(user.id, role);

            const responseUser = user.toJSON();
            delete responseUser.password_hash;

            res.status(201).json(createResponse(true, 'Usuario creado exitosamente', responseUser));
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, role, is_active, supplier_id } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            const updateData = { name, role, is_active, supplier_id };
            
            await user.update(updateData);

            const responseUser = user.toJSON();
            delete responseUser.password_hash;

            res.json(createResponse(true, 'Usuario actualizado exitosamente', responseUser));
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            await user.update({ is_active: false });
            res.json(createResponse(true, 'Usuario desactivado exitosamente', null));
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    // Obtener permisos de usuario
    async getUserPermissions(req, res) {
        try {
            const { id } = req.params;
            const requestingUserId = req.user.id;
            const requestingUserRole = req.user.role;
            
            // Verificar si el usuario puede ver estos permisos
            const canViewPermissions = 
                // Es super admin
                requestingUserRole === 'super_admin' ||
                // Es admin de contaduría
                requestingUserRole === 'admin_contaduria' ||
                // Es el mismo usuario viendo sus propios permisos
                parseInt(id) === requestingUserId ||
                // Tiene el permiso específico de usuarios.editar
                (req.user.permissions && req.user.permissions.includes('users.edit'));
            
            if (!canViewPermissions) {
                return res.status(403).json(createResponse(false, 'No tienes permisos para ver estos permisos', null));
            }
            
            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            // Extraer permisos del campo JSON permissions
            let permissions = [];
            if (user.permissions && typeof user.permissions === 'object') {
                // Convertir el objeto JSON a array de strings de permisos
                for (const [module, actions] of Object.entries(user.permissions)) {
                    for (const [action, granted] of Object.entries(actions)) {
                        if (granted === true) {
                            permissions.push(`${module}.${action}`);
                        }
                    }
                }
            }
            
            res.json(createResponse(true, 'Permisos obtenidos exitosamente', {
                user_id: user.id,
                name: user.name,
                role: user.role,
                permissions
            }));
        } catch (error) {
            console.error('Error al obtener permisos de usuario:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    // Actualizar permisos de usuario
    async updateUserPermissions(req, res) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            // Validar que los permisos sean un array
            if (!Array.isArray(permissions)) {
                return res.status(400).json(createResponse(false, 'Los permisos deben ser un array', null));
            }

            // Convertir array de permisos a estructura JSON anidada
            const permissionsJSON = {};
            permissions.forEach(permission => {
                const [module, action] = permission.split('.');
                if (module && action) {
                    if (!permissionsJSON[module]) {
                        permissionsJSON[module] = {};
                    }
                    permissionsJSON[module][action] = true;
                }
            });

            // Actualizar el campo JSON permissions en la tabla users
            await user.update({ permissions: permissionsJSON });

            console.log(`✅ Permisos actualizados para usuario ${user.email}:`, permissionsJSON);

            res.json(createResponse(true, 'Permisos actualizados exitosamente', {
                user_id: id,
                permissions
            }));
        } catch (error) {
            console.error('Error al actualizar permisos:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    async changePassword(req, res) {
        try {
            console.log('🔑 Cambio de contraseña - Body recibido:', req.body);
            console.log('🔑 Headers recibidos:', req.headers['content-type']);
            console.log('🔑 Params recibidos:', req.params);
            
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                console.log('❌ Errores de validación:', errors.array());
                return res.status(400).json(createResponse(false, 'Errores de validación', errors.array()));
            }

            const { id } = req.params;
            const { password } = req.body;

            console.log('📋 Datos extraídos:', { id, password: password ? '***' : 'undefined' });

            const user = await User.findByPk(id);
            if (!user) {
                console.log('❌ Usuario no encontrado:', id);
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            console.log('🔍 Usuario encontrado:', { id: user.id, email: user.email });

            // Hash de la nueva contraseña
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 12);
            
            console.log('🔐 Hash generado:', hashedPassword.substring(0, 20) + '...');
            console.log('✅ Actualizando contraseña...');
            
            const [updatedRows] = await User.update({
                password_hash: hashedPassword
            }, {
                where: { id: id }
            });

            console.log('✅ Filas actualizadas:', updatedRows);
            
            // Verificar que se actualizó correctamente
            const updatedUser = await User.findByPk(id);
            console.log('🔍 Hash verificado en DB:', updatedUser.password_hash.substring(0, 20) + '...');

            console.log('✅ Contraseña actualizada exitosamente');
            res.json(createResponse(true, 'Contraseña actualizada exitosamente', {
                user_id: id,
                email: user.email
            }));
        } catch (error) {
            console.error('❌ Error al cambiar contraseña:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    }
};

module.exports = userController;