import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const db = vi.hoisted(() => ({
  createProject: vi.fn(),
  getProjectsByUserId: vi.fn(),
  getWorkspaceProjects: vi.fn(),
  getRecentProjectSummaries: vi.fn(),
  getWorkspaceRecentProjectSummaries: vi.fn(),
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createProjectFile: vi.fn(),
  getProjectFilesByProjectId: vi.fn(),
  getProjectFileById: vi.fn(),
  deleteProjectFile: vi.fn(),
  createTakeoff: vi.fn(),
  getTakeoffsByProjectId: vi.fn(),
  getTakeoffById: vi.fn(),
  updateTakeoff: vi.fn(),
  deleteTakeoff: vi.fn(),
  createTakeoffLineItem: vi.fn(),
  getTakeoffLineItemsByTakeoffId: vi.fn(),
  getTakeoffLineItemById: vi.fn(),
  updateTakeoffLineItem: vi.fn(),
  deleteTakeoffLineItem: vi.fn(),
  createBidReport: vi.fn(),
  getBidReportsByProjectId: vi.fn(),
  getBidReportById: vi.fn(),
  deleteBidReport: vi.fn(),
  logAuditEvent: vi.fn(),
  getRecentDashboardActivity: vi.fn(),
  getAuditLogByProjectId: vi.fn(),
  getAuditLogPage: vi.fn(),
  getFeatureSettings: vi.fn(),
  isFeatureEnabled: vi.fn(),
  upsertFeatureSetting: vi.fn(),
  getOnboardingSettings: vi.fn(),
  upsertOnboardingSettings: vi.fn(),
  ensureDefaultTradePackageLibraries: vi.fn(),
  getTradePackageLibraries: vi.fn(),
  getTradePackageLibraryById: vi.fn(),
  createTradePackageLibrary: vi.fn(),
  updateTradePackageLibrary: vi.fn(),
  createWorkspaceNotification: vi.fn(),
  getWorkspaceNotificationsByUserId: vi.fn(),
  getWorkspaceNotificationByIdForUser: vi.fn(),
  markWorkspaceNotificationRead: vi.fn(),
  resolveWorkspaceNotification: vi.fn(),
  getUsersForAdministration: vi.fn(),
  updateUserRole: vi.fn(),
}));

