"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentCollaborator = void 0;
const typeorm_1 = require("typeorm");
const User_1 = require("./User");
const Document_1 = require("./Document");
let DocumentCollaborator = class DocumentCollaborator {
};
exports.DocumentCollaborator = DocumentCollaborator;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)("uuid"),
    __metadata("design:type", String)
], DocumentCollaborator.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DocumentCollaborator.prototype, "document_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DocumentCollaborator.prototype, "user_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: "viewer" }),
    __metadata("design:type", String)
], DocumentCollaborator.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Document_1.Document, (doc) => doc.collaborators, {
        onDelete: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "document_id" }),
    __metadata("design:type", Document_1.Document)
], DocumentCollaborator.prototype, "document", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, (user) => user.collaborations, { onDelete: "CASCADE" }),
    (0, typeorm_1.JoinColumn)({ name: "user_id" }),
    __metadata("design:type", User_1.User)
], DocumentCollaborator.prototype, "user", void 0);
exports.DocumentCollaborator = DocumentCollaborator = __decorate([
    (0, typeorm_1.Entity)("document_collaborators"),
    (0, typeorm_1.Unique)(["document_id", "user_id"])
], DocumentCollaborator);
