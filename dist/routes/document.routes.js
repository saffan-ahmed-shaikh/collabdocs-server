"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const document_controller_2 = require("../controllers/document.controller");
const router = (0, express_1.Router)();
// All document routes are protected
router.use(auth_middleware_1.authenticate);
router.get("/", document_controller_1.getDocuments);
router.get("/:id", document_controller_1.getDocument);
router.post("/", document_controller_1.createDocument);
router.patch("/:id", document_controller_1.updateDocument);
router.delete("/:id", document_controller_1.deleteDocument);
router.post("/:id/collaborators", document_controller_1.addCollaborator);
router.delete("/:id/collaborators/:userId", document_controller_1.removeCollaborator);
router.patch("/:id/collaborators/:userId", document_controller_1.updateCollaboratorRole);
router.patch("/:id/content", document_controller_2.saveContent);
exports.default = router;
