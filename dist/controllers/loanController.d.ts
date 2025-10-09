import { Request, Response } from 'express';
export declare const getLoans: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLoan: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const createLoan: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateLoan: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const deleteLoan: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const addLoanPayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLoanPayments: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const getLoanSummary: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=loanController.d.ts.map