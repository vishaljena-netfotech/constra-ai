import { expect, test, type BrowserContext } from "@playwright/test";
import { SignJWT } from "jose";
import { desc, eq, inArray } from "drizzle-orm";
import {
  auditLog,
  bidReports,
  projectFiles,
  projects,
  takeoffLineItems,
  takeoffs,
  users,
  workspaceNotifications,
} from "../drizzle/schema";
import { getDb } from "../server/db";

const baseUrl = "http://127.0.0.1:3000";
const floorPlanFixture = {
  name: "browser-plan.png",
  mimeType: "image/png",
  // A valid 1 × 1 PNG keeps upload, selection, review, and export browser coverage self-contained.
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLdfQAAAABJRU5ErkJggg==", "base64"),
};
let estimatorOpenId = "";
let viewerOpenId = "";
let estimatorProjectId = "";
let estimatorTakeoffId = "";

async function signTemporarySession(openId: string, name: string) {
  const secret = process.env.JWT_SECRET;
  const appId = process.env.VITE_APP_ID;

  if (!secret || !appId) {
    throw new Error("Temporary role checks require JWT_SECRET and VITE_APP_ID.");
  }

  return new SignJWT({ openId, appId, name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

async function addSessionCookie(context: BrowserContext, openId: string, name: string) {
  await context.addCookies([
    {
      name: "app_session_id",
      value: await signTemporarySession(openId, name),
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

async function deleteTemporaryRoleData() {
  const db = await getDb();
  if (!db || !estimatorOpenId || !viewerOpenId) return;

  const temporaryUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.openId, [estimatorOpenId, viewerOpenId]));
  const userIds = temporaryUsers.map((user) => user.id);
  if (userIds.length === 0) return;

  await db.delete(workspaceNotifications).where(inArray(workspaceNotifications.userId, userIds));

  const temporaryProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(inArray(projects.userId, userIds));
  const projectIds = temporaryProjects.map((project) => project.id);

  if (projectIds.length > 0) {
    const temporaryTakeoffs = await db
      .select({ id: takeoffs.id })
      .from(takeoffs)
      .where(inArray(takeoffs.projectId, projectIds));
    const takeoffIds = temporaryTakeoffs.map((takeoff) => takeoff.id);

    if (takeoffIds.length > 0) {
      await db.delete(takeoffLineItems).where(inArray(takeoffLineItems.takeoffId, takeoffIds));
    }
    await db.delete(bidReports).where(inArray(bidReports.projectId, projectIds));
    await db.delete(takeoffs).where(inArray(takeoffs.projectId, projectIds));
    await db.delete(projectFiles).where(inArray(projectFiles.projectId, projectIds));
    await db.delete(auditLog).where(inArray(auditLog.projectId, projectIds));
    await db.delete(projects).where(inArray(projects.id, projectIds));
  }

  await db.delete(users).where(inArray(users.id, userIds));
}

async function seedReviewableTestTakeoff(projectId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Temporary role checks require a database connection.");

  await db.insert(takeoffs).values({
    projectId: Number(projectId),
    name: "[E2E Browser] Reviewable takeoff",
    sourceFileIds: [],
    status: "completed",
    aiAnalysisResult: { source: "browser_test_fixture", trainingOnly: true },
  });

  const [takeoff] = await db
    .select({ id: takeoffs.id })
    .from(takeoffs)
    .where(eq(takeoffs.projectId, Number(projectId)))
    .orderBy(desc(takeoffs.id))
    .limit(1);
  if (!takeoff) throw new Error("Unable to create reviewable test takeoff.");

  await db.insert(takeoffLineItems).values({
    takeoffId: takeoff.id,
    material: "Training sample material",
    description: "Browser-test quantity for takeoff review and export validation.",
    quantity: "1.00",
    unit: "each",
    notes: "Temporary browser-test data",
    isEdited: false,
  });
  await db.insert(auditLog).values({
    projectId: Number(projectId),
    userId,
    eventType: "ai_analysis",
    entityType: "takeoff",
    entityId: takeoff.id,
    description: "AI review fixture prepared for browser validation",
    metadata: { source: "browser_test_fixture", trainingOnly: true },
  });
  await db.insert(workspaceNotifications).values({
    userId,
    projectId: Number(projectId),
    takeoffId: takeoff.id,
    type: "takeoff_completed",
    title: "AI takeoff ready for review",
    content: "Your temporary browser-test takeoff is ready for estimator review.",
  });

  return String(takeoff.id);
}

test.beforeAll(async ({}, testInfo) => {
  const db = await getDb();
  if (!db) throw new Error("Temporary role checks require a database connection.");

  const suffix = testInfo.project.name.replace(/[^a-z0-9]/gi, "").toLowerCase();
  estimatorOpenId = `temp_e2e_estimator_${suffix}`;
  viewerOpenId = `temp_e2e_viewer_${suffix}`;

  await db
    .insert(users)
    .values([
      {
        openId: estimatorOpenId,
        name: "Temporary E2E Estimator",
        email: `temp-estimator-${suffix}@constra-ai.test`,
        loginMethod: "test",
        role: "estimator",
      },
      {
        openId: viewerOpenId,
        name: "Temporary E2E Viewer",
        email: `temp-viewer-${suffix}@constra-ai.test`,
        loginMethod: "test",
        role: "viewer",
      },
    ])
    .onDuplicateKeyUpdate({ set: { name: "Temporary E2E Account", role: "viewer" } });

  await db
    .update(users)
    .set({ role: "estimator", name: "Temporary E2E Estimator" })
    .where(eq(users.openId, estimatorOpenId));
});

test.afterAll(async () => {
  await deleteTemporaryRoleData();
});

test("administrator can reversibly update a capability setting", async ({ context, page }) => {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) throw new Error("Administrator browser check requires OWNER_OPEN_ID.");

  await addSessionCookie(context, ownerOpenId, process.env.OWNER_NAME || "Constra AI Administrator");
  await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });

  const bidReportsToggle = page.getByRole("switch", { name: "Toggle Bid reports" });
  await expect(bidReportsToggle).toBeVisible();
  const originalState = await bidReportsToggle.getAttribute("aria-checked");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("configuration.updateFeature") && response.status() === 200),
    bidReportsToggle.click(),
  ]);
  await expect(bidReportsToggle).not.toHaveAttribute("aria-checked", originalState ?? "");
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("configuration.updateFeature") && response.status() === 200),
    bidReportsToggle.click(),
  ]);
  await expect(bidReportsToggle).toHaveAttribute("aria-checked", originalState ?? "true");
});

