"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            (0, logger_1.logEvent)("auth:missing_token", {
                method: req.method,
                path: req.originalUrl,
            });
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        (0, logger_1.logEvent)("auth:success", {
            userId: decoded.id,
            email: decoded.email,
            name: decoded.name,
        });
        next();
    }
    catch (err) {
        (0, logger_1.logEvent)("auth:failed", {
            method: req.method,
            path: req.originalUrl,
        });
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.authenticate = authenticate;
