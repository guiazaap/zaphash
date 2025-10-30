import { chromium } from "@playwright/test";

function extractShortcode(url: string): string {
  const m = url.match(/instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)/i);
  if (!m) throw new Error("URL de post inválida");
  return m[2];
}

async function tryClick(page: any, selector: string) {
  const el = page.locator(selector).first();
  if (await el.isVisible().catch(() => false)) {
    await el.click({ timeout: 1000, force: true }).catch(() => {});
    await page.waitForTimeout(250);
    return true;
  }
  return false;
}

async function closePopups(page: any) {
  // Tenta fechar o modal (3 rodadas)
  for (let i = 0; i < 3; i++) {
    const dlg = page.locator('div[role="dialog"]').first();
    const hasDialog = await dlg.isVisible().catch(() => false);
    if (hasDialog) {
      const attempts = [
        'div[role="dialog"] button[aria-label="Fechar"]',
        'div[role="dialog"] button[aria-label="Close"]',
        'div[role="dialog"] [aria-label="Fechar"]',
        'div[role="dialog"] [aria-label="Close"]',
        'div[role="dialog"] [role="button"]:has(svg[aria-label="Close"])',
        'div[role="dialog"] [role="button"]:near(:text("Sign up"), 200)',
        'div[role="dialog"] button:has-text("X")'
      ];
      let clicked = false;
      for (const sel of attempts) {
        if (await tryClick(page, sel)) { clicked = true; break; }
      }
      if (!clicked) {
        const box = await dlg.boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width - 10, box.y + 10);
          await page.mouse.down().catch(() => {});
          await page.mouse.up().catch(() => {});
          await page.waitForTimeout(300);
        }
      }
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(250);
    const stillDialog = await page.locator('div[role="dialog"]').first().isVisible().catch(() => false);
    if (!stillDialog) break;
    await page.waitForTimeout(300);
  }

  // Cookies
  const cookieSelectors = [
    'button:has-text("Permitir todos os cookies")',
    'button:has-text("Aceitar")',
    'button:has-text("Allow all cookies")'
  ];
  for (const sel of cookieSelectors) {
    if (await tryClick(page, sel)) break;
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

  // Espera curta para o modal surgir e fecha
  await page.waitForTimeout(800);
  await page.waitForSelector('div[role="dialog"]', { timeout: 3000 }).catch(() => {});
  await closePopups(page);

  // Garante que o DOM do artigo está renderizado
  await page.waitForSelector("article", { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);

  // Screenshot SOMENTE do post principal (article) usando o shortcode
  let shot = false;
  const postLocatorCandidates = [
    `article:has(a[href*="/p/${id}/"])`,
    `main article:has(a[href*="/p/${id}/"])`,
    // fallback heurísticos
    `main article:has(time)`,   // geralmente o principal
    `main article`,
    `article`
  ];

  for (const sel of postLocatorCandidates) {
    const loc = page.locator(sel).first();
    if ((await loc.count().catch(() => 0)) > 0) {
      await loc.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(200);
      try {
        await loc.screenshot({ path: outFile });
        shot = true;
        break;
      } catch {
        // tenta próximo candidato
      }
    }
  }

  if (!shot) {
    // último recurso: viewport (para não falhar o job)
    await page.screenshot({ path: outFile, fullPage: false });
  }

  console.log(JSON.stringify({ id, file: outFile }));
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
