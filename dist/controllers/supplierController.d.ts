import { Request, Response } from 'express';
export declare const getAllSuppliers: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSupplierById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createSupplier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateSupplier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteSupplier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const permanentlyDeleteSupplier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getSupplierStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=supplierController.d.ts.map