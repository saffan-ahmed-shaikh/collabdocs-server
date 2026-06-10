"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDocumentRole = exports.hasDocumentAccess = exports.saveDocumentContent = exports.updateCollaboratorRole = exports.removeCollaborator = exports.addCollaborator = exports.deleteDocument = exports.updateDocumentTitle = exports.createDocument = exports.getDocumentById = exports.getUserDocuments = void 0;
const database_1 = require("../config/database");
const Document_1 = require("../entities/Document");
const DocumentCollaborator_1 = require("../entities/DocumentCollaborator");
const User_1 = require("../entities/User");
const docRepo = () => database_1.AppDataSource.getRepository(Document_1.Document);
const collabRepo = () => database_1.AppDataSource.getRepository(DocumentCollaborator_1.DocumentCollaborator);
const userRepo = () => database_1.AppDataSource.getRepository(User_1.User);
const getUserDocuments = async (userId) => {
    return docRepo()
        .createQueryBuilder("doc")
        .leftJoinAndSelect("doc.owner", "owner")
        .leftJoinAndSelect("doc.collaborators", "collab")
        .where("doc.owner_id = :userId", { userId })
        .orWhere("collab.user_id = :userId", { userId })
        .orderBy("doc.updated_at", "DESC")
        .getMany();
};
exports.getUserDocuments = getUserDocuments;
const getDocumentById = async (id, userId) => {
    const doc = await docRepo()
        .createQueryBuilder("doc")
        .leftJoinAndSelect("doc.owner", "owner")
        .leftJoinAndSelect("doc.collaborators", "collab")
        .leftJoinAndSelect("collab.user", "user")
        .where("doc.id = :id", { id })
        .andWhere("(doc.owner_id = :userId OR collab.user_id = :userId)", {
        userId,
    })
        .getOne();
    if (!doc)
        throw new Error("NOT_FOUND");
    let role = "viewer";
    if (doc.owner_id === userId) {
        role = "owner";
    }
    else {
        const collaborator = doc.collaborators.find((c) => c.user_id === userId);
        role = collaborator?.role ?? "viewer";
    }
    return {
        ...doc,
        role,
    };
};
exports.getDocumentById = getDocumentById;
const createDocument = async (userId, title) => {
    const doc = docRepo().create({
        title: title || "Untitled Document",
        owner_id: userId,
    });
    return docRepo().save(doc);
};
exports.createDocument = createDocument;
const updateDocumentTitle = async (id, userId, title) => {
    const doc = await docRepo().findOne({ where: { id, owner_id: userId } });
    if (!doc)
        throw new Error("FORBIDDEN");
    doc.title = title;
    return docRepo().save(doc);
};
exports.updateDocumentTitle = updateDocumentTitle;
const deleteDocument = async (id, userId) => {
    const doc = await docRepo().findOne({ where: { id, owner_id: userId } });
    if (!doc)
        throw new Error("FORBIDDEN");
    await docRepo().remove(doc);
};
exports.deleteDocument = deleteDocument;
const addCollaborator = async (docId, ownerId, email, role) => {
    const doc = await docRepo().findOne({
        where: { id: docId, owner_id: ownerId },
    });
    if (!doc)
        throw new Error("FORBIDDEN");
    const user = await userRepo().findOne({ where: { email } });
    if (!user)
        throw new Error("USER_NOT_FOUND");
    if (user.id === ownerId)
        throw new Error("SELF_COLLAB");
    const existing = await collabRepo().findOne({
        where: { document_id: docId, user_id: user.id },
    });
    if (existing) {
        existing.role = role;
        await collabRepo().save(existing);
    }
    else {
        const collab = collabRepo().create({
            document_id: docId,
            user_id: user.id,
            role,
        });
        await collabRepo().save(collab);
    }
    return { user: { id: user.id, name: user.name, email: user.email }, role };
};
exports.addCollaborator = addCollaborator;
const removeCollaborator = async (docId, ownerId, userId) => {
    const doc = await docRepo().findOne({
        where: { id: docId, owner_id: ownerId },
    });
    if (!doc)
        throw new Error("FORBIDDEN");
    const collab = await collabRepo().findOne({
        where: { document_id: docId, user_id: userId },
    });
    if (!collab)
        throw new Error("NOT_FOUND");
    await collabRepo().remove(collab);
};
exports.removeCollaborator = removeCollaborator;
const updateCollaboratorRole = async (docId, ownerId, userId, role) => {
    const doc = await docRepo().findOne({
        where: { id: docId, owner_id: ownerId },
    });
    if (!doc)
        throw new Error("FORBIDDEN");
    const collab = await collabRepo().findOne({
        where: { document_id: docId, user_id: userId },
    });
    if (!collab)
        throw new Error("NOT_FOUND");
    collab.role = role;
    await collabRepo().save(collab);
};
exports.updateCollaboratorRole = updateCollaboratorRole;
const saveDocumentContent = async (id, userId, content) => {
    const doc = await docRepo()
        .createQueryBuilder("doc")
        .leftJoinAndSelect("doc.collaborators", "collab")
        .where("doc.id = :id", { id })
        .andWhere("(doc.owner_id = :userId OR collab.user_id = :userId)", {
        userId,
    })
        .getOne();
    if (!doc)
        throw new Error("FORBIDDEN");
    doc.content = content;
    return docRepo().save(doc);
};
exports.saveDocumentContent = saveDocumentContent;
const hasDocumentAccess = async (documentId, userId) => {
    const doc = await docRepo()
        .createQueryBuilder("doc")
        .leftJoin("doc.collaborators", "collab")
        .where("doc.id = :documentId", { documentId })
        .andWhere("(doc.owner_id = :userId OR collab.user_id = :userId)", {
        userId,
    })
        .getOne();
    return !!doc;
};
exports.hasDocumentAccess = hasDocumentAccess;
const getUserDocumentRole = async (documentId, userId) => {
    const doc = await docRepo().findOne({
        where: {
            id: documentId,
        },
        relations: {
            collaborators: true,
        },
    });
    if (!doc)
        return null;
    if (doc.owner_id === userId) {
        return "owner";
    }
    const collab = doc.collaborators.find((c) => c.user_id === userId);
    return collab?.role ?? null;
};
exports.getUserDocumentRole = getUserDocumentRole;
