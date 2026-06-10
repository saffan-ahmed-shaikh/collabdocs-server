"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== "default") __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveContent =
  exports.updateCollaboratorRole =
  exports.removeCollaborator =
  exports.addCollaborator =
  exports.deleteDocument =
  exports.updateDocument =
  exports.createDocument =
  exports.getDocument =
  exports.getDocuments =
    void 0;
const DocumentService = __importStar(require("../services/document.service"));
const logger_1 = require("../utils/logger");
const getDocumentId = (id) => (Array.isArray(id) ? id[0] : id);
const getDocuments = async (req, res) => {
  try {
    const docs = await DocumentService.getUserDocuments(req.user.id);
    (0, logger_1.logEvent)("document:list_success", {
      userId: req.user.id,
      count: docs?.length ?? undefined,
    });
    res.json({ documents: docs });
  } catch {
    (0, logger_1.logEvent)("document:list_failed", { userId: req.user.id });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getDocuments = getDocuments;
const getDocument = async (req, res) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const doc = await DocumentService.getDocumentById(documentId, req.user.id);
    (0, logger_1.logEvent)("document:get_success", {
      userId: req.user.id,
      documentId,
    });
    res.json({ document: doc });
  } catch (err) {
    if (err.message === "NOT_FOUND") {
      (0, logger_1.logEvent)("document:get_not_found", {
        userId: req.user.id,
        documentId: getDocumentId(req.params.id),
      });
      return res
        .status(404)
        .json({ message: "Document not found or access denied" });
    }
    (0, logger_1.logEvent)("document:get_failed", {
      userId: req.user.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.getDocument = getDocument;
const createDocument = async (req, res) => {
  try {
    const doc = await DocumentService.createDocument(
      req.user.id,
      req.body.title,
    );
    (0, logger_1.logEvent)("document:create_success", {
      userId: req.user.id,
      documentId: doc?.id,
    });
    res.status(201).json({ document: doc });
  } catch {
    (0, logger_1.logEvent)("document:create_failed", { userId: req.user.id });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.createDocument = createDocument;
const updateDocument = async (req, res) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const doc = await DocumentService.updateDocumentTitle(
      documentId,
      req.user.id,
      req.body.title,
    );
    (0, logger_1.logEvent)("document:update_title_success", {
      userId: req.user.id,
      documentId,
    });
    res.json({ document: doc });
  } catch (err) {
    if (err.message === "FORBIDDEN") {
      (0, logger_1.logEvent)("document:update_title_forbidden", {
        userId: req.user.id,
        documentId: getDocumentId(req.params.id),
      });
      return res.status(403).json({ message: "Not authorized" });
    }
    (0, logger_1.logEvent)("document:update_title_failed", {
      userId: req.user.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.updateDocument = updateDocument;
const deleteDocument = async (req, res) => {
  try {
    const documentId = getDocumentId(req.params.id);
    await DocumentService.deleteDocument(documentId, req.user.id);
    (0, logger_1.logEvent)("document:delete_success", {
      userId: req.user.id,
      documentId,
    });
    res.json({ message: "Document deleted successfully" });
  } catch (err) {
    if (err.message === "FORBIDDEN") {
      (0, logger_1.logEvent)("document:delete_forbidden", {
        userId: req.user.id,
        documentId: getDocumentId(req.params.id),
      });
      return res.status(403).json({ message: "Not authorized" });
    }
    (0, logger_1.logEvent)("document:delete_failed", {
      userId: req.user.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.deleteDocument = deleteDocument;
const addCollaborator = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !["editor", "viewer"].includes(role))
      return res.status(400).json({ message: "Valid email and role required" });
    const documentId = getDocumentId(req.params.id);
    const result = await DocumentService.addCollaborator(
      documentId,
      req.user.id,
      email,
      role,
    );
    (0, logger_1.logEvent)("document:collaborator_add_success", {
      ownerId: req.user.id,
      documentId,
      collaboratorEmail: email,
      role,
      collaboratorId: result?.id ?? result?.userId,
    });
    res.status(201).json({ message: "Collaborator added", ...result });
  } catch (err) {
    (0, logger_1.logEvent)("document:collaborator_add_failed", {
      ownerId: req.user.id,
      documentId: getDocumentId(req.params.id),
      error: err?.message ?? "unknown",
    });
    if (err.message === "FORBIDDEN")
      return res
        .status(403)
        .json({ message: "Only owner can add collaborators" });
    if (err.message === "USER_NOT_FOUND")
      return res.status(404).json({ message: "User not found" });
    if (err.message === "SELF_COLLAB")
      return res
        .status(400)
        .json({ message: "Cannot add yourself as collaborator" });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.addCollaborator = addCollaborator;
const removeCollaborator = async (req, res) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const userId = getDocumentId(req.params.userId);
    await DocumentService.removeCollaborator(documentId, req.user.id, userId);
    (0, logger_1.logEvent)("document:collaborator_remove_success", {
      ownerId: req.user.id,
      documentId,
      collaboratorId: userId,
    });
    res.json({ message: "Collaborator removed" });
  } catch (err) {
    (0, logger_1.logEvent)("document:collaborator_remove_failed", {
      ownerId: req.user.id,
      documentId: getDocumentId(req.params.id),
      collaboratorId: getDocumentId(req.params.userId),
      error: err?.message ?? "unknown",
    });
    if (err.message === "FORBIDDEN")
      return res
        .status(403)
        .json({ message: "Only owner can remove collaborators" });
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ message: "Collaborator not found" });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.removeCollaborator = removeCollaborator;
const updateCollaboratorRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!["editor", "viewer"].includes(role))
      return res.status(400).json({ message: "Valid role required" });
    const documentId = getDocumentId(req.params.id);
    const userId = getDocumentId(req.params.userId);
    await DocumentService.updateCollaboratorRole(
      documentId,
      req.user.id,
      userId,
      role,
    );
    (0, logger_1.logEvent)("document:collaborator_role_update_success", {
      ownerId: req.user.id,
      documentId,
      collaboratorId: userId,
      role,
    });
    res.json({ message: "Role updated" });
  } catch (err) {
    (0, logger_1.logEvent)("document:collaborator_role_update_failed", {
      ownerId: req.user.id,
      documentId: getDocumentId(req.params.id),
      collaboratorId: getDocumentId(req.params.userId),
      role: req.body?.role,
      error: err?.message ?? "unknown",
    });
    if (err.message === "FORBIDDEN")
      return res.status(403).json({ message: "Only owner can update roles" });
    if (err.message === "NOT_FOUND")
      return res.status(404).json({ message: "Collaborator not found" });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.updateCollaboratorRole = updateCollaboratorRole;
const saveContent = async (req, res) => {
  try {
    const documentId = getDocumentId(req.params.id);
    await DocumentService.saveDocumentContent(
      documentId,
      req.user.id,
      req.body.content,
    );
    (0, logger_1.logEvent)("document:save_content_success", {
      userId: req.user.id,
      documentId,
    });
    res.json({ message: "Content saved" });
  } catch (err) {
    (0, logger_1.logEvent)("document:save_content_failed", {
      userId: req.user.id,
      documentId: getDocumentId(req.params.id),
      error: err?.message ?? "unknown",
    });
    if (err.message === "FORBIDDEN")
      return res.status(403).json({ message: "Not authorized" });
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.saveContent = saveContent;
