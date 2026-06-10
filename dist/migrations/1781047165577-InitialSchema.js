"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1781047165577 = void 0;
class InitialSchema1781047165577 {
    constructor() {
        this.name = 'InitialSchema1781047165577';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "document_collaborators" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "document_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'viewer', CONSTRAINT "UQ_53a5498bfa1131221b800a3a04f" UNIQUE ("document_id", "user_id"), CONSTRAINT "PK_0be3af3690bec77f82612034430" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL DEFAULT 'Untitled Document', "content" text NOT NULL DEFAULT '', "owner_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "document_collaborators" ADD CONSTRAINT "FK_7827902a130b9d8aba1827fa76f" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "document_collaborators" ADD CONSTRAINT "FK_0d24ae2a3a2545c802ed7f1ae0f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documents" ADD CONSTRAINT "FK_888a4852e27627d1ebd8a094e98" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "FK_888a4852e27627d1ebd8a094e98"`);
        await queryRunner.query(`ALTER TABLE "document_collaborators" DROP CONSTRAINT "FK_0d24ae2a3a2545c802ed7f1ae0f"`);
        await queryRunner.query(`ALTER TABLE "document_collaborators" DROP CONSTRAINT "FK_7827902a130b9d8aba1827fa76f"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "documents"`);
        await queryRunner.query(`DROP TABLE "document_collaborators"`);
    }
}
exports.InitialSchema1781047165577 = InitialSchema1781047165577;
