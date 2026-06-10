import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1781102658272 implements MigrationInterface {
    name = 'AutoMigration1781102658272'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" ADD "yjs_state" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "yjs_state"`);
    }

}
