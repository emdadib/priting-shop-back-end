import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                username: string;
                role: string;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const requireRole: (roles: string[]) => (req: Request, res: Response, next: NextFunction) => Response | void;
export declare const requireSuperAdmin: (req: Request, res: Response, next: NextFunction) => Response | void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response | void;
export declare const requireManager: (req: Request, res: Response, next: NextFunction) => Response | void;
export declare const requireCashier: (req: Request, res: Response, next: NextFunction) => Response | void;
export declare const requirePermission: (resource: string, action: string) => (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
export declare const canViewMenu: (userId: string, menuName: string) => Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map