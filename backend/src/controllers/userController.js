const { validationResult } = require('express-validator');
const { User, Supplier, Op } = require('../models');
const { createResponse } = require('../utils/response');
const { getDefaultPermissions, getPermissionInfo } = require('../middleware/permissions');

const userController = {
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, search = '', role } = req.query;
            const offset = (page - 1) * limit;
            
            const where = {};
            if (role) where.role = role;
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

    // Actualizar permisos de usuario
    async updateUserPermissions(req, res) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            await user.update({ permissions });

            const responseUser = user.toJSON();
            delete responseUser.password_hash;

            res.json(createResponse(true, 'Permisos actualizados exitosamente', responseUser));
        } catch (error) {
            console.error('Error al actualizar permisos:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    // Obtener información de permisos para un rol
    async getPermissionInfo(req, res) {
        try {
            const { role } = req.params;
            const permissionInfo = getPermissionInfo(role);
            res.json(createResponse(true, 'Información de permisos obtenida exitosamente', permissionInfo));
        } catch (error) {
            console.error('Error al obtener información de permisos:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    // Obtener permisos por defecto según rol
    async getDefaultPermissions(req, res) {
        try {
            const { role } = req.params;
            const permissions = getDefaultPermissions(role);
            res.json(createResponse(true, 'Permisos por defecto obtenidos exitosamente', permissions));
        } catch (error) {
            console.error('Error al obtener permisos por defecto:', error);
            res.status(500).json(createResponse(false, 'Error interno del servidor', null));
        }
    },

    // Obtener permisos modulares de usuario
    async getModularPermissions(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id);
            
            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            // Mapear permisos existentes a la nueva estructura modular
            const existingPermissions = user.permissions || getDefaultPermissions(user.role);
            
            const modularPermissions = {
                dashboard: {
                    ver: existingPermissions.dashboard?.ver || true // Todos pueden ver dashboard
                },
                facturas: {
                    ver: existingPermissions.facturas?.ver_todas || existingPermissions.facturas?.ver_propias || false,
                    crear: existingPermissions.facturas?.crear || false,
                    editar: existingPermissions.facturas?.editar || false,
                    asignar: existingPermissions.facturas?.gestionar || false,
                    aprobar: existingPermissions.facturas?.gestionar || false
                },
                documentos: {
                    ver: existingPermissions.documentos?.ver_todas || existingPermissions.documentos?.ver_propias || false,
                    subir: existingPermissions.documentos?.crear || false,
                    eliminar: existingPermissions.documentos?.eliminar || false,
                    validar: existingPermissions.documentos?.gestionar || false
                },
                proveedores: {
                    ver: existingPermissions.proveedores?.ver_todas || existingPermissions.proveedores?.ver_propias || false,
                    crear: existingPermissions.proveedores?.crear || false,
                    editar: existingPermissions.proveedores?.editar || false
                },
                usuarios: {
                    ver: existingPermissions.usuarios?.ver_todas || existingPermissions.usuarios?.ver_propias || false,
                    crear: existingPermissions.usuarios?.crear || false,
                    editar: existingPermissions.usuarios?.editar || false
                }
            };
            
            res.json(createResponse(true, 'Permisos modulares obtenidos exitosamente', modularPermissions));
        } catch (error) {
            console.error('Error obteniendo permisos modulares:', error);
            res.status(500).json(createResponse(false, 'Error obteniendo permisos del usuario', null));
        }
    },

    // Actualizar permisos modulares de usuario
    async updateModularPermissions(req, res) {
        try {
            const { id } = req.params;
            const { permissions } = req.body;

            const user = await User.findByPk(id);
            
            if (!user) {
                return res.status(404).json(createResponse(false, 'Usuario no encontrado', null));
            }

            // Convertir permisos modulares a estructura interna
            const internalPermissions = {
                facturas: {
                    ver_todas: permissions.facturas?.ver || false,
                    ver_propias: permissions.facturas?.ver || false,
                    crear: permissions.facturas?.crear || false,
                    editar: permissions.facturas?.editar || false,
                    gestionar: permissions.facturas?.asignar || permissions.facturas?.aprobar || false,
                    eliminar: permissions.facturas?.editar || false
                },
                documentos: {
                    ver_todas: permissions.documentos?.ver || false,
                    ver_propias: permissions.documentos?.ver || false,
                    crear: permissions.documentos?.subir || false,
                    editar: permissions.documentos?.eliminar || false,
                    gestionar: permissions.documentos?.validar || false,
                    eliminar: permissions.documentos?.eliminar || false
                },
                proveedores: {
                    ver_todas: permissions.proveedores?.ver || false,
                    ver_propias: permissions.proveedores?.ver || false,
                    crear: permissions.proveedores?.crear || false,
                    editar: permissions.proveedores?.editar || false,
                    gestionar: permissions.proveedores?.editar || false,
                    eliminar: permissions.proveedores?.editar || false
                },
                usuarios: {
                    ver_todas: permissions.usuarios?.ver || false,
                    ver_propias: permissions.usuarios?.ver || false,
                    crear: permissions.usuarios?.crear || false,
                    editar: permissions.usuarios?.editar || false,
                    gestionar: permissions.usuarios?.editar || false,
                    eliminar: permissions.usuarios?.editar || false
                }
            };

            // Actualizar permisos
            await user.update({
                permissions: internalPermissions
            });

            res.json(createResponse(true, 'Permisos actualizados exitosamente', permissions));
        } catch (error) {
            console.error('Error actualizando permisos modulares:', error);
            res.status(500).json(createResponse(false, 'Error actualizando permisos del usuario', null));
        }
    }
};

module.exports = userController;