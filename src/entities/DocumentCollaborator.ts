import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { User } from "./User";
import { Document } from "./Document";

@Entity("document_collaborators")
@Unique(["document_id", "user_id"])
export class DocumentCollaborator {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  document_id!: string;

  @Column()
  user_id!: string;

  @Column({ length: 20, default: "viewer" })
  role!: "editor" | "viewer";

  @ManyToOne(() => Document, (doc) => doc.collaborators, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "document_id" })
  document!: Document;

  @ManyToOne(() => User, (user) => user.collaborations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
