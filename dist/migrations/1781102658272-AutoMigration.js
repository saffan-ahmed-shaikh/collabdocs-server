"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoMigration1781102658272 = void 0;
class AutoMigration1781102658272 {
    constructor() {
        this.name = 'AutoMigration1781102658272';
    }
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "documents" ADD "yjs_state" text`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "yjs_state"`);
    }
}
exports.AutoMigration1781102658272 = AutoMigration1781102658272;
