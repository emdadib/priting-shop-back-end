import { Request, Response } from 'express';
export declare const getAllSalaries: (req: Request, res: Response) => Promise<Response | void>;
export declare const getSalaryById: (req: Request, res: Response) => Promise<Response | void>;
export declare const createSalary: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateSalary: (req: Request, res: Response) => Promise<Response | void>;
export declare const markSalaryAsPaid: (req: Request, res: Response) => Promise<Response | void>;
export declare const deleteSalary: (req: Request, res: Response) => Promise<Response | void>;
export declare const getSalarySummary: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=salaryController.d.ts.map