import { Request, Response } from 'express';
export declare const getCustomerLedger: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSupplierLedger: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getCompanyLedger: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addCustomerTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addSupplierTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addCompanyTransaction: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAccountingSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getAgingReport: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=accountingController.d.ts.map