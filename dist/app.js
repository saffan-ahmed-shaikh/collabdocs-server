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
exports.httpServer = void 0;
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const document_routes_1 = __importDefault(require("./routes/document.routes"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Y = __importStar(require("yjs"));
const DocumentService = __importStar(require("./services/document.service"));
const Document_1 = require("./entities/Document");
const logger_1 = require("./utils/logger");
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        methods: ["GET", "POST"],
    },
});
app.use((0, cors_1.default)({ origin: process.env.CLIENT_URL }));
app.use(express_1.default.json());
// Log every HTTP request (must be before /api routes)
app.use(logger_1.requestLogger);
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        db: database_1.AppDataSource.isInitialized ? "connected" : "disconnected",
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/documents", document_routes_1.default);
// Store Yjs docs per document room
const yDocs = new Map();
const saveTimers = new Map();
const COLORS = [
    "#E24B4A",
    "#1D9E75",
    "#378ADD",
    "#BA7517",
    "#534AB7",
    "#D4537E",
];
// Track active users per document
const documentUsers = new Map();
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token)
            return next(new Error("Unauthorized"));
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    }
    catch {
        next(new Error("Unauthorized"));
    }
});
const cleanupDocument = (documentId) => {
    const users = documentUsers.get(documentId);
    if (users && users.size === 0) {
        (0, logger_1.logEvent)("socket:cleanup_document", { documentId });
        yDocs.delete(documentId);
        documentUsers.delete(documentId);
        const ydoc = yDocs.get(documentId);
        if (ydoc) {
            const state = Y.encodeStateAsUpdate(ydoc);
            database_1.AppDataSource.getRepository(Document_1.Document)
                .update({ id: documentId }, {
                yjs_state: Buffer.from(state).toString("base64"),
            })
                .catch(console.error);
        }
        yDocs.delete(documentId);
        documentUsers.delete(documentId);
        clearTimeout(saveTimers.get(documentId));
        saveTimers.delete(documentId);
    }
};
io.on("connection", (socket) => {
    const user = socket.user;
    (0, logger_1.logEvent)("socket:connected", { socketId: socket.id, userId: user?.id });
    socket.on("join-document", async (documentId) => {
        const role = await DocumentService.getUserDocumentRole(documentId, user.id);
        const hasAccess = await DocumentService.hasDocumentAccess(documentId, user.id);
        if (!hasAccess) {
            socket.emit("error", {
                message: "Access denied",
            });
            return;
        }
        socket.join(documentId);
        // Init Yjs doc for this room if not exists
        if (!yDocs.has(documentId)) {
            const ydoc = new Y.Doc();
            const doc = await database_1.AppDataSource.query("SELECT yjs_state FROM documents WHERE id = $1", [documentId]);
            if (doc.length > 0 && doc[0].yjs_state) {
                const update = Buffer.from(doc[0].yjs_state, "base64");
                Y.applyUpdate(ydoc, new Uint8Array(update));
            }
            yDocs.set(documentId, ydoc);
        }
        const ydoc = yDocs.get(documentId);
        // Init user tracking for this room
        if (!documentUsers.has(documentId)) {
            documentUsers.set(documentId, new Map());
        }
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const userInfo = { id: user.id, name: user.name, color };
        documentUsers.get(documentId).set(user.id, userInfo);
        // Send current Yjs state to joining user
        const stateVector = Y.encodeStateAsUpdate(ydoc);
        socket.emit("yjs-sync", Buffer.from(stateVector).toString("base64"));
        // Also send title from DB
        try {
            const doc = await database_1.AppDataSource.query("SELECT title, content FROM documents WHERE id = $1", [documentId]);
            if (doc.length > 0) {
                socket.emit("document-init", { title: doc[0].title });
            }
        }
        catch (err) {
            console.error("Failed to fetch document:", err);
        }
        // Broadcast updated user list
        io.to(documentId).emit("users-changed", Array.from(documentUsers.get(documentId).values()));
        // Receive Yjs updates from this client
        socket.on("yjs-update", async (update) => {
            if (role === "viewer") {
                return;
            }
            (0, logger_1.logEvent)("socket:yjs_update_received", { documentId });
            const uint8Update = Buffer.from(update, "base64");
            Y.applyUpdate(ydoc, uint8Update);
            const currentState = Y.encodeStateAsUpdate(ydoc);
            (0, logger_1.logEvent)("socket:yjs_state_size", {
                documentId,
                bytes: currentState.length,
            });
            (0, logger_1.logEvent)("socket:yjs_persist_scheduled", { documentId, delayMs: 3000 });
            clearTimeout(saveTimers.get(documentId));
            saveTimers.set(documentId, setTimeout(async () => {
                const state = Y.encodeStateAsUpdate(ydoc);
                await database_1.AppDataSource.getRepository(Document_1.Document).update({ id: documentId }, {
                    yjs_state: Buffer.from(state).toString("base64"),
                });
                (0, logger_1.logEvent)("socket:yjs_persisted", { documentId });
            }, 3000));
            (0, logger_1.logEvent)("socket:yjs_persist_job_queued", { documentId });
            socket.to(documentId).emit("yjs-update", update);
        });
        socket.on("title-change", (title) => {
            if (role !== "owner" && role !== "editor") {
                return;
            }
            socket.to(documentId).emit("title-update", title);
        });
        socket.on("awareness-update", (update) => {
            socket.to(documentId).emit("awareness-update", update);
        });
        socket.on("leave-document", () => {
            documentUsers.get(documentId)?.delete(user.id);
            io.to(documentId).emit("users-changed", Array.from(documentUsers.get(documentId)?.values() || []));
            cleanupDocument(documentId);
            socket.leave(documentId);
        });
        socket.on("disconnect", () => {
            documentUsers.get(documentId)?.delete(user.id);
            io.to(documentId).emit("users-changed", Array.from(documentUsers.get(documentId)?.values() || []));
            cleanupDocument(documentId);
        });
    });
});
exports.default = app;
