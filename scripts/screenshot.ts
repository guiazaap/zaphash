import { chromium } from "@playwright/test";

function extractShortcode(url: string): string {
  const m = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/i);
  if (!m) throw new Error("URL de post inválida");
  return m[2];
}

async function closePopups(page: any) {
  const closeSelectors = [
    'button:has-text("Fechar")',
    'button[aria-label="Fechar"]',
    'button[aria-label="Close"]',
    'text=Fechar'
  ];
  for (const sel of closeSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      break;
    }
  }
  const cookieSelectors = [
    'button:has-text("Permitir todos os cookies")',
    'button:has-text("Aceitar")',
    'button:has-text("Allow all cookies")'
  ];
  for (const sel of cookieSelectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) {
      await el.click().catch(() => {});
      break;
    }
  }
}

async function run() {
  const postUrl = process.env.POST_URL;
  if (!postUrl) throw new Error("Defina POST_URL");
  const id = extractShortcode(postUrl);
  const outFile = `${id}.png`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36"
  });
  const page = await context.newPage();

  await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await closePopups(page);

  const candidates = ["main article", "article", 'div[role="main"] article', "main"];
  let shot = false;
  for (const sel of candidates) {
    const el = page.locator(sel).first();
    if ((await el.count().catch(() => 0)) > 0) {
      await el.screenshot({ path: outFile }).catch(() => {});
      shot = true;
      break;
    }
  }
  if (!shot) {
    await page.screenshot({ path: outFile, fullPage: false });
  }

  console.log(JSON.stringify({ id, file: outFile }));
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
