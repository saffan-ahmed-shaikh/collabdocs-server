"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("../entities/User");
const Document_1 = require("../entities/Document");
const DocumentCollaborator_1 = require("../entities/DocumentCollaborator");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    synchronize: false,
    logging: false,
    entities: [User_1.User, Document_1.Document, DocumentCollaborator_1.DocumentCollaborator],
    migrations: ["src/migrations/*.ts"],
    subscribers: [],
});
