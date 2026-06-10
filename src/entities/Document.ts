import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "./User";
import { DocumentCollaborator } from "./DocumentCollaborator";

@Entity("documents")
export class Document {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ length: 255, default: "Untitled Document" })
  title!: string;

  @Column({ type: "text", default: "" })
  content!: string;

  @Column()
  owner_id!: string;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: "CASCADE" })
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @OneToMany(() => DocumentCollaborator, (dc) => dc.document)
  collaborators!: DocumentCollaborator[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @Column({
    type: "text",
    nullable: true,
  })
  yjs_state!: string;
}
