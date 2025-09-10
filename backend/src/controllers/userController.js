const { validationResult } = require('express-validator');
const { User, Supplier, Op } = require('../models');

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

            res.json({
                users: users.rows,
                total: users.count,
                page: parseInt(page),
                totalPages: Math.ceil(users.count / limit)
            });
        } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
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
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json(user);
        } catch (error) {
            console.error('Error al obtener usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async createUser(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, password, name, role, supplier_id } = req.body;

            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'El email ya está registrado' });
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

            res.status(201).json(responseUser);
        } catch (error) {
            console.error('Error al crear usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { name, role, is_active, supplier_id } = req.body;

            const user = await User.findByPk(id);
            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            await user.update({
                name,
                role,
                is_active,
                supplier_id
            });

            const responseUser = user.toJSON();
            delete responseUser.password_hash;

            res.json(responseUser);
        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            await user.update({ is_active: false });
            res.json({ message: 'Usuario desactivado exitosamente' });
        } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = userController;