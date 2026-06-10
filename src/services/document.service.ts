import { AppDataSource } from "../config/database";
import { Document } from "../entities/Document";
import { DocumentCollaborator } from "../entities/DocumentCollaborator";
import { User } from "../entities/User";
import { logEvent } from "../utils/logger";

const docRepo = () => AppDataSource.getRepository(Document);
const collabRepo = () => AppDataSource.getRepository(DocumentCollaborator);
const userRepo = () => AppDataSource.getRepository(User);

export const getUserDocuments = async (userId: string) => {
  const docs = await docRepo()
    .createQueryBuilder("doc")
    .leftJoinAndSelect("doc.owner", "owner")
    .leftJoinAndSelect("doc.collaborators", "collab")
    .where("doc.owner_id = :userId", { userId })
    .orWhere("collab.user_id = :userId", { userId })
    .orderBy("doc.updated_at", "DESC")
    .getMany();

  console.log(
    "LIST DOCS",
    userId,
    docs.map((d) => ({
      id: d.id,
      collaborators: d.collaborators.map((c) => c.user_id),
    })),
  );

  return docs;
};

export const getDocumentById = async (id: string, userId: string) => {
  const doc = await docRepo()
    .createQueryBuilder("doc")
    .leftJoinAndSelect("doc.owner", "owner")
    .leftJoinAndSelect("doc.collaborators", "collab")
    .leftJoinAndSelect("collab.user", "user")
    .where("doc.id = :id", { id })
    .getOne();

  if (!doc) throw new Error("NOT_FOUND");

  const hasAccess =
    doc.owner_id === userId ||
    doc.collaborators.some((c) => c.user_id === userId);

  if (!hasAccess) {
    throw new Error("NOT_FOUND");
  }

  let role: "owner" | "editor" | "viewer" = "viewer";

  if (doc.owner_id === userId) {
    role = "owner";
  } else {
    const collaborator = doc.collaborators.find((c) => c.user_id === userId);

    role = collaborator?.role ?? "viewer";
  }
  console.log(
    "COLLABORATORS IN GET DOCUMENT",
    doc.collaborators.map((c) => ({
      userId: c.user_id,
      role: c.role,
    })),
  );

  return {
    ...doc,
    role,
  };
};

export const createDocument = async (userId: string, title?: string) => {
  const doc = docRepo().create({
    title: title || "Untitled Document",
    owner_id: userId,
  });
  return docRepo().save(doc);
};

export const updateDocumentTitle = async (
  id: string,
  userId: string,
  title: string,
) => {
  const doc = await docRepo().findOne({ where: { id, owner_id: userId } });
  if (!doc) throw new Error("FORBIDDEN");

  doc.title = title;
  return docRepo().save(doc);
};

export const deleteDocument = async (id: string, userId: string) => {
  const doc = await docRepo().findOne({ where: { id, owner_id: userId } });
  if (!doc) throw new Error("FORBIDDEN");
  logEvent("document:delete_success", {
    userId,
    documentId: id,
  });
  await docRepo().remove(doc);
};

export const addCollaborator = async (
  docId: string,
  ownerId: string,
  email: string,
  role: "editor" | "viewer",
) => {
  const doc = await docRepo().findOne({
    where: { id: docId, owner_id: ownerId },
  });
  if (!doc) throw new Error("FORBIDDEN");

  const user = await userRepo().findOne({ where: { email } });
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.id === ownerId) throw new Error("SELF_COLLAB");

  const existing = await collabRepo().findOne({
    where: { document_id: docId, user_id: user.id },
  });

  if (existing) {
    existing.role = role;
    await collabRepo().save(existing);
  } else {
    const collab = collabRepo().create({
      document_id: docId,
      user_id: user.id,
      role,
    });
    await collabRepo().save(collab);

    const allCollabs = await collabRepo().find({
      where: {
        document_id: docId,
      },
    });

    console.log(
      "COLLABORATORS AFTER ADD",
      allCollabs.map((c) => ({
        userId: c.user_id,
        role: c.role,
      })),
    );
  }

  return { user: { id: user.id, name: user.name, email: user.email }, role };
};

export const removeCollaborator = async (
  docId: string,
  ownerId: string,
  userId: string,
) => {
  const doc = await docRepo().findOne({
    where: { id: docId, owner_id: ownerId },
  });
  if (!doc) throw new Error("FORBIDDEN");

  const collab = await collabRepo().findOne({
    where: { document_id: docId, user_id: userId },
  });
  if (!collab) throw new Error("NOT_FOUND");
  logEvent("document:collaborator_remove_success", {
    ownerId,
    documentId: docId,
    collaboratorId: userId,
  });
  await collabRepo().remove(collab);
};

export const updateCollaboratorRole = async (
  docId: string,
  ownerId: string,
  userId: string,
  role: "editor" | "viewer",
) => {
  const doc = await docRepo().findOne({
    where: { id: docId, owner_id: ownerId },
  });
  if (!doc) throw new Error("FORBIDDEN");

  const collab = await collabRepo().findOne({
    where: { document_id: docId, user_id: userId },
  });
  if (!collab) throw new Error("NOT_FOUND");

  collab.role = role;
  await collabRepo().save(collab);
};

export const saveDocumentContent = async (
  id: string,
  userId: string,
  content: string,
) => {
  const doc = await docRepo()
    .createQueryBuilder("doc")
    .leftJoinAndSelect("doc.collaborators", "collab")
    .where("doc.id = :id", { id })
    .andWhere("(doc.owner_id = :userId OR collab.user_id = :userId)", {
      userId,
    })
    .getOne();

  if (!doc) throw new Error("FORBIDDEN");

  doc.content = content;
  return docRepo().save(doc);
};

export const hasDocumentAccess = async (documentId: string, userId: string) => {
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

export const getUserDocumentRole = async (
  documentId: string,
  userId: string,
) => {
  const doc = await docRepo().findOne({
    where: {
      id: documentId,
    },
    relations: {
      collaborators: true,
    },
  });

  if (!doc) return null;

  if (doc.owner_id === userId) {
    return "owner";
  }

  const collab = doc.collaborators.find((c) => c.user_id === userId);

  return collab?.role ?? null;
};
