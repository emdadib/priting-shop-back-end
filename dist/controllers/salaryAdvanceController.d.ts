import { Request, Response } from 'express';
export declare const getAllSalaryAdvances: (req: Request, res: Response) => Promise<Response | void>;
export declare const getSalaryAdvanceById: (req: Request, res: Response) => Promise<Response | void>;
export declare const createSalaryAdvance: (req: Request, res: Response) => Promise<Response | void>;
export declare const approveSalaryAdvance: (req: Request, res: Response) => Promise<Response | void>;
export declare const paySalaryAdvance: (req: Request, res: Response) => Promise<Response | void>;
export declare const rejectSalaryAdvance: (req: Request, res: Response) => Promise<Response | void>;
export declare const deleteSalaryAdvance: (req: Request, res: Response) => Promise<Response | void>;
export declare const getEmployeeAdvanceSummary: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=salaryAdvanceController.d.ts.map