import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Document } from "../entities/Document";
import { DocumentCollaborator } from "../entities/DocumentCollaborator";
import dotenv from "dotenv";
dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities:
    process.env.NODE_ENV === "production"
      ? ["dist/entities/*.js"]
      : [User, Document, DocumentCollaborator],
  migrations: [
    process.env.NODE_ENV === "production"
      ? "dist/migrations/*.js"
      : "src/migrations/*.ts",
  ],
  ssl: false, // EC2 local postgres doesn't need SSL
});
