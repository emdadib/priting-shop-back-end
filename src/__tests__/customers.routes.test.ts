import express from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

// customerController instantiates its own PrismaClient at import time, so the
// /client module is stubbed. Every `new PrismaClient()` returns the same
// in-memory `customer` delegate, exposed for assertions via `__mockCustomer`.
jest.mock('@prisma/client', () => {
  const customer = { create: jest.fn(), findMany: jest.fn() };
  return {
    PrismaClient: jest.fn(() => ({ customer })),
    __mockCustomer: customer,
  };
});

jest.mock('../utils/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));

import * as prismaClientModule from '@prisma/client';
import customerRoutes from '../routes/customers';

const { create: createMock, findMany: findManyMock } = (
  prismaClientModule as unknown as { __mockCustomer: { create: jest.Mock; findMany: jest.Mock } }
).__mockCustomer;

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
  app.use('/api/customers', customerRoutes);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const postCustomer = (body: unknown) =>
  fetch(`${baseUrl}/api/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/customers', () => {
  it('creates a customer from a first name only (POS quick-add)', async () => {
    const stored = { id: 'cust-1', firstName: 'Rahim', lastName: '', email: null, phone: null };
    createMock.mockResolvedValue(stored);

    const res = await postCustomer({ firstName: 'Rahim' });
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toEqual({ success: true, data: stored });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0][0].data).toMatchObject({
      firstName: 'Rahim',
      lastName: '',
      email: null,
    });
  });

  it('accepts an explicitly empty last name', async () => {
    createMock.mockResolvedValue({ id: 'cust-2', firstName: 'Karim', lastName: '' });

    const res = await postCustomer({ firstName: 'Karim', lastName: '' });

    expect(res.status).toBe(201);
    expect(createMock.mock.calls[0][0].data.lastName).toBe('');
  });

  it('still stores last name and phone when they are provided', async () => {
    createMock.mockResolvedValue({ id: 'cust-3' });

    const res = await postCustomer({ firstName: 'Abdul', lastName: '  Rahim Khan ', phone: '01700000000' });

    expect(res.status).toBe(201);
    expect(createMock.mock.calls[0][0].data).toMatchObject({
      firstName: 'Abdul',
      lastName: 'Rahim Khan',
      phone: '01700000000',
    });
  });

  it('rejects a request with no first name', async () => {
    const res = await postCustomer({ lastName: 'Khan' });
    const json = (await res.json()) as { success: boolean; errors: unknown[] };

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'firstName' })])
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only first name', async () => {
    const res = await postCustomer({ firstName: '   ' });

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/customers/search', () => {
  it('searches all name and contact fields using the q parameter', async () => {
    findManyMock.mockResolvedValue([{ id: 'cust-1' }]);

    const res = await fetch(`${baseUrl}/api/customers/search?q=rah`);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, data: [{ id: 'cust-1' }] });
    expect(findManyMock.mock.calls[0][0].where.OR).toEqual([
      { firstName: { contains: 'rah', mode: 'insensitive' } },
      { lastName: { contains: 'rah', mode: 'insensitive' } },
      { email: { contains: 'rah', mode: 'insensitive' } },
      { phone: { contains: 'rah', mode: 'insensitive' } },
    ]);
  });

  it('requires the q parameter', async () => {
    const res = await fetch(`${baseUrl}/api/customers/search`);

    expect(res.status).toBe(400);
    expect(findManyMock).not.toHaveBeenCalled();
  });
});
