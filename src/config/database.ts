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
  entities: [User, Document, DocumentCollaborator],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});
