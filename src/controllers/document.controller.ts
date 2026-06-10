import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import * as DocumentService from "../services/document.service";
import { logEvent } from "../utils/logger";

const getDocumentId = (id: string | string[]) =>
  Array.isArray(id) ? id[0] : id;

export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const docs = await DocumentService.getUserDocuments(req.user!.id);

    logEvent("document:list_success", {
      userId: req.user!.id,
      count: docs?.length ?? undefined,
    });

    res.json({ documents: docs });
  } catch {
    logEvent("document:list_failed", { userId: req.user!.id });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDocument = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const doc = await DocumentService.getDocumentById(documentId, req.user!.id);

    logEvent("document:get_success", {
      userId: req.user!.id,
      documentId,
    });

    res.json({ document: doc });
  } catch (err: any) {
    if (err.message === "NOT_FOUND") {
      logEvent("document:get_not_found", {
        userId: req.user!.id,
        documentId: getDocumentId(req.params.id),
      });
      return res
        .status(404)
        .json({ message: "Document not found or access denied" });
    }
    logEvent("document:get_failed", {
      userId: req.user!.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createDocument = async (req: AuthRequest, res: Response) => {
  try {
    const doc = await DocumentService.createDocument(
      req.user!.id,
      req.body.title,
    );

    logEvent("document:create_success", {
      userId: req.user!.id,
      documentId: doc?.id,
    });

    res.status(201).json({ document: doc });
  } catch {
    logEvent("document:create_failed", { userId: req.user!.id });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateDocument = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const doc = await DocumentService.updateDocumentTitle(
      documentId,
      req.user!.id,
      req.body.title,
    );

    logEvent("document:update_title_success", {
      userId: req.user!.id,
      documentId,
    });

    res.json({ document: doc });
  } catch (err: any) {
    if (err.message === "FORBIDDEN") {
      logEvent("document:update_title_forbidden", {
        userId: req.user!.id,
        documentId: getDocumentId(req.params.id),
      });
      return res.status(403).json({ message: "Not authorized" });
    }
    logEvent("document:update_title_failed", {
      userId: req.user!.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = getDocumentId(req.params.id);
    await DocumentService.deleteDocument(documentId, req.user!.id);

    logEvent("document:delete_success", {
      userId: req.user!.id,
      documentId,
    });

    res.json({ message: "Document deleted successfully" });
  } catch (err: any) {
    if (err.message === "FORBIDDEN") {
      logEvent("document:delete_forbidden", {
        userId: req.user!.id,
        documentId: getDocumentId(req.params.id),
      });
      return res.status(403).json({ message: "Not authorized" });
    }
    logEvent("document:delete_failed", {
      userId: req.user!.id,
      documentId: getDocumentId(req.params.id),
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

export const addCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email || !["editor", "viewer"].includes(role))
      return res.status(400).json({ message: "Valid email and role required" });

    const documentId = getDocumentId(req.params.id);
    const result = await DocumentService.addCollaborator(
      documentId,
      req.user!.id,
      email,
      role,
    );

    const io = req.app.get("io");

    io.to(`user:${result.user.id}`).emit("document-shared", {
      documentId,
    });

    logEvent("document:collaborator_add_success", {
      ownerId: req.user!.id,
      documentId,
      collaboratorEmail: email,
      role,
      collaboratorId: (result as any)?.id ?? (result as any)?.userId,
    });

    res.status(201).json({ message: "Collaborator added", ...result });
  } catch (err: any) {
    logEvent("document:collaborator_add_failed", {
      ownerId: req.user!.id,
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

export const removeCollaborator = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = getDocumentId(req.params.id);
    const userId = getDocumentId(req.params.userId);
    console.log("REMOVE COLLAB CALLED", {
      documentId,
      userId,
      time: new Date().toISOString(),
    });
    await DocumentService.removeCollaborator(documentId, req.user!.id, userId);

    logEvent("document:collaborator_remove_success", {
      ownerId: req.user!.id,
      documentId,
      collaboratorId: userId,
    });

    res.json({ message: "Collaborator removed" });
  } catch (err: any) {
    logEvent("document:collaborator_remove_failed", {
      ownerId: req.user!.id,
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

export const updateCollaboratorRole = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { role } = req.body;
    if (!["editor", "viewer"].includes(role))
      return res.status(400).json({ message: "Valid role required" });

    const documentId = getDocumentId(req.params.id);
    const userId = getDocumentId(req.params.userId);
    await DocumentService.updateCollaboratorRole(
      documentId,
      req.user!.id,
      userId,
      role,
    );

    logEvent("document:collaborator_role_update_success", {
      ownerId: req.user!.id,
      documentId,
      collaboratorId: userId,
      role,
    });

    res.json({ message: "Role updated" });
  } catch (err: any) {
    logEvent("document:collaborator_role_update_failed", {
      ownerId: req.user!.id,
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

export const saveContent = async (req: AuthRequest, res: Response) => {
  try {
    const documentId = getDocumentId(req.params.id);
    await DocumentService.saveDocumentContent(
      documentId,
      req.user!.id,
      req.body.content,
    );

    logEvent("document:save_content_success", {
      userId: req.user!.id,
      documentId,
    });

    res.json({ message: "Content saved" });
  } catch (err: any) {
    logEvent("document:save_content_failed", {
      userId: req.user!.id,
      documentId: getDocumentId(req.params.id),
      error: err?.message ?? "unknown",
    });

    if (err.message === "FORBIDDEN")
      return res.status(403).json({ message: "Not authorized" });
    res.status(500).json({ message: "Internal server error" });
  }
};
