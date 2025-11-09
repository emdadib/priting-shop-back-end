"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateWalkInCustomer = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getOrCreateWalkInCustomer = async () => {
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
            createdAt: 'asc'
        }
    });
    if (!walkInCustomer) {
        const walkInEmail = 'walkin@system.internal';
        const existingByEmail = await prisma.customer.findUnique({
            where: { email: walkInEmail }
        });
        if (existingByEmail) {
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
            }
            else {
                walkInCustomer = existingByEmail;
            }
        }
        else {
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
    }
    else {
        console.log('Reusing existing walk-in customer:', walkInCustomer.id);
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
exports.getOrCreateWalkInCustomer = getOrCreateWalkInCustomer;
//# sourceMappingURL=walkInCustomer.js.map