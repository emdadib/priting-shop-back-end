import { Request, Response } from 'express';
export declare const getAllInvoices: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInvoiceById: (req: Request, res: Response) => Promise<Response | void>;
export declare const createInvoice: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateInvoice: (req: Request, res: Response) => Promise<Response | void>;
export declare const deleteInvoice: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInvoicesByStatus: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInvoicesByCustomer: (req: Request, res: Response) => Promise<Response | void>;
export declare const generateInvoicePDF: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=invoiceController.d.ts.map