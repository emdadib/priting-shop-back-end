"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupplierStats = exports.permanentlyDeleteSupplier = exports.deleteSupplier = exports.updateSupplier = exports.createSupplier = exports.getSupplierById = exports.getAllSuppliers = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllSuppliers = async (req, res) => {
    try {
        console.log('Fetching suppliers...');
        const { includeInactive = 'false' } = req.query;
        const showInactive = includeInactive === 'true';
        const whereClause = showInactive ? {} : { isActive: true };
        const suppliers = await prisma.supplier.findMany({
            where: whereClause,
            include: {
                products: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                purchaseOrders: {
                    select: {
                        id: true,
                        poNumber: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        console.log(`Found ${suppliers.length} suppliers (includeInactive: ${showInactive}):`, suppliers);
        return res.json(suppliers);
    }
    catch (error) {
        console.error('Error fetching suppliers:', error);
        return res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
};
exports.getAllSuppliers = getAllSuppliers;
const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                products: true,
                purchaseOrders: {
                    include: {
                        items: true
                    }
                }
            }
        });
        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        return res.json(supplier);
    }
    catch (error) {
        console.error('Error fetching supplier:', error);
        return res.status(500).json({ error: 'Failed to fetch supplier' });
    }
};
exports.getSupplierById = getSupplierById;
const createSupplier = async (req, res) => {
    try {
        console.log('Creating supplier with data:', req.body);
        const { name, company, email, phone, address, city, state, zipCode, country, taxId, contactPerson, contactPhone, website, paymentTerms, creditLimit, notes } = req.body;
        if (!name || name.trim() === '') {
            console.log('Validation failed: Name is required');
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!company || company.trim() === '') {
            console.log('Validation failed: Company is required');
            return res.status(400).json({ error: 'Company is required' });
        }
        if (!phone || phone.trim() === '') {
            console.log('Validation failed: Phone is required');
            return res.status(400).json({ error: 'Phone is required' });
        }
        console.log('Validation passed, creating supplier...');
        const supplier = await prisma.supplier.create({
            data: {
                name: name.trim(),
                company: company.trim(),
                email: email?.trim() || null,
                phone: phone.trim(),
                address: address?.trim() || null,
                city: city?.trim() || null,
                state: state?.trim() || null,
                zipCode: zipCode?.trim() || null,
                country: country?.trim() || null,
                taxId: taxId?.trim() || null,
                contactPerson: contactPerson?.trim() || null,
                contactPhone: contactPhone?.trim() || null,
                website: website?.trim() || null,
                paymentTerms: paymentTerms?.trim() || null,
                creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                notes: notes?.trim() || null
            }
        });
        console.log('Supplier created successfully:', supplier);
        return res.status(201).json(supplier);
    }
    catch (error) {
        console.error('Error creating supplier:', error);
        return res.status(500).json({ error: 'Failed to create supplier' });
    }
};
exports.createSupplier = createSupplier;
const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, company, email, phone, address, city, state, zipCode, country, taxId, contactPerson, contactPhone, website, paymentTerms, creditLimit, isActive, notes } = req.body;
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!company || company.trim() === '') {
            return res.status(400).json({ error: 'Company is required' });
        }
        if (!phone || phone.trim() === '') {
            return res.status(400).json({ error: 'Phone is required' });
        }
        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name: name.trim(),
                company: company.trim(),
                email: email?.trim() || null,
                phone: phone.trim(),
                address: address?.trim() || null,
                city: city?.trim() || null,
                state: state?.trim() || null,
                zipCode: zipCode?.trim() || null,
                country: country?.trim() || null,
                taxId: taxId?.trim() || null,
                contactPerson: contactPerson?.trim() || null,
                contactPhone: contactPhone?.trim() || null,
                website: website?.trim() || null,
                paymentTerms: paymentTerms?.trim() || null,
                creditLimit: creditLimit ? parseFloat(creditLimit) : null,
                isActive: isActive !== undefined ? isActive : true,
                notes: notes?.trim() || null
            }
        });
        return res.json(supplier);
    }
    catch (error) {
        console.error('Error updating supplier:', error);
        return res.status(500).json({ error: 'Failed to update supplier' });
    }
};
exports.updateSupplier = updateSupplier;
const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierWithRelations = await prisma.supplier.findUnique({
            where: { id },
            include: {
                products: true,
                purchaseOrders: true
            }
        });
        if (!supplierWithRelations) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }
        if (supplierWithRelations.products.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete supplier with associated products'
            });
        }
        if (supplierWithRelations.purchaseOrders.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete supplier with associated purchase orders'
            });
        }
        await prisma.supplier.update({
            where: { id },
            data: { isActive: false }
        });
        return res.json({
            success: true,
            message: 'Supplier deactivated successfully'
        });
    }
    catch (error) {
        console.error('Error deleting supplier:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete supplier'
        });
    }
};
exports.deleteSupplier = deleteSupplier;
const permanentlyDeleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const supplierWithRelations = await prisma.supplier.findUnique({
            where: { id },
            include: {
                products: true,
                purchaseOrders: true
            }
        });
        if (!supplierWithRelations) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }
        if (supplierWithRelations.products.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot permanently delete supplier with associated products. Please remove all products first.'
            });
        }
        if (supplierWithRelations.purchaseOrders.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot permanently delete supplier with associated purchase orders. Please remove all purchase orders first.'
            });
        }
        await prisma.supplier.delete({
            where: { id }
        });
        return res.json({
            success: true,
            message: 'Supplier permanently deleted successfully'
        });
    }
    catch (error) {
        console.error('Error permanently deleting supplier:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to permanently delete supplier'
        });
    }
};
exports.permanentlyDeleteSupplier = permanentlyDeleteSupplier;
const getSupplierStats = async (req, res) => {
    try {
        console.log('Fetching supplier stats...');
        const totalSuppliers = await prisma.supplier.count({
            where: { isActive: true }
        });
        const activeSuppliers = await prisma.supplier.count({
            where: { isActive: true }
        });
        const suppliersWithProducts = await prisma.supplier.count({
            where: {
                isActive: true,
                products: {
                    some: {}
                }
            }
        });
        const stats = {
            totalSuppliers,
            activeSuppliers,
            suppliersWithProducts
        };
        console.log('Supplier stats:', stats);
        return res.json(stats);
    }
    catch (error) {
        console.error('Error fetching supplier stats:', error);
        return res.status(500).json({ error: 'Failed to fetch supplier statistics' });
    }
};
exports.getSupplierStats = getSupplierStats;
//# sourceMappingURL=supplierController.js.map