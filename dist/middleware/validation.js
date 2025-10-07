"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const express_validator_1 = require("express-validator");
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        res.status(400).json({
            success: false,
            errors: errors.array().map((error) => ({
                field: error.type === 'field' ? error.path : 'unknown',
                message: error.msg,
                value: error.type === 'field' ? error.value : undefined
            }))
        });
        return;
    }
    next();
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map