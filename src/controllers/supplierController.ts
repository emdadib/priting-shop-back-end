import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all suppliers
export const getAllSuppliers = async (req: Request, res: Response) => {
  try {
    console.log('Fetching suppliers...');
    
    // Get query parameters for filtering
    const { includeInactive = 'false' } = req.query;
    const showInactive = includeInactive === 'true';
    
    // Build where clause based on includeInactive parameter
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
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
};

// Get supplier by ID
export const getSupplierById = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier' });
  }
};

// Create new supplier
export const createSupplier = async (req: Request, res: Response) => {
  try {
    console.log('Creating supplier with data:', req.body);
    
    const {
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      taxId,
      contactPerson,
      contactPhone,
      website,
      paymentTerms,
      creditLimit,
      notes
    } = req.body;

    // Validate required fields - only name and phone are required
    if (!name || name.trim() === '') {
      console.log('Validation failed: Name is required');
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || phone.trim() === '') {
      console.log('Validation failed: Phone is required');
      return res.status(400).json({ error: 'Phone is required' });
    }

    console.log('Validation passed, creating supplier...');
    
    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value: string | undefined | null): string | null => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };
    
    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        company: company?.trim() || name.trim(), // Use name as default if company is not provided
        email: toNullIfEmpty(email),
        phone: phone.trim(),
        address: toNullIfEmpty(address),
        city: toNullIfEmpty(city),
        state: toNullIfEmpty(state),
        zipCode: toNullIfEmpty(zipCode),
        country: toNullIfEmpty(country),
        taxId: toNullIfEmpty(taxId),
        contactPerson: toNullIfEmpty(contactPerson),
        contactPhone: toNullIfEmpty(contactPhone),
        website: toNullIfEmpty(website),
        paymentTerms: toNullIfEmpty(paymentTerms),
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        notes: toNullIfEmpty(notes)
      }
    });

    console.log('Supplier created successfully:', supplier);
    return res.status(201).json(supplier);
  } catch (error) {
    console.error('Error creating supplier:', error);
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      company,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      taxId,
      contactPerson,
      contactPhone,
      website,
      paymentTerms,
      creditLimit,
      isActive,
      notes
    } = req.body;

    // Validate required fields - only name and phone are required
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!phone || phone.trim() === '') {
      return res.status(400).json({ error: 'Phone is required' });
    }

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value: string | undefined | null): string | null => {
      if (value === undefined || value === null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    };
    
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: name.trim(),
        company: company?.trim() || name.trim(), // Use name as default if company is not provided
        email: toNullIfEmpty(email),
        phone: phone.trim(),
        address: toNullIfEmpty(address),
        city: toNullIfEmpty(city),
        state: toNullIfEmpty(state),
        zipCode: toNullIfEmpty(zipCode),
        country: toNullIfEmpty(country),
        taxId: toNullIfEmpty(taxId),
        contactPerson: toNullIfEmpty(contactPerson),
        contactPhone: toNullIfEmpty(contactPhone),
        website: toNullIfEmpty(website),
        paymentTerms: toNullIfEmpty(paymentTerms),
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        isActive: isActive !== undefined ? isActive : true,
        notes: toNullIfEmpty(notes)
      }
    });

    return res.json(supplier);
  } catch (error) {
    console.error('Error updating supplier:', error);
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
};

// Delete supplier (soft delete)
export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if supplier has associated products or purchase orders
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

    // Soft delete by setting isActive to false
    await prisma.supplier.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({ 
      success: true, 
      message: 'Supplier deactivated successfully' 
    });
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to delete supplier' 
    });
  }
};

// Permanently delete supplier
export const permanentlyDeleteSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if supplier has associated products or purchase orders
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

    // Check for dependencies that would prevent permanent deletion
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

    // Permanently delete the supplier
    await prisma.supplier.delete({
      where: { id }
    });

    return res.json({ 
      success: true, 
      message: 'Supplier permanently deleted successfully' 
    });
  } catch (error) {
    console.error('Error permanently deleting supplier:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to permanently delete supplier' 
    });
  }
};

// Get supplier statistics
export const getSupplierStats = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Error fetching supplier stats:', error);
    return res.status(500).json({ error: 'Failed to fetch supplier statistics' });
  }
};
