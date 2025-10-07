import { Request, Response } from 'express';
export declare const getAllPurchaseOrders: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPurchaseOrderById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createPurchaseOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePurchaseOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updatePurchaseOrderStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deletePurchaseOrder: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPurchaseOrderStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getPurchaseOrdersBySupplier: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=purchaseOrderController.d.ts.map