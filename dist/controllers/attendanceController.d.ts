import { Request, Response } from 'express';
export declare const getAllAttendance: (req: Request, res: Response) => Promise<Response | void>;
export declare const getAttendanceById: (req: Request, res: Response) => Promise<Response | void>;
export declare const createAttendance: (req: Request, res: Response) => Promise<Response | void>;
export declare const updateAttendance: (req: Request, res: Response) => Promise<Response | void>;
export declare const deleteAttendance: (req: Request, res: Response) => Promise<Response | void>;
export declare const getAttendance: (req: Request, res: Response) => Promise<Response | void>;
export declare const clockIn: (req: Request, res: Response) => Promise<Response | void>;
export declare const clockOut: (req: Request, res: Response) => Promise<Response | void>;
export declare const getAttendanceReport: (req: Request, res: Response) => Promise<Response | void>;
//# sourceMappingURL=attendanceController.d.ts.map