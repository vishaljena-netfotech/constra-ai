import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "desktop", width: 1440, height: 960 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`renders the public landing experience without horizontal overflow on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Takeoffs in Minutes/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pricing that follows your estimating workflow" })).toBeVisible();
    await expect(page.getByText("Free to start", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create free workspace" })).toBeVisible();

    const viewportHasNoHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(viewportHasNoHorizontalOverflow).toBe(true);
  });
}
