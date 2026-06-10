import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { AppDataSource } from "./config/database";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import jwt from "jsonwebtoken";
import * as Y from "yjs";
import * as DocumentService from "./services/document.service";
import { Document } from "./entities/Document";
import { logEvent, requestLogger } from "./utils/logger";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

// Log every HTTP request (must be before /api routes)
app.use(requestLogger);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    db: AppDataSource.isInitialized ? "connected" : "disconnected",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);

// Store Yjs docs per document room
const yDocs = new Map<string, Y.Doc>();
const saveTimers = new Map<string, NodeJS.Timeout>();

const COLORS = [
  "#E24B4A",
  "#1D9E75",
  "#378ADD",
  "#BA7517",
  "#534AB7",
  "#D4537E",
];

// Track active users per document
const documentUsers = new Map<
  string,
  Map<string, { id: string; name: string; color: string }>
>();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      name: string;
      email: string;
    };

    (socket as any).user = decoded;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

const cleanupDocument = (documentId: string) => {
  const users = documentUsers.get(documentId);

  if (users && users.size === 0) {
    logEvent("socket:cleanup_document", { documentId });

    yDocs.delete(documentId);
    documentUsers.delete(documentId);

    const ydoc = yDocs.get(documentId);

    if (ydoc) {
      const state = Y.encodeStateAsUpdate(ydoc);

      AppDataSource.getRepository(Document)
        .update(
          { id: documentId },
          {
            yjs_state: Buffer.from(state).toString("base64"),
          },
        )
        .catch(console.error);
    }

    yDocs.delete(documentId);
    documentUsers.delete(documentId);

    clearTimeout(saveTimers.get(documentId));
    saveTimers.delete(documentId);
  }
};

io.on("connection", (socket) => {
  const user = (socket as any).user;

  socket.join(`user:${user.id}`);

  logEvent("socket:connected", { socketId: socket.id, userId: user?.id });

  socket.on("join-document", async (documentId: string) => {
    const role = await DocumentService.getUserDocumentRole(documentId, user.id);
    const hasAccess = await DocumentService.hasDocumentAccess(
      documentId,
      user.id,
    );

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

      const doc = await AppDataSource.query(
        "SELECT yjs_state FROM documents WHERE id = $1",
        [documentId],
      );

      if (doc.length > 0 && doc[0].yjs_state) {
        const update = Buffer.from(doc[0].yjs_state, "base64");
        Y.applyUpdate(ydoc, new Uint8Array(update));
      }

      yDocs.set(documentId, ydoc);
    }
    const ydoc = yDocs.get(documentId)!;

    // Init user tracking for this room
    if (!documentUsers.has(documentId)) {
      documentUsers.set(documentId, new Map());
    }

    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const userInfo = { id: user.id, name: user.name, color };
    documentUsers.get(documentId)!.set(user.id, userInfo);

    // Send current Yjs state to joining user
    const stateVector = Y.encodeStateAsUpdate(ydoc);
    socket.emit("yjs-sync", Buffer.from(stateVector).toString("base64"));

    // Also send title from DB
    try {
      const doc = await AppDataSource.query(
        "SELECT title, content FROM documents WHERE id = $1",
        [documentId],
      );
      if (doc.length > 0) {
        socket.emit("document-init", { title: doc[0].title });
      }
    } catch (err) {
      console.error("Failed to fetch document:", err);
    }

    // Broadcast updated user list
    io.to(documentId).emit(
      "users-changed",
      Array.from(documentUsers.get(documentId)!.values()),
    );

    // Receive Yjs updates from this client
    socket.on("yjs-update", async (update: string) => {
      if (role === "viewer") {
        return;
      }

      logEvent("socket:yjs_update_received", { documentId });

      const uint8Update = Buffer.from(update, "base64");

      Y.applyUpdate(ydoc, uint8Update);

      const currentState = Y.encodeStateAsUpdate(ydoc);

      logEvent("socket:yjs_state_size", {
        documentId,
        bytes: currentState.length,
      });

      logEvent("socket:yjs_persist_scheduled", { documentId, delayMs: 3000 });

      clearTimeout(saveTimers.get(documentId));

      saveTimers.set(
        documentId,
        setTimeout(async () => {
          const state = Y.encodeStateAsUpdate(ydoc);

          await AppDataSource.getRepository(Document).update(
            { id: documentId },
            {
              yjs_state: Buffer.from(state).toString("base64"),
            },
          );

          logEvent("socket:yjs_persisted", { documentId });
        }, 3000),
      );

      logEvent("socket:yjs_persist_job_queued", { documentId });

      socket.to(documentId).emit("yjs-update", update);
    });

    socket.on("title-change", (title: string) => {
      if (role !== "owner" && role !== "editor") {
        return;
      }
      socket.to(documentId).emit("title-update", title);
    });

    socket.on("awareness-update", (update: string) => {
      socket.to(documentId).emit("awareness-update", update);
    });

    socket.on("leave-document", () => {
      documentUsers.get(documentId)?.delete(user.id);

      io.to(documentId).emit(
        "users-changed",
        Array.from(documentUsers.get(documentId)?.values() || []),
      );

      cleanupDocument(documentId);

      socket.leave(documentId);
    });

    socket.on("disconnect", () => {
      documentUsers.get(documentId)?.delete(user.id);

      io.to(documentId).emit(
        "users-changed",
        Array.from(documentUsers.get(documentId)?.values() || []),
      );

      cleanupDocument(documentId);
    });
  });
});

export { httpServer };
export default app;
