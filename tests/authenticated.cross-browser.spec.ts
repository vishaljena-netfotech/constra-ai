import { expect, test } from "@playwright/test";
import { SignJWT } from "jose";

const baseUrl = "http://127.0.0.1:3000";

async function createSessionToken() {
  const secret = process.env.JWT_SECRET;
  const openId = process.env.OWNER_OPEN_ID;
  const appId = process.env.VITE_APP_ID;

  if (!secret || !openId || !appId) {
    throw new Error("Browser validation requires JWT_SECRET, OWNER_OPEN_ID, and VITE_APP_ID.");
  }

  return new SignJWT({
    openId,
    appId,
    name: process.env.OWNER_NAME || "Constra AI Administrator",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(secret));
}

test.beforeEach(async ({ context }) => {
  const token = await createSessionToken();
  await context.addCookies([
    {
      name: "app_session_id",
      value: token,
      url: baseUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
});

const authenticatedRoutes = [
  { path: "/dashboard", text: "Constra AI" },
  { path: "/project/1", text: "okk" },
  { path: "/profile", text: "Arindam Ghosh" },
  { path: "/admin/settings", text: "Administration" },
];

for (const route of authenticatedRoutes) {
  test(`renders ${route.path} in an authenticated workspace session`, async ({ page }) => {
    await page.goto(route.path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, "\\/")}$`));
    await expect(page.getByText(route.text, { exact: true }).first()).toBeVisible();
    await expect(page.locator("main").last()).toBeVisible();
    await expect(page.getByText("Page not found", { exact: true })).toHaveCount(0);
  });
}
