"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLoyaltyPoints = exports.getCustomerOrders = exports.searchCustomers = exports.deleteCustomer = exports.updateCustomer = exports.createCustomer = exports.getCustomerById = exports.getAllCustomers = void 0;
const client_1 = require("@prisma/client");
const auditLogger_1 = require("../utils/auditLogger");
const prisma = new client_1.PrismaClient();
const getAllCustomers = async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: customers
        });
    }
    catch (error) {
        console.error('Get all customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customers'
        });
    }
};
exports.getAllCustomers = getAllCustomers;
const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        res.json({
            success: true,
            data: customer
        });
    }
    catch (error) {
        console.error('Get customer by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer'
        });
    }
};
exports.getCustomerById = getCustomerById;
const createCustomer = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, address } = req.body;
        const emailValue = email && email.trim() !== '' ? email.trim() : null;
        const customer = await prisma.customer.create({
            data: {
                firstName,
                lastName,
                email: emailValue,
                phone,
                address
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'CREATE',
            entity: 'CUSTOMER',
            entityId: customer.id,
            newValues: { firstName, lastName, email: emailValue, phone, address },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.status(201).json({
            success: true,
            data: customer
        });
    }
    catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create customer'
        });
    }
};
exports.createCustomer = createCustomer;
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { firstName, lastName, email, phone, address } = req.body;
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        const emailValue = email && email.trim() !== '' ? email.trim() : null;
        const updatedCustomer = await prisma.customer.update({
            where: { id },
            data: {
                firstName,
                lastName,
                email: emailValue,
                phone,
                address
            }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'UPDATE',
            entity: 'CUSTOMER',
            entityId: id,
            oldValues: {
                firstName: existingCustomer.firstName,
                lastName: existingCustomer.lastName,
                email: existingCustomer.email,
                phone: existingCustomer.phone,
                address: existingCustomer.address
            },
            newValues: { firstName, lastName, email: emailValue, phone, address },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            data: updatedCustomer
        });
    }
    catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update customer'
        });
    }
};
exports.updateCustomer = updateCustomer;
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const existingCustomer = await prisma.customer.findUnique({
            where: { id }
        });
        if (!existingCustomer) {
            return res.status(404).json({
                success: false,
                message: 'Customer not found'
            });
        }
        await prisma.customer.delete({
            where: { id }
        });
        await (0, auditLogger_1.createAuditLog)({
            userId: req.user?.id || 'unknown',
            action: 'DELETE',
            entity: 'CUSTOMER',
            entityId: id,
            oldValues: {
                firstName: existingCustomer.firstName,
                lastName: existingCustomer.lastName,
                email: existingCustomer.email,
                phone: existingCustomer.phone,
                address: existingCustomer.address
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        res.json({
            success: true,
            message: 'Customer deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete customer'
        });
    }
};
exports.deleteCustomer = deleteCustomer;
const searchCustomers = async (req, res) => {
    try {
        const { query } = req.query;
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { firstName: { contains: query, mode: 'insensitive' } },
                    { lastName: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                    { phone: { contains: query, mode: 'insensitive' } }
                ]
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: customers
        });
    }
    catch (error) {
        console.error('Search customers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search customers'
        });
    }
};
exports.searchCustomers = searchCustomers;
const getCustomerOrders = async (req, res) => {
    try {
        const { id } = req.params;
        const orders = await prisma.order.findMany({
            where: { customerId: id },
            include: {
                items: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: orders
        });
    }
    catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch customer orders'
        });
    }
};
exports.getCustomerOrders = getCustomerOrders;
const updateLoyaltyPoints = async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;
        const customer = await prisma.customer.update({
            where: { id },
            data: {
                loyaltyPoints: points
            }
        });
        res.json({
            success: true,
            data: customer
        });
    }
    catch (error) {
        console.error('Update loyalty points error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update loyalty points'
        });
    }
};
exports.updateLoyaltyPoints = updateLoyaltyPoints;
//# sourceMappingURL=customerController.js.map