import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const runId = Date.now().toString(36);

test("dashboard create, validation, conflict, redirect, stats, and delete journey", async ({
  baseURL,
  page,
}) => {
  const slug = `e2e-${runId}`;
  const targetUrl = `${baseURL}/health`;

  await page.goto("/");
  await page.getByPlaceholder("https://example.com").fill(targetUrl);
  await page.getByPlaceholder("custom-slug").fill(slug);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.locator("#create-message")).toContainText(`/${slug}`);
  await expect(page.locator("tbody")).toContainText(`/${slug}`);

  await page.getByPlaceholder("https://example.com").fill(targetUrl);
  await page.getByPlaceholder("custom-slug").fill("no");
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.locator("#create-message")).toContainText(
    "Slug must be 3-32 alphanumeric or hyphen characters"
  );

  await page.getByPlaceholder("https://example.com").fill(`${baseURL}/health?duplicate=1`);
  await page.getByPlaceholder("custom-slug").fill(slug);
  await page.getByRole("button", { name: "Shorten" }).click();
  await expect(page.locator("#create-message")).toContainText("Slug already exists");

  const linksResponse = await page.request.get("/api/links?per_page=100");
  expect(linksResponse.status()).toBe(200);
  const linksBody = (await linksResponse.json()) as { links: Array<{ id: number; slug: string }> };
  const link = linksBody.links.find((candidate) => candidate.slug === slug);
  expect(link).toBeTruthy();
  if (!link) {
    throw new Error("Created link not found in API list");
  }

  await page.goto(`/${slug}`);
  await expect(page).toHaveURL(`${baseURL}/health`);
  await expect(page.locator("body")).toContainText('"status":"ok"');

  await page.goto(`/stats/${link.id}`);
  await expect(page.getByText("Total Clicks")).toBeVisible();
  await expect(page.locator(".stats-number")).toHaveText("1");

  await page.goto("/");
  const row = page.locator("tr", { hasText: `/${slug}` });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("tr", { hasText: `/${slug}` })).toHaveCount(0);

  const deletedRedirect = await page.request.get(`/${slug}`, { maxRedirects: 0 });
  expect(deletedRedirect.status()).toBe(404);
});

test("pagination, missing, and expired link journeys", async ({ baseURL, page }) => {
  const slugs = [`e2e-${runId}-p1`, `e2e-${runId}-p2`, `e2e-${runId}-p3`];

  for (const slug of slugs) {
    const response = await page.request.post("/api/links", {
      data: { url: `${baseURL}/health`, slug },
    });
    expect(response.status()).toBe(201);
  }

  const listResponse = await page.request.get("/api/links?page=1&per_page=2");
  expect(listResponse.status()).toBe(200);
  const listBody = (await listResponse.json()) as {
    links: unknown[];
    page: number;
    per_page: number;
    total: number;
  };
  expect(listBody.links).toHaveLength(2);
  expect(listBody.total).toBeGreaterThanOrEqual(3);
  expect(listBody.page).toBe(1);
  expect(listBody.per_page).toBe(2);

  const missingApi = await page.request.get("/api/links/99999999");
  expect(missingApi.status()).toBe(404);

  await page.goto("/stats/99999999");
  await expect(page.getByText("Link not found.")).toBeVisible();

  const missingRedirect = await page.goto(`/missing-${runId}`);
  expect(missingRedirect?.status()).toBe(404);
  await expect(page.locator("body")).toContainText("Link not found");

  const expiredSlug = `e2e-${runId}-expired`;
  const expiredCreate = await page.request.post("/api/links", {
    data: {
      expires_at: "2000-01-01T00:00:00.000Z",
      slug: expiredSlug,
      url: `${baseURL}/health`,
    },
  });
  expect(expiredCreate.status()).toBe(201);

  const expiredRedirect = await page.goto(`/${expiredSlug}`);
  expect(expiredRedirect?.status()).toBe(410);
  await expect(page.locator("body")).toContainText("This link has expired");
});
