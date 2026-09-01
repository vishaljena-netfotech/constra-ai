import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  projects,
  projectFiles,
  takeoffs,
  takeoffLineItems,
  bidReports,
  auditLog,
  featureSettings,
  onboardingSettings,
  tradePackageLibraries,
  workspaceNotifications,
  InsertProject,
  InsertProjectFile,
  InsertTakeoff,
  InsertTakeoffLineItem,
  InsertBidReport,
  InsertAuditLogEntry,
  InsertFeatureSetting,
  InsertOnboardingSettings,
  InsertTradePackageLibrary,
  InsertWorkspaceNotification,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { DEFAULT_ONBOARDING_CONTENT } from "../shared/onboarding";
import { DEFAULT_TRADE_PACKAGE_LIBRARIES, type TradePackageDefinition } from "../shared/tradeLibraries";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUsersForAdministration() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}

export async function updateUserRole(userId: number, role: "user" | "admin" | "estimator" | "viewer") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(users).set({ role }).where(eq(users.id, userId));
}

// ============================================================================
// ADMINISTRATOR FEATURE SETTINGS
// ============================================================================

export const DEFAULT_FEATURE_SETTINGS = [
  "plan_uploads",
  "ai_takeoffs",
  "bid_reports",
  "exports",
] as const;

export type FeatureKey = (typeof DEFAULT_FEATURE_SETTINGS)[number];

export async function getFeatureSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const storedSettings = await db.select().from(featureSettings);
  const storedByKey = new Map(storedSettings.map((setting) => [setting.key, setting]));

  return DEFAULT_FEATURE_SETTINGS.map((key) => {
    const stored = storedByKey.get(key);
    return stored ?? { key, enabled: true, updatedBy: null, updatedAt: new Date(0) };
  });
}

export async function isFeatureEnabled(key: FeatureKey) {
  const settings = await getFeatureSettings();
  return settings.find((setting) => setting.key === key)?.enabled ?? true;
}

export async function upsertFeatureSetting(data: InsertFeatureSetting) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(featureSettings).values(data).onDuplicateKeyUpdate({
    set: {
      enabled: data.enabled,
      updatedBy: data.updatedBy,
    },
  });
}

export async function getOnboardingSettings() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stored] = await db.select().from(onboardingSettings).where(eq(onboardingSettings.id, 1)).limit(1);
  return stored ?? {
    id: 1,
    ...DEFAULT_ONBOARDING_CONTENT,
    updatedBy: null,
    updatedAt: new Date(0),
  };
}

export async function upsertOnboardingSettings(
  data: Pick<InsertOnboardingSettings, "enabled" | "label" | "description" | "steps" | "updatedBy">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(onboardingSettings).values({ id: 1, ...data }).onDuplicateKeyUpdate({
    set: {
      enabled: data.enabled,
      label: data.label,
      description: data.description,
      steps: data.steps,
      updatedBy: data.updatedBy,
    },
  });
}

// ============================================================================
// TRADE PACKAGE LIBRARIES
// ============================================================================

export type TradePackageLibraryInput = {
  name: string;
  projectType: string;
  description: string;
  packages: TradePackageDefinition[];
  isActive: boolean;
};

export async function ensureDefaultTradePackageLibraries() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const library of DEFAULT_TRADE_PACKAGE_LIBRARIES) {
    await db.insert(tradePackageLibraries).values(library).onDuplicateKeyUpdate({ set: { name: library.name } });
  }
}

export async function getTradePackageLibraries(activeOnly = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(tradePackageLibraries)
    .where(activeOnly ? eq(tradePackageLibraries.isActive, true) : undefined)
    .orderBy(desc(tradePackageLibraries.projectType), desc(tradePackageLibraries.name));
}

export async function getTradePackageLibraryById(libraryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [library] = await db.select().from(tradePackageLibraries).where(eq(tradePackageLibraries.id, libraryId)).limit(1);
  return library;
}

export async function createTradePackageLibrary(data: InsertTradePackageLibrary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(tradePackageLibraries).values(data);
}

export async function updateTradePackageLibrary(libraryId: number, data: TradePackageLibraryInput) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(tradePackageLibraries).set(data).where(eq(tradePackageLibraries.id, libraryId));
}

// ============================================================================
// PROJECT OPERATIONS
// ============================================================================

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projects).values(data);
  return result;
}

export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));
}

export async function getWorkspaceProjects() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

async function buildRecentProjectSummaries(userProjects: Awaited<ReturnType<typeof getProjectsByUserId>>) {
  return Promise.all(
    userProjects.slice(0, 8).map(async (project) => {
      const projectTakeoffs = await getTakeoffsByProjectId(project.id);
      const latestTakeoff = projectTakeoffs[0] ?? null;
      const lineItems = latestTakeoff
        ? await getTakeoffLineItemsByTakeoffId(latestTakeoff.id)
        : [];

      const units = Array.from(
        new Set(lineItems.map((item) => item.unit).filter(Boolean))
      ).slice(0, 2);
      const lastModified = latestTakeoff?.updatedAt && latestTakeoff.updatedAt > project.updatedAt
        ? latestTakeoff.updatedAt
        : project.updatedAt;

      return {
        project,
        latestTakeoff: latestTakeoff
          ? {
              id: latestTakeoff.id,
              name: latestTakeoff.name,
              status: latestTakeoff.status,
              updatedAt: latestTakeoff.updatedAt,
            }
          : null,
        quantityCount: lineItems.length,
        quantitySummary:
          lineItems.length > 0
            ? `${lineItems.length} extracted ${lineItems.length === 1 ? "quantity" : "quantities"}${units.length ? ` · ${units.join(", ")}` : ""}`
            : "No quantities extracted",
        lastModified,
      };
    })
  );
}

export async function getRecentProjectSummaries(userId: number) {
  return buildRecentProjectSummaries(await getProjectsByUserId(userId));
}

export async function getWorkspaceRecentProjectSummaries() {
  return buildRecentProjectSummaries(await getWorkspaceProjects());
}

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateProject(
  projectId: number,
  data: Partial<InsertProject>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(projects).where(eq(projects.id, projectId));
}

// ============================================================================
// PROJECT FILE OPERATIONS
// ============================================================================

export async function createProjectFile(data: InsertProjectFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(projectFiles).values(data);
  return result;
}

export async function getProjectFilesByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.projectId, projectId))
    .orderBy(desc(projectFiles.uploadedAt));
}

