import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

// The order controllers instantiate their own PrismaClient at import time, so the
// /client module is stubbed. Every `new PrismaClient()` returns the same in-memory
// `order` delegate, exposed for assertions via `__mockOrder`.
jest.mock('@prisma/client', () => {
  const order = { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() };
  return {
    PrismaClient: jest.fn(() => ({ order })),
    __mockOrder: order,
  };
});

jest.mock('../utils/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import * as prismaClientModule from '@prisma/client';
import orderRoutes from '../routes/orders';

const { findMany: findManyMock, count: countMock, findUnique: findUniqueMock } = (
  prismaClientModule as unknown as {
    __mockOrder: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
  }
).__mockOrder;

const SAFE_USER_SELECT = { select: { id: true, firstName: true, lastName: true, username: true } };
const employee = { id: 'emp-1', firstName: 'Rahim', lastName: 'Uddin', username: 'rahim01' };

interface OrderJson { user: unknown }
interface ListResponse { success: boolean; data: OrderJson[] }
interface ItemResponse { success: boolean; data: OrderJson }

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  // Stand-in for authenticateToken: the routes are mounted behind it in index.ts
  app.use((req, _res, next) => {
    Object.assign(req, { user: { id: 'test-user', email: 't@example.com', username: 'tester', role: 'CASHIER' } });
    next();
  });
  app.use('/api/orders', orderRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('GET /api/orders', () => {
  it('returns each order with the creating employee name but never the password hash', async () => {
    findManyMock.mockResolvedValue([
      { id: 'ord-1', orderNumber: 'ORD-001', userId: employee.id, user: employee, customer: null, items: [], total: '100.00' },
    ]);
    countMock.mockResolvedValue(1);

    const res = await fetch(`${baseUrl}/api/orders`);
    const json = (await res.json()) as ListResponse;

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data[0]?.user).toEqual(employee);

    expect(findManyMock).toHaveBeenCalledTimes(1);
    const query = findManyMock.mock.calls[0][0];
    expect(query.include.user).toEqual(SAFE_USER_SELECT);
    expect(query.include.user.select).not.toHaveProperty('password');
  });
});

describe('GET /api/orders/:id', () => {
  it('loads the creating employee with the same safe field selection', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'ord-1', orderNumber: 'ORD-001', user: employee, customer: null, items: [], payments: [],
    });

    const res = await fetch(`${baseUrl}/api/orders/ord-1`);
    const json = (await res.json()) as ItemResponse;

    expect(res.status).toBe(200);
    expect(json.data.user).toMatchObject({ firstName: 'Rahim', lastName: 'Uddin' });
    expect(findUniqueMock.mock.calls[0][0].include.user).toEqual(SAFE_USER_SELECT);
  });
});