const storage = vi.hoisted(() => ({
  storagePut: vi.fn(),
  storageGet: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

const llm = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
const ownerNotifications = vi.hoisted(() => ({ notifyOwner: vi.fn() }));

vi.mock("./db", () => db);
vi.mock("./storage", () => storage);
vi.mock("./_core/llm", () => llm);
vi.mock("./_core/notification", () => ownerNotifications);

import { appRouter } from "./routers";

const project = { id: 17, userId: 42, name: "Workflow project" };
const tradeLibrary = {
  id: 7,
  name: "Commercial tenant improvement",
  projectType: "Commercial tenant improvement",
  description: "Training commercial fit-out packages.",
  isActive: true,
  packages: [
    { trade: "General conditions", description: "Site setup and closeout", unit: "scope", guidance: "Training package only." },
    { trade: "Interiors", description: "Framing and finishes", unit: "scope", guidance: "Training package only." },
  ],
};
const file = {
  id: 501,
  projectId: 17,
  fileName: "Structural.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
  s3Key: "projects/17/structural.pdf",
  s3Url: "https://files.example.com/projects/17/structural.pdf",
};

function createContext(role: "admin" | "estimator" | "viewer" = "estimator", userId = 42): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "workflow-test-user",
      name: "Workflow Test User",
      email: "workflow-test@example.com",
      loginMethod: "test",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("estimating workflow persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.isFeatureEnabled.mockResolvedValue(true);
    db.getProjectById.mockResolvedValue(project);
    db.getWorkspaceProjects.mockResolvedValue([project]);
    db.createProject.mockResolvedValue([{ insertId: 17 }]);
    db.getRecentDashboardActivity.mockResolvedValue([]);
    db.getProjectFilesByProjectId.mockResolvedValue([file]);
    db.getProjectFileById.mockResolvedValue(file);
    db.createTakeoff.mockResolvedValue({ insertId: 88 });
    db.createTradePackageLibrary.mockResolvedValue({ insertId: 7 });
    db.getTradePackageLibraries.mockResolvedValue([tradeLibrary]);
    db.getTradePackageLibraryById.mockResolvedValue(tradeLibrary);
    db.getOnboardingSettings.mockResolvedValue({
      id: 1,
      enabled: true,
      label: "Estimator walkthrough",
      description: "Default guidance",
      steps: [{ title: "Create", description: "Create a project" }, { title: "Review", description: "Review takeoff" }],
      updatedBy: null,
      updatedAt: new Date(),
    });
    db.getWorkspaceNotificationsByUserId.mockResolvedValue([]);
    ownerNotifications.notifyOwner.mockResolvedValue(true);
    storage.storageGetSignedUrl.mockResolvedValue("https://signed.example.com/structural.pdf");
    llm.invokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                {
                  material: "Concrete",
                  description: "Foundation slab",
                  quantity: 12.5,
                  unit: "cubic yards",
                  notes: "Grid A1-A4",
                },
              ],
            }),
          },
        },
      ],
    });
  });

  it("persists AI-extracted takeoff items and records lifecycle audit events", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.takeoffs.analyzeFiles({
        projectId: 17,
        fileIds: [501],
        takeoffName: "Structural takeoff",
      }),
    ).resolves.toEqual({ takeoffId: 88, lineItemCount: 1 });

    expect(storage.storageGetSignedUrl).toHaveBeenCalledWith(file.s3Key);
    expect(db.createTakeoff).toHaveBeenCalledWith({
      projectId: 17,
      name: "Structural takeoff",
      sourceFileIds: [501],
      status: "pending",
    });
    expect(db.createTakeoffLineItem).toHaveBeenCalledWith({
      takeoffId: 88,
      material: "Concrete",
      description: "Foundation slab",
      quantity: "12.5",
      unit: "cubic yards",
      notes: "Grid A1-A4",
      isEdited: false,
    });
    expect(db.updateTakeoff).toHaveBeenCalledWith(88, {
      status: "completed",
      aiAnalysisResult: { lineItemCount: 1, sourceFileIds: [501] },
    });
    expect(db.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ai_analysis", description: "AI analysis started on 1 file(s)" }),
    );
    expect(db.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "ai_analysis", description: "AI analysis completed with 1 extracted line item(s)" }),
    );
    expect(db.createWorkspaceNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      projectId: 17,
      takeoffId: 88,
      type: "takeoff_completed",
      title: "AI takeoff ready for review",
    }));
    expect(ownerNotifications.notifyOwner).toHaveBeenCalledWith(expect.objectContaining({ title: "AI takeoff completed" }));
  });

  it("uses an array-wrapped MySQL insert result when creating an audit-linked project", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.projects.create({ name: "New estimate" })).resolves.toEqual({ id: 17 });

    expect(db.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 17, entityId: 17, description: "Project created: New estimate" }),
    );
  });

  it("creates a clearly labeled sample training project from the selected trade library", async () => {
    const caller = appRouter.createCaller(createContext());
    db.createProject.mockResolvedValue([{ insertId: 31 }]);

    await expect(caller.projects.createSample({ libraryId: 7 })).resolves.toEqual({
      id: 31,
      name: "Sample plan · Commercial tenant improvement",
      takeoffId: 88,
      tradePackageCount: 2,
      libraryId: 7,
      projectType: "Commercial tenant improvement",
    });

    expect(db.ensureDefaultTradePackageLibraries).toHaveBeenCalledOnce();
    expect(db.createProject).toHaveBeenCalledWith(expect.objectContaining({
      userId: 42,
      name: "Sample plan · Commercial tenant improvement",
      tradePackageLibraryId: 7,
      status: "draft",
    }));
    expect(db.createTakeoff).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 31,
      name: "Training Commercial tenant improvement trade-package takeoff",
      status: "completed",
    }));
    expect(db.createTakeoffLineItem).toHaveBeenCalledTimes(2);
    expect(db.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 31,
      description: "Sample-plan training project created with 2 trade packages",
      metadata: expect.objectContaining({ source: "trade_package_library", trainingOnly: true, takeoffId: 88, libraryId: 7 }),
    }));
  });

  it("scopes dashboard activity to workspace readers and owner projects for estimators", async () => {
    const activity = [{ id: 91, projectId: 17, projectName: "Workflow project", eventType: "ai_analysis" }];
    db.getRecentDashboardActivity.mockResolvedValue(activity);

    await expect(appRouter.createCaller(createContext("viewer")).audit.recent({ limit: 6 })).resolves.toEqual(activity);
    expect(db.getRecentDashboardActivity).toHaveBeenLastCalledWith(42, true, 6);

    await expect(appRouter.createCaller(createContext("estimator")).audit.recent({ limit: 6 })).resolves.toEqual(activity);
    expect(db.getRecentDashboardActivity).toHaveBeenLastCalledWith(42, false, 6);
  });

  it("allows an administrator to update a workspace capability", async () => {
    const caller = appRouter.createCaller(createContext("admin"));

    await expect(
      caller.configuration.updateFeature({ key: "ai_takeoffs", enabled: false }),
    ).resolves.toEqual({ success: true });

    expect(db.upsertFeatureSetting).toHaveBeenCalledWith({
      key: "ai_takeoffs",
      enabled: false,
      updatedBy: 42,
    });
  });

  it("allows administrators to configure project-type trade libraries and denies estimator changes", async () => {
    const libraryInput = {
      name: "Healthcare renovation",
      projectType: "Healthcare renovation",
      description: "Training trade packages for a healthcare interior renovation.",
      isActive: true,
      packages: [{ trade: "Infection control", description: "Barriers and containment", unit: "scope", guidance: "Training package only." }],
    };
    const admin = appRouter.createCaller(createContext("admin"));

    await expect(admin.tradePackageLibraries.create(libraryInput)).resolves.toEqual({ id: 7 });
    expect(db.createTradePackageLibrary).toHaveBeenCalledWith(expect.objectContaining({ ...libraryInput, createdBy: 42 }));
    await expect(admin.tradePackageLibraries.update({ libraryId: 7, library: { ...libraryInput, isActive: false } })).resolves.toEqual({ success: true });
    expect(db.updateTradePackageLibrary).toHaveBeenCalledWith(7, expect.objectContaining({ isActive: false }));

    await expect(appRouter.createCaller(createContext()).tradePackageLibraries.create(libraryInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows an administrator to configure walkthrough content and users to read their own alerts", async () => {
    const admin = appRouter.createCaller(createContext("admin"));
    const notification = { id: 91, userId: 42, title: "AI takeoff ready", content: "Review it", readAt: null };
    db.getWorkspaceNotificationsByUserId.mockResolvedValue([notification]);

    await expect(admin.onboarding.update({
      enabled: true,
      label: "How to estimate",
      description: "Workspace guidance",
      steps: [{ title: "Create", description: "Create a project" }, { title: "Review", description: "Review quantities" }],
    })).resolves.toEqual({ success: true });
    expect(db.upsertOnboardingSettings).toHaveBeenCalledWith(expect.objectContaining({
      updatedBy: 42,
      label: "How to estimate",
    }));

    const estimator = appRouter.createCaller(createContext());
    await expect(estimator.notifications.list()).resolves.toEqual([notification]);
    await expect(estimator.notifications.markRead({ notificationId: 91 })).resolves.toEqual({ success: true });
    expect(db.markWorkspaceNotificationRead).toHaveBeenCalledWith(91, 42);
  });

  it("filters notification history for the caller and records an authorized takeoff approval", async () => {
    const completionAlert = { id: 91, userId: 42, projectId: 17, takeoffId: 88, type: "takeoff_completed", status: "unread", title: "AI takeoff ready", content: "Review it", readAt: null };
    db.getWorkspaceNotificationsByUserId.mockResolvedValue([completionAlert]);
    db.getWorkspaceNotificationByIdForUser.mockResolvedValue(completionAlert);
    db.getTakeoffById.mockResolvedValue({ id: 88, projectId: 17, reviewStatus: "pending_review" });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.list({ limit: 100, projectId: 17, status: "unread" })).resolves.toEqual([completionAlert]);
    expect(db.getWorkspaceNotificationsByUserId).toHaveBeenCalledWith(42, { limit: 100, projectId: 17, status: "unread" });

    await expect(caller.notifications.resolveTakeoff({ notificationId: 91, decision: "approved" })).resolves.toEqual({ success: true, status: "approved", takeoffId: 88 });
    expect(db.updateTakeoff).toHaveBeenCalledWith(88, expect.objectContaining({ reviewStatus: "approved", reviewedBy: 42, reviewedAt: expect.any(Date) }));
    expect(db.resolveWorkspaceNotification).toHaveBeenCalledWith(91, 42, "approved");
    expect(db.logAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ projectId: 17, entityId: 88, description: "AI takeoff approved from completion alert" }));
  });

  it("records rejection without deleting the takeoff and denies unauthorized alert decisions", async () => {
    const completionAlert = { id: 91, userId: 42, projectId: 17, takeoffId: 88, type: "takeoff_completed", status: "read", title: "AI takeoff ready", content: "Review it", readAt: new Date() };
    db.getWorkspaceNotificationByIdForUser.mockResolvedValue(completionAlert);
    db.getTakeoffById.mockResolvedValue({ id: 88, projectId: 17, reviewStatus: "pending_review" });
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.resolveTakeoff({ notificationId: 91, decision: "rejected" })).resolves.toEqual({ success: true, status: "rejected", takeoffId: 88 });
    expect(db.updateTakeoff).toHaveBeenCalledWith(88, expect.objectContaining({ reviewStatus: "rejected" }));
    expect(db.deleteTakeoff).not.toHaveBeenCalled();
    await expect(appRouter.createCaller(createContext("viewer")).notifications.resolveTakeoff({ notificationId: 91, decision: "approved" })).rejects.toMatchObject({ code: "FORBIDDEN" });

    db.getWorkspaceNotificationByIdForUser.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(createContext("estimator", 99)).notifications.resolveTakeoff({ notificationId: 91, decision: "approved" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("denies walkthrough changes to non-administrators and scopes notification acknowledgement to the caller", async () => {
    const walkthroughInput = {
      enabled: true,
      label: "How to estimate",
      description: "Workspace guidance",
      steps: [{ title: "Create", description: "Create a project" }, { title: "Review", description: "Review quantities" }],
    };

    await expect(
      appRouter.createCaller(createContext("estimator")).onboarding.update(walkthroughInput),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(db.upsertOnboardingSettings).not.toHaveBeenCalled();

    await expect(
      appRouter.createCaller(createContext("estimator", 99)).notifications.markRead({ notificationId: 91 }),
    ).resolves.toEqual({ success: true });
    expect(db.markWorkspaceNotificationRead).toHaveBeenCalledWith(91, 99);
  });

  it("allows a viewer to read workspace projects and takeoff line items", async () => {
    const viewer = appRouter.createCaller(createContext("viewer"));
    const takeoff = { id: 88, projectId: 17, name: "Read-only takeoff" };
    db.getTakeoffById.mockResolvedValue(takeoff);
    db.getTakeoffLineItemsByTakeoffId.mockResolvedValue([
      { id: 5, takeoffId: 88, material: "Concrete" },
    ]);

    await expect(viewer.projects.list()).resolves.toEqual([project]);
    await expect(viewer.projects.getById({ projectId: 17 })).resolves.toEqual(project);
    await expect(viewer.lineItems.list({ takeoffId: 88 })).resolves.toEqual([
      { id: 5, takeoffId: 88, material: "Concrete" },
    ]);

    expect(db.getWorkspaceProjects).toHaveBeenCalledOnce();
  });

  it("removes only the selected project file and records the prior metadata", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.files.delete({ projectId: 17, fileId: 501 })).resolves.toEqual({ success: true });

    expect(db.deleteProjectFile).toHaveBeenCalledWith(501);
    expect(db.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "file_upload",
        description: "File deleted: Structural.pdf",
        metadata: expect.objectContaining({
          oldValues: expect.objectContaining({ fileName: "Structural.pdf", fileSize: 1024 }),
          newValues: { deleted: true },
        }),
      }),
    );
  });
});
