import { Request, Response } from 'express';
export declare const login: (req: Request, res: Response) => Promise<Response | void>;
export declare const register: (req: Request, res: Response) => Promise<Response | void>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response | void>;
export declare const logout: (req: Request, res: Response) => Promise<Response | void>;
export declare const changePassword: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=authController.d.ts.map