"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePDF = exports.getInvoicesByCustomer = exports.getInvoicesByStatus = exports.deleteInvoice = exports.updateInvoice = exports.createInvoice = exports.getInvoiceById = exports.getAllInvoices = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllInvoices = async (req, res) => {
    res.json({ success: true, data: [] });
};
exports.getAllInvoices = getAllInvoices;
const getInvoiceById = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.getInvoiceById = getInvoiceById;
const createInvoice = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.createInvoice = createInvoice;
const updateInvoice = async (req, res) => {
    res.json({ success: true, data: {} });
};
exports.updateInvoice = updateInvoice;
const deleteInvoice = async (req, res) => {
    res.json({ success: true, message: 'Invoice deleted' });
};
exports.deleteInvoice = deleteInvoice;
const getInvoicesByStatus = async (req, res) => {
    try {
        const { status } = req.params;
        const invoices = await prisma.invoice.findMany({
            where: {
                status: status
            },
            include: {
                customer: true,
                order: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: invoices
        });
    }
    catch (error) {
        console.error('Get invoices by status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};
exports.getInvoicesByStatus = getInvoicesByStatus;
const getInvoicesByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;
        const invoices = await prisma.invoice.findMany({
            where: {
                customerId
            },
            include: {
                customer: true,
                order: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: invoices
        });
    }
    catch (error) {
        console.error('Get invoices by customer error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch invoices'
        });
    }
};
exports.getInvoicesByCustomer = getInvoicesByCustomer;
const generateInvoicePDF = async (req, res) => {
    try {
        const { id } = req.params;
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                customer: true,
                order: {
                    include: {
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });
        if (!invoice) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }
        res.json({
            success: true,
            data: invoice,
            message: 'PDF generation would be implemented here'
        });
    }
    catch (error) {
        console.error('Generate invoice PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate invoice PDF'
        });
    }
};
exports.generateInvoicePDF = generateInvoicePDF;
//# sourceMappingURL=invoiceController.js.map