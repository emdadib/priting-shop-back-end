"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.originalUrl
    });
};
exports.notFound = notFound;
//# sourceMappingURL=notFound.js.map