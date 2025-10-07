import { Request, Response } from 'express';
export declare const getInventory: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInventoryByProduct: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateStock: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInventoryMovements: (req: Request, res: Response) => Promise<Response | void>;
export declare const getLowStockAlerts: (req: Request, res: Response) => Promise<Response | void>;
export declare const bulkUpdateInventory: (req: Request, res: Response) => Promise<Response | void>;
export declare const getInventoryReport: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=inventoryController.d.ts.map