import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Get or create the single walk-in customer record.
 * This ensures all walk-in transactions are associated with the same customer
 * for better ledger tracking and reporting.
 * 
 * @returns The walk-in customer record
 */
export const getOrCreateWalkInCustomer = async () => {
  // First, try to find any existing walk-in customer
  // We look for isWalkIn=true and empty/null phone to identify the generic walk-in customer
  let walkInCustomer = await prisma.customer.findFirst({
    where: {
      isWalkIn: true,
      OR: [
        { phone: '' },
        { phone: null },
        { firstName: 'Walk-in', lastName: 'Customer' }
      ]
    },
    orderBy: {
      createdAt: 'asc' // Get the first created one if multiple exist
    }
  });

  // If no walk-in customer exists, create one
  if (!walkInCustomer) {
    // Use a fixed email that clearly identifies this as the system walk-in customer
    const walkInEmail = 'walkin@system.internal';
    
    // Check if email already exists (shouldn't happen, but handle it)
    const existingByEmail = await prisma.customer.findUnique({
      where: { email: walkInEmail }
    });

    if (existingByEmail) {
      // If email exists but isWalkIn is false, update it
      if (!existingByEmail.isWalkIn) {
        walkInCustomer = await prisma.customer.update({
          where: { id: existingByEmail.id },
          data: {
            isWalkIn: true,
            firstName: 'Walk-in',
            lastName: 'Customer',
            phone: ''
          }
        });
      } else {
        walkInCustomer = existingByEmail;
      }
    } else {
      // Create new walk-in customer
      walkInCustomer = await prisma.customer.create({
        data: {
          firstName: 'Walk-in',
          lastName: 'Customer',
          email: walkInEmail,
          phone: '',
          address: '',
          isActive: true,
          isWalkIn: true
        }
      });
      console.log('Created new walk-in customer:', walkInCustomer.id);
    }
  } else {
    console.log('Reusing existing walk-in customer:', walkInCustomer.id);
    
    // Ensure the walk-in customer has the correct standard attributes
    if (walkInCustomer.firstName !== 'Walk-in' || walkInCustomer.lastName !== 'Customer' || walkInCustomer.phone !== '') {
      walkInCustomer = await prisma.customer.update({
        where: { id: walkInCustomer.id },
        data: {
          firstName: 'Walk-in',
          lastName: 'Customer',
          phone: ''
        }
      });
    }
  }

  return walkInCustomer;
};