test("administrator can save and restore estimator walkthrough copy", async ({ context, page }) => {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) throw new Error("Administrator browser check requires OWNER_OPEN_ID.");

  await addSessionCookie(context, ownerOpenId, process.env.OWNER_NAME || "Constra AI Administrator");
  await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });

  const walkthroughLabel = page.locator("#onboarding-label");
  await expect(walkthroughLabel).toBeEnabled();
  const originalLabel = await walkthroughLabel.inputValue();
  const temporaryLabel = `Estimator walkthrough browser verification ${Date.now()}`;
  await walkthroughLabel.fill(temporaryLabel);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("onboarding.update") && response.status() === 200),
    page.getByRole("button", { name: "Save walkthrough", exact: true }).click(),
  ]);
  await expect(page.getByText("Estimator walkthrough updated", { exact: true })).toBeVisible();

  await Promise.all([
    page.waitForResponse((response) => response.url().includes("onboarding.get") && response.status() === 200),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  await expect(walkthroughLabel).toHaveValue(temporaryLabel);
  await walkthroughLabel.fill(originalLabel);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("onboarding.update") && response.status() === 200),
    page.getByRole("button", { name: "Save walkthrough", exact: true }).click(),
  ]);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("onboarding.get") && response.status() === 200),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  await expect(walkthroughLabel).toHaveValue(originalLabel);
});

test("administrator can save and restore project-type trade library copy", async ({ context, page }) => {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) throw new Error("Administrator browser check requires OWNER_OPEN_ID.");

  await addSessionCookie(context, ownerOpenId, process.env.OWNER_NAME || "Constra AI Administrator");
  await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
  const libraryDescription = page.locator("#trade-library-description");
  await expect(libraryDescription).toBeVisible();
  const originalDescription = await libraryDescription.inputValue();
  const temporaryDescription = `Browser verification library guidance ${Date.now()}`;
  await libraryDescription.fill(temporaryDescription);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("tradePackageLibraries.update") && response.status() === 200),
    page.getByRole("button", { name: "Save library", exact: true }).click(),
  ]);
  await expect(page.getByText("Trade-package library updated", { exact: true })).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("tradePackageLibraries.list") && response.status() === 200),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  await expect(libraryDescription).toHaveValue(temporaryDescription);
  await libraryDescription.fill(originalDescription);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("tradePackageLibraries.update") && response.status() === 200),
    page.getByRole("button", { name: "Save library", exact: true }).click(),
  ]);
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("tradePackageLibraries.list") && response.status() === 200),
    page.reload({ waitUntil: "domcontentloaded" }),
  ]);
  await expect(libraryDescription).toHaveValue(originalDescription);
});

