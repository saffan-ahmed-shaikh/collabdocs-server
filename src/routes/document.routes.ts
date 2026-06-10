import { Router } from "express";
import {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  addCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from "../controllers/document.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { saveContent } from "../controllers/document.controller";

const router = Router();

// All document routes are protected
router.use(authenticate);

router.get("/", getDocuments);
router.get("/:id", getDocument);
router.post("/", createDocument);
router.patch("/:id", updateDocument);
router.delete("/:id", deleteDocument);
router.post("/:id/collaborators", addCollaborator);
router.delete("/:id/collaborators/:userId", removeCollaborator);
router.patch("/:id/collaborators/:userId", updateCollaboratorRole);
router.patch("/:id/content", saveContent);

export default router;
