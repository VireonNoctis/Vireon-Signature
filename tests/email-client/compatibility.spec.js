import { expect, test } from "@playwright/test";
const clients = ["Gmail", "Outlook", "Apple Mail", "Proton Mail"];
const themes = ["light", "dark"];
const formFactors = ["desktop", "mobile"];
for (const client of clients) {
  for (const theme of themes) {
    for (const formFactor of formFactors) {
      test(client + " · " + theme + " · " + formFactor, async ({ page }, testInfo) => {
        await page.setViewportSize(formFactor === "mobile"
          ? { width: 390, height: 844 } : { width: 1280, height: 900 });
        const pageErrors = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        await page.goto("/", { waitUntil: "domcontentloaded" });
        await page.getByRole("button", { name: "Create first profile" }).click();
        await page.locator("#signature-name").fill("Vir Example");
        await page.locator("#signature-email").fill("vir@example.com");
        await page.locator("#signature-role").fill("Product Designer");
        await page.locator(".client-tabs").first().getByRole("button", { name: client, exact: true }).click();
        await page.locator(".preview-options .preview-toggle").getByRole("button", { name: theme, exact: true }).click();
        if (formFactor === "mobile") {
          await page.getByRole("button", { name: "Mobile 390px" }).click();
          await expect(page.locator(".preview-stage")).toHaveClass(/is-mobile/);
        } else {
          await expect(page.locator(".preview-stage")).not.toHaveClass(/is-mobile/);
        }
        const preview = page.frameLocator("iframe.preview-frame");
        await expect(preview.locator('main > table[role="presentation"]')).toHaveCount(1);
        await expect(preview.locator("body")).toContainText("Vir Example");
        await expect(preview.locator('a[href="mailto:vir@example.com"]')).toHaveCount(1);
        await expect(preview.locator("body")).toHaveAttribute("data-client", client);
        const background = await preview.locator("body").evaluate((element) => getComputedStyle(element).backgroundColor);
        expect(background).toBe(theme === "dark" ? "rgb(23, 23, 23)" : "rgb(255, 255, 255)");
        await expect(page.locator(".preview-meta")).toContainText(client.toUpperCase());
        const iframeWidth = await page.locator("iframe.preview-frame").evaluate((element) => element.getBoundingClientRect().width);
        if (formFactor === "mobile") expect(iframeWidth).toBeLessThanOrEqual(390);
        expect(pageErrors).toEqual([]);
        await page.locator(".preview-stage").screenshot({ path: testInfo.outputPath("email-preview.png") });
      });
    }
  }
}
test("exported markup uses conservative email-safe HTML", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create first profile" }).click();
  await page.locator("#signature-name").fill("Vir Example");
  await page.locator("#signature-email").fill("vir@example.com");
  const rendered = await page.frameLocator("iframe.preview-frame").locator("body").innerHTML();
  expect(rendered).toContain('role="presentation"');
  expect(rendered).toContain("font-family:Arial,Helvetica,sans-serif");
  expect(rendered).not.toMatch(/<script\b|<style\b|@import|fonts\.googleapis/i);
  expect(rendered).not.toContain("backdrop-filter");
});
test("PWA manifest and scoped service worker are available", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const response = await page.request.get("/site.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = await response.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toBe("./");
  expect(manifest.icons[0].src).toContain("vireon-mark.svg");
  const worker = await page.request.get("/service-worker.js");
  expect(worker.ok()).toBeTruthy();
  expect(await worker.text()).toContain('url.pathname.includes("/api/")');
  await page.waitForFunction(async () => Boolean(await navigator.serviceWorker?.getRegistration()));
  const label = await page.locator(".install-top").innerText();
  if (label.includes("Setup")) {
    await page.locator(".install-top").click();
    await expect(page.locator(".pwa-setup")).toBeVisible();
  } else {
    expect(label).toMatch(/Install app|Installed/);
  }
});
