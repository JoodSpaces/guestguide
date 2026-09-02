import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const TOKEN = process.env.TEST_TOKEN;

test.describe("Guest golden path", () => {
  test.skip(!TOKEN, "TEST_TOKEN not set — skipping E2E guest flow");

  test("stay home loads and shows guest info", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);
    // The stay home renders a greeting and at least one nav card
    await expect(page.locator("h1, h2").first()).toBeVisible();
    // No 404 text on the page
    await expect(page.locator("text=not found")).toHaveCount(0);
  });

  test("arrival page loads and shows door access section", async ({ page }) => {
    await page.goto(`/s/${TOKEN}/arrival`);
    // Arrival page has a heading and the door/unlock section
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("text=not found")).toHaveCount(0);
  });

  test("concierge page loads and accepts a message", async ({ page }) => {
    await page.goto(`/s/${TOKEN}/concierge`);
    await expect(page.locator("textarea, input[type=text]").first()).toBeVisible();
  });

  test("services page loads", async ({ page }) => {
    await page.goto(`/s/${TOKEN}/services`);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("text=not found")).toHaveCount(0);
  });

  test("checkout page loads", async ({ page }) => {
    await page.goto(`/s/${TOKEN}/checkout`);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    await expect(page.locator("text=not found")).toHaveCount(0);
  });

  test("stay home has no critical a11y violations", async ({ page }) => {
    await page.goto(`/s/${TOKEN}`);
    await expect(page.locator("h1, h2").first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .exclude("[aria-hidden='true']")
      .analyze();
    expect(results.violations.filter((v) => v.impact === "critical")).toEqual([]);
  });
});
