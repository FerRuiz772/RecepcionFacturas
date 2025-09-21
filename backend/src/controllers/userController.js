const { validationResult } = require('express-validator');
const { User, Supplier, UserPermission, Op } = require('../models');
const { createResponse } = require('../utils/response');

const userController = {
    // Función para asignar permisos por defecto según el rol
    async assignDefaultPermissions(userId, role) {
        const defaultPermissions = {
            super_admin: [
                'facturas.ver', 'facturas.crear', 'facturas.editar', 'facturas.eliminar',
                'documentos.ver', 'documentos.subir', 'documentos.descargar',
                'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
                'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.eliminar'
            ],
            admin_contaduria: [
                'facturas.ver', 'facturas.crear', 'facturas.editar', 'facturas.eliminar',
                'documentos.ver', 'documentos.subir', 'documentos.descargar',
                'usuarios.ver', 'usuarios.crear',
                'proveedores.ver', 'proveedores.crear'
            ],
            trabajador_contaduria: [
                'facturas.ver', 'facturas.crear',
                'documentos.ver', 'documentos.subir',
                'proveedores.ver'
            ],
            proveedor: [
                'facturas.ver', 'facturas.crear',
                'documentos.ver', 'documentos.subir', 'documentos.descargar',
                'proveedores.ver', 'proveedores.editar'
            ]
        };

        const permissions = defaultPermissions[role] || [];
        
        // Eliminar permisos existentes
        await UserPermission.destroy({ where: { user_id: userId } });
        
        // Asignar nuevos permisos
        const permissionData = permissions.map(permission => ({
            user_id: userId,
            permission_key: permission,
            granted: true
        }));
        
        await UserPermission.bulkCreate(permissionData);
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
    }
};

module.exports = userController;