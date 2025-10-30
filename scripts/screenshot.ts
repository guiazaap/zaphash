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
  // aguarda diálogo (se aparecer) e tenta fechar várias formas
  for (let i = 0; i < 3; i++) {
    const dlg = page.locator('div[role="dialog"]').first();
    const hasDialog = await dlg.isVisible().catch(() => false);
    if (hasDialog) {
      // tentativas mais específicas dentro do diálogo
      const attempts = [
        'div[role="dialog"] button[aria-label="Fechar"]',
        'div[role="dialog"] button[aria-label="Close"]',
        'div[role="dialog"] [aria-label="Fechar"]',
        'div[role="dialog"] [aria-label="Close"]',
        // botões genéricos no canto superior
        'div[role="dialog"] [role="button"]:has(svg[aria-label="Close"])',
        'div[role="dialog"] [role="button"]:near(:text("Sign up"), 200)',
        'div[role="dialog"] button:has-text("X")'
      ];
      let clicked = false;
      for (const sel of attempts) {
        if (await tryClick(page, sel)) { clicked = true; break; }
      }
      // fallback: clique relativo no canto do dialog
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
    // ESC como fallback
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);

    // se não houver mais dialog, encerra
    if (!(await page.locator('div[role="dialog"]').first().isVisible().catch(() => false))) break;
    await page.waitForTimeout(300);
  }

  // banner de cookies
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

  // espere o diálogo surgir (se for surgir) por até 3s e feche
  await page.waitForTimeout(800
