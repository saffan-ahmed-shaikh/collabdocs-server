"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshToken = exports.login = exports.register = void 0;
const AuthService = __importStar(require("../services/auth.service"));
const logger_1 = require("../utils/logger");
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ message: "All fields are required" });
        const result = await AuthService.registerUser(name, email, password);
        const resultAny = result;
        (0, logger_1.logEvent)("auth:register_success", {
            email,
            userId: resultAny?.user?.id ?? resultAny?.id,
        });
        res.status(201).json({ message: "Registration successful", ...result });
    }
    catch (err) {
        if (err.message === "EMAIL_EXISTS") {
            (0, logger_1.logEvent)("auth:register_conflict", { email: req.body?.email });
            return res.status(409).json({ message: "Email already registered" });
        }
        (0, logger_1.logEvent)("auth:register_failed", { error: err?.message ?? "unknown" });
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email and password required" });
        const result = await AuthService.loginUser(email, password);
        const resultAny = result;
        (0, logger_1.logEvent)("auth:login_success", {
            email,
            userId: resultAny?.user?.id ?? resultAny?.id,
        });
        res.json({ message: "Login successful", ...result });
    }
    catch (err) {
        if (err.message === "INVALID_CREDENTIALS") {
            (0, logger_1.logEvent)("auth:login_failed_invalid_credentials", {
                email: req.body?.email,
            });
            return res.status(401).json({ message: "Invalid credentials" });
        }
        (0, logger_1.logEvent)("auth:login_failed", { error: err?.message ?? "unknown" });
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken)
            return res.status(401).json({ message: "Refresh token required" });
        const tokens = await AuthService.refreshUserToken(refreshToken);
        // Avoid logging refresh token value.
        const tokensAny = tokens;
        (0, logger_1.logEvent)("auth:refresh_success", {
            userId: tokensAny?.user?.id ?? tokensAny?.id,
        });
        res.json(tokens);
    }
    catch {
        (0, logger_1.logEvent)("auth:refresh_failed", { reason: "invalid_refresh_token" });
        res.status(401).json({ message: "Invalid refresh token" });
    }
};
exports.refreshToken = refreshToken;