export async function getProjectFileById(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(projectFiles)
    .where(eq(projectFiles.id, fileId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteProjectFile(fileId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(projectFiles).where(eq(projectFiles.id, fileId));
}

// ============================================================================
// TAKEOFF OPERATIONS
// ============================================================================

export async function createTakeoff(data: InsertTakeoff) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(takeoffs).values(data);
  return result;
}

export async function getTakeoffsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(takeoffs)
    .where(eq(takeoffs.projectId, projectId))
    .orderBy(desc(takeoffs.createdAt));
}

export async function getTakeoffById(takeoffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(takeoffs)
    .where(eq(takeoffs.id, takeoffId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTakeoff(
  takeoffId: number,
  data: Partial<InsertTakeoff>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(takeoffs)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(takeoffs.id, takeoffId));
}

export async function deleteTakeoff(takeoffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(takeoffs).where(eq(takeoffs.id, takeoffId));
}

// ============================================================================
// TAKEOFF LINE ITEM OPERATIONS
// ============================================================================

export async function createTakeoffLineItem(data: InsertTakeoffLineItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(takeoffLineItems).values(data);
  return result;
}

export async function getTakeoffLineItemsByTakeoffId(takeoffId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(takeoffLineItems)
    .where(eq(takeoffLineItems.takeoffId, takeoffId))
    .orderBy(takeoffLineItems.id);
}

export async function getTakeoffLineItemById(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(takeoffLineItems)
    .where(eq(takeoffLineItems.id, itemId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateTakeoffLineItem(
  itemId: number,
  data: Partial<InsertTakeoffLineItem>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(takeoffLineItems)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(takeoffLineItems.id, itemId));
}

export async function deleteTakeoffLineItem(itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .delete(takeoffLineItems)
    .where(eq(takeoffLineItems.id, itemId));
}

// ============================================================================
// BID REPORT OPERATIONS
// ============================================================================

export async function createBidReport(data: InsertBidReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(bidReports).values(data);
  return result;
}

export async function getBidReportsByProjectId(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(bidReports)
    .where(eq(bidReports.projectId, projectId))
    .orderBy(desc(bidReports.createdAt));
}

export async function getBidReportById(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(bidReports)
    .where(eq(bidReports.id, reportId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function deleteBidReport(reportId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(bidReports).where(eq(bidReports.id, reportId));
}

// ============================================================================
// AUDIT LOG OPERATIONS
// ============================================================================

export async function logAuditEvent(data: InsertAuditLogEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.insert(auditLog).values(data);
}

export async function getRecentDashboardActivity(
  userId: number,
  includeWorkspace: boolean,
  limit = 8,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const query = db
    .select({
      id: auditLog.id,
      projectId: auditLog.projectId,
      eventType: auditLog.eventType,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      description: auditLog.description,
      timestamp: auditLog.timestamp,
      projectName: projects.name,
    })
    .from(auditLog)
    .innerJoin(projects, eq(auditLog.projectId, projects.id));

  if (includeWorkspace) {
    return await query.orderBy(desc(auditLog.timestamp)).limit(limit);
  }

  return await query
    .where(eq(projects.userId, userId))
    .orderBy(desc(auditLog.timestamp))
    .limit(limit);
}

export async function getAuditLogByProjectId(projectId: number, limit = 100) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.projectId, projectId))
    .orderBy(desc(auditLog.timestamp))
    .limit(limit);
}

export async function getAuditLogByProjectIdAndEventType(
  projectId: number,
  eventType: string,
  limit = 100
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.projectId, projectId),
        eq(auditLog.eventType, eventType as any)
      )
    )
    .orderBy(desc(auditLog.timestamp))
    .limit(limit);
}

export async function getAuditLogPage(
  projectId: number,
  options: { eventType?: string; limit?: number; offset?: number } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const condition = options.eventType
    ? and(eq(auditLog.projectId, projectId), eq(auditLog.eventType, options.eventType as any))
    : eq(auditLog.projectId, projectId);

  return await db
    .select()
    .from(auditLog)
    .where(condition)
    .orderBy(desc(auditLog.timestamp))
    .limit(limit + 1)
    .offset(offset);
}

// ============================================================================
// WORKSPACE NOTIFICATIONS
// ============================================================================

export async function createWorkspaceNotification(data: InsertWorkspaceNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(workspaceNotifications).values(data);
}

export type NotificationStatus = "unread" | "read" | "approved" | "rejected";

export type WorkspaceNotificationFilters = {
  limit?: number;
  projectId?: number;
  status?: NotificationStatus;
};

export async function getWorkspaceNotificationsByUserId(userId: number, filters: WorkspaceNotificationFilters = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(workspaceNotifications.userId, userId)];
  if (filters.projectId) conditions.push(eq(workspaceNotifications.projectId, filters.projectId));
  if (filters.status) conditions.push(eq(workspaceNotifications.status, filters.status));

  return db
    .select()
    .from(workspaceNotifications)
    .where(and(...conditions))
    .orderBy(desc(workspaceNotifications.createdAt))
    .limit(filters.limit ?? 12);
}

export async function getWorkspaceNotificationByIdForUser(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [notification] = await db
    .select()
    .from(workspaceNotifications)
    .where(and(eq(workspaceNotifications.id, notificationId), eq(workspaceNotifications.userId, userId)))
    .limit(1);
  return notification;
}

export async function markWorkspaceNotificationRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .update(workspaceNotifications)
    .set({ readAt: new Date(), status: "read" })
    .where(and(eq(workspaceNotifications.id, notificationId), eq(workspaceNotifications.userId, userId)));
}

export async function resolveWorkspaceNotification(
  notificationId: number,
  userId: number,
  status: Extract<NotificationStatus, "approved" | "rejected">,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  return db
    .update(workspaceNotifications)
    .set({ status, readAt: now, resolvedAt: now })
    .where(and(eq(workspaceNotifications.id, notificationId), eq(workspaceNotifications.userId, userId)));
}
