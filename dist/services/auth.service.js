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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshUserToken = exports.loginUser = exports.registerUser = void 0;
const database_1 = require("../config/database");
const User_1 = require("../entities/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const userRepo = () => database_1.AppDataSource.getRepository(User_1.User);
const registerUser = async (name, email, password) => {
    const existing = await userRepo().findOne({ where: { email } });
    if (existing)
        throw new Error("EMAIL_EXISTS");
    const hashed = await bcryptjs_1.default.hash(password, 12);
    const user = userRepo().create({ name, email, password: hashed });
    await userRepo().save(user);
    const tokens = (0, jwt_1.generateTokens)(user.id, user.email, user.name);
    return {
        user: { id: user.id, name: user.name, email: user.email },
        ...tokens,
    };
};
exports.registerUser = registerUser;
const loginUser = async (email, password) => {
    const user = await userRepo()
        .createQueryBuilder("user")
        .addSelect("user.password")
        .where("user.email = :email", { email })
        .getOne();
    if (!user)
        throw new Error("INVALID_CREDENTIALS");
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch)
        throw new Error("INVALID_CREDENTIALS");
    const tokens = (0, jwt_1.generateTokens)(user.id, user.email, user.name);
    return {
        user: { id: user.id, name: user.name, email: user.email },
        ...tokens,
    };
};
exports.loginUser = loginUser;
const refreshUserToken = async (refreshToken) => {
    const jwt = await Promise.resolve().then(() => __importStar(require("jsonwebtoken")));
    const decoded = jwt.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await userRepo().findOne({ where: { id: decoded.id } });
    if (!user)
        throw new Error("USER_NOT_FOUND");
    return (0, jwt_1.generateTokens)(user.id, user.email, user.name);
};
exports.refreshUserToken = refreshUserToken;
