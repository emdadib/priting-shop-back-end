import { Request, Response } from 'express';
export declare const getAllOrders: (req: Request, res: Response) => Promise<Response | void>;
export declare const getOrderById: (req: Request, res: Response) => Promise<Response | void>;
export declare const createOrder: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateOrder: (req: Request, res: Response) => Promise<Response | void>;
export declare const deleteOrder: (req: Request, res: Response) => Promise<Response | void>;
export declare const getOrdersByStatus: (req: Request, res: Response) => Promise<Response | void>;
export declare const getOrdersByCustomer: (req: Request, res: Response) => Promise<Response | void>;
export declare const getOrdersByDateRange: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateOrderStatus: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=orderController.d.ts.map