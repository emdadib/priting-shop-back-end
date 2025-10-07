import { Request, Response } from 'express';
export declare const getAllPermissions: (req: Request, res: Response) => Promise<Response | void>;
export declare const getUserPermissions: (req: Request, res: Response) => Promise<Response | void>;
export declare const grantPermission: (req: Request, res: Response) => Promise<Response | void>;
export declare const revokePermission: (req: Request, res: Response) => Promise<Response | void>;
export declare const getAllMenus: (req: Request, res: Response) => Promise<Response | void>;
export declare const getUserMenuPermissions: (req: Request, res: Response) => Promise<Response | void>;
export declare const grantMenuPermission: (req: Request, res: Response) => Promise<Response | void>;
export declare const revokeMenuPermission: (req: Request, res: Response) => Promise<Response | void>;
export declare const getUserAccessibleMenus: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=permissionController.d.ts.map