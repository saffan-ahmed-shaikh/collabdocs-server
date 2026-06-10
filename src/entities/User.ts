import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from "typeorm";
import { Document } from "./Document";
import { DocumentCollaborator } from "./DocumentCollaborator";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 150, unique: true })
  email!: string;

  @Column({ length: 255, select: false })
  password!: string;

  @CreateDateColumn()
  created_at!: Date;

  @OneToMany(() => Document, (doc) => doc.owner)
  documents!: Document[];

  @OneToMany(() => DocumentCollaborator, (dc) => dc.user)
  collaborations!: DocumentCollaborator[];
}