test("estimator completes a project, upload, takeoff review, and CSV export workflow", async ({ context, page }) => {
  test.setTimeout(180_000);
  await addSessionCookie(context, estimatorOpenId, "Temporary E2E Estimator");
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const onboarding = page.getByTestId("estimator-onboarding");
  await expect(onboarding).toBeVisible();
  await expect(onboarding.getByText("Create your first estimate", { exact: true })).toBeVisible();
  await onboarding.getByRole("button", { name: "Try a sample project", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Start a training sample project", exact: true })).toBeVisible();
  await expect(page.locator("#sample-trade-library")).toBeVisible();
  await expect(page.locator("#sample-trade-library option")).toHaveCount(3);
  const commercialLibraryOption = page.locator("#sample-trade-library option").filter({ hasText: "Commercial tenant improvement" }).first();
  const commercialLibraryId = await commercialLibraryOption.getAttribute("value");
  if (!commercialLibraryId) throw new Error("Commercial tenant-improvement library was not available for sample-project testing.");
  await page.locator("#sample-trade-library").selectOption(commercialLibraryId);
  await expect(page.getByRole("button", { name: "Create training project", exact: true })).toBeEnabled();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("projects.createSample") && response.status() === 200),
    page.getByRole("button", { name: "Create training project", exact: true }).click(),
  ]);
  await expect(page).toHaveURL(/\/project\/\d+$/);
  await expect(page.getByText("Sample plan · Commercial tenant improvement", { exact: true })).toBeVisible();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const projectName = `[E2E Browser] Estimator project ${Date.now()}`;
  await page.getByRole("button", { name: "New Project" }).first().click();
  await page.locator("#project-name").fill(projectName);
  await page.getByRole("button", { name: "Create", exact: true }).click();

  await expect(page.getByText("Project created successfully", { exact: true })).toBeVisible();
  const projectOption = page.locator("#upload-project option").filter({ hasText: projectName }).first();
  await expect(projectOption).toHaveText(projectName);
  const projectId = await projectOption.getAttribute("value");
  if (!projectId) throw new Error("Created estimator project was not available to the upload control.");
  estimatorProjectId = projectId;

  await page.locator("#upload-project").selectOption(projectId);
  await page.locator("input[type=file]").setInputFiles(floorPlanFixture);
  await expect(page.getByText("Ready", { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto(`/project/${projectId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("browser-plan.png", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/project/${projectId}/new-takeoff$`));

  await page.locator("#takeoff-name").fill("[E2E Browser] AI takeoff");
  await page.getByText("browser-plan.png", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Start AI Analysis", exact: true })).toBeEnabled();
  const db = await getDb();
  const [estimator] = db
    ? await db.select({ id: users.id }).from(users).where(eq(users.openId, estimatorOpenId)).limit(1)
    : [];
  if (!estimator) throw new Error("Temporary estimator account was not available for test data setup.");
  estimatorTakeoffId = await seedReviewableTestTakeoff(projectId, estimator.id);
  await page.goto(`/project/${projectId}/takeoff/${estimatorTakeoffId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("AI-generated first pass", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeEnabled();

  const [download, exportAudit] = await Promise.all([
    page.waitForEvent("download"),
    page.waitForResponse((response) => response.url().includes("audit.recordExport") && response.status() === 200),
    page.getByRole("button", { name: "Export CSV", exact: true }).click(),
  ]);
  await expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  expect(exportAudit.status()).toBe(200);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const notificationsButton = page.getByRole("button", { name: "Notifications (1 unread)" });
  await expect(notificationsButton).toBeVisible();
  await notificationsButton.click();
  await expect(page.getByRole("button", { name: "AI takeoff ready for review" })).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("notifications.resolveTakeoff") && response.status() === 200),
    page.getByRole("button", { name: "Approve", exact: true }).click(),
  ]);
  await expect(page.getByText("AI takeoff approved", { exact: true })).toBeVisible();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
  await page.locator("#notification-project-filter").selectOption(projectId);
  await page.locator("#notification-status-filter").selectOption("approved");
  await expect(page.getByText("AI takeoff ready for review", { exact: true })).toBeVisible();
  await expect(page.locator("span").filter({ hasText: "Approved" })).toBeVisible();
  await page.goto(`/project/${projectId}/takeoff/${estimatorTakeoffId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Approved from the completion alert", { exact: true })).toBeVisible();
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Recent activity", exact: true })).toBeVisible();
  await expect(page.getByText("Takeoff exported as CSV", { exact: true })).toBeVisible({ timeout: 15_000 });
});

test("viewer reviews project and takeoff surfaces without mutation controls", async ({ context, page }) => {
  await addSessionCookie(context, viewerOpenId, "Temporary E2E Viewer");
  if (!estimatorProjectId || !estimatorTakeoffId) {
    throw new Error("Viewer workflow requires the estimator workflow to create a project and takeoff first.");
  }
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("button", { name: "Viewer access" }).first()).toBeDisabled();
  await expect(page.getByText("Plan uploads are unavailable", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Your viewer role is read-only. Ask an administrator or estimator to upload drawings.", { exact: true }),
  ).toBeVisible();

  await page.goto(`/project/${estimatorProjectId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Viewer access is read-only", { exact: true })).toBeVisible();

  await page.goto(`/project/${estimatorProjectId}/takeoff/${estimatorTakeoffId}`, { waitUntil: "domcontentloaded" });
  const readOnlyControls = page.getByRole("button", { name: "Read only", exact: true });
  await expect(readOnlyControls).toHaveCount(2);
  await expect(readOnlyControls.nth(0)).toBeDisabled();
  await expect(readOnlyControls.nth(1)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Export CSV", exact: true })).toBeDisabled();

  await page.goto("/admin/settings", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "Viewer access" }).first()).toBeDisabled();
});
