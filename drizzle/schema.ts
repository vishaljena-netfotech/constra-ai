import { type TradePackageDefinition } from "../shared/tradeLibraries";
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "estimator", "viewer"]).default("estimator").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Global administrator-controlled capability switches. Features remain enabled
 * until an administrator explicitly disables them for the workspace.
 */
export const featureSettings = mysqlTable("featureSettings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FeatureSetting = typeof featureSettings.$inferSelect;
export type InsertFeatureSetting = typeof featureSettings.$inferInsert;

/**
 * Workspace-wide estimator onboarding copy. Actions remain product-defined;
 * administrators can tailor the label, helper message, and step wording.
 */
export const onboardingSettings = mysqlTable("onboardingSettings", {
  id: int("id").primaryKey(),
  enabled: boolean("enabled").default(true).notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  description: text("description").notNull(),
  steps: json("steps").$type<Array<{ title: string; description: string }>>().notNull(),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OnboardingSettings = typeof onboardingSettings.$inferSelect;
export type InsertOnboardingSettings = typeof onboardingSettings.$inferInsert;

/**
 * Administrator-managed package libraries for common construction project types.
 */
export const tradePackageLibraries = mysqlTable(
  "tradePackageLibraries",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 120 }).notNull().unique(),
    projectType: varchar("projectType", { length: 80 }).notNull(),
    description: text("description").notNull(),
    packages: json("packages").$type<TradePackageDefinition[]>().notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdBy: int("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("tradePackageLibraries_projectType_active_idx").on(table.projectType, table.isActive)],
);

export type TradePackageLibrary = typeof tradePackageLibraries.$inferSelect;
export type InsertTradePackageLibrary = typeof tradePackageLibraries.$inferInsert;

/**
 * Projects table: represents an estimating project owned by a user.
 * Each project can have multiple plan files and takeoffs.
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tradePackageLibraryId: int("tradePackageLibraryId"),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "archived"])
    .default("draft")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * ProjectFiles table: stores uploaded plan/drawing files per project.
 * Files are stored in S3; this table maintains metadata and references.
 */
export const projectFiles = mysqlTable("projectFiles", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: varchar("fileType", { length: 50 }).notNull(), // pdf, png, jpg, etc.
  fileSize: int("fileSize").notNull(), // in bytes
  s3Key: varchar("s3Key", { length: 512 }).notNull(), // S3 storage reference
  s3Url: text("s3Url").notNull(), // Presigned URL or public URL
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  uploadedBy: int("uploadedBy").notNull(), // userId who uploaded
});

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = typeof projectFiles.$inferInsert;

/**
 * Takeoffs table: represents an AI-generated takeoff from one or more plan files.
 * A takeoff contains extracted line items (materials, quantities, units).
 */
export const takeoffs = mysqlTable("takeoffs", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sourceFileIds: json("sourceFileIds").$type<number[]>().notNull(), // Array of projectFile IDs used
  status: mysqlEnum("status", ["pending", "completed", "failed"])
    .default("pending")
    .notNull(),
  aiAnalysisResult: json("aiAnalysisResult"), // Raw LLM response or structured extraction
  reviewStatus: mysqlEnum("reviewStatus", ["pending_review", "approved", "rejected"]).default("pending_review").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Takeoff = typeof takeoffs.$inferSelect;
export type InsertTakeoff = typeof takeoffs.$inferInsert;

/**
 * TakeoffLineItems table: individual line items extracted from a takeoff.
 * Each item can be edited by the user (inline editing).
 */
export const takeoffLineItems = mysqlTable("takeoffLineItems", {
  id: int("id").autoincrement().primaryKey(),
  takeoffId: int("takeoffId").notNull(),
  material: varchar("material", { length: 255 }).notNull(), // e.g., "Concrete", "Steel Rebar"
  description: text("description"), // Additional details
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(), // e.g., "cubic yards", "linear feet", "each"
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }), // Optional: for bid generation
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }), // quantity * unitPrice
  notes: text("notes"), // User notes or AI confidence notes
  isEdited: boolean("isEdited").default(false).notNull(), // Track if user edited this item
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TakeoffLineItem = typeof takeoffLineItems.$inferSelect;
export type InsertTakeoffLineItem = typeof takeoffLineItems.$inferInsert;

/**
 * BidReports table: represents a finalized bid/cost estimate generated from a takeoff.
 * Bid reports are snapshots of takeoff data at a point in time.
 */
export const bidReports = mysqlTable("bidReports", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  takeoffId: int("takeoffId").notNull(),
  reportName: varchar("reportName", { length: 255 }).notNull(),
  totalCost: decimal("totalCost", { precision: 12, scale: 2 }).notNull(),
  lineItemCount: int("lineItemCount").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BidReport = typeof bidReports.$inferSelect;
export type InsertBidReport = typeof bidReports.$inferInsert;

/**
 * AuditLog table: tracks all significant actions within a project.
 * Captures uploads, AI analysis runs, and manual edits for compliance and transparency.
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  projectId: int("projectId").notNull(),
  userId: int("userId").notNull(),
  eventType: mysqlEnum("eventType", ["file_upload", "ai_analysis", "item_edit", "bid_created", "export"])
    .notNull(),
  entityType: varchar("entityType", { length: 50 }).notNull(), // e.g., "projectFile", "takeoff", "lineItem"
  entityId: int("entityId"), // ID of the affected entity
  description: text("description"), // Human-readable description of the action
  metadata: json("metadata"), // Additional context (e.g., old vs new values for edits)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type InsertAuditLogEntry = typeof auditLog.$inferInsert;

/**
 * In-app alerts for the user whose estimating workflow produced an update.
 */
export const workspaceNotifications = mysqlTable(
  "workspaceNotifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    projectId: int("projectId").notNull(),
    takeoffId: int("takeoffId"),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    content: text("content").notNull(),
    readAt: timestamp("readAt"),
    status: mysqlEnum("status", ["unread", "read", "approved", "rejected"]).default("unread").notNull(),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("workspaceNotifications_userId_createdAt_idx").on(table.userId, table.createdAt),
    index("workspaceNotifications_projectId_idx").on(table.projectId),
    index("workspaceNotifications_userId_status_createdAt_idx").on(table.userId, table.status, table.createdAt),
  ],
);

export type WorkspaceNotification = typeof workspaceNotifications.$inferSelect;
export type InsertWorkspaceNotification = typeof workspaceNotifications.$inferInsert;
