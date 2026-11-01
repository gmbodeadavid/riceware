/**
 * Convertit un document HTML en PDF A4 via Puppeteer (headless Chromium).
 * Doit tourner dans le runtime Node.js (pas Edge).
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  // Import dynamique pour éviter que le bundler ne tente de traiter puppeteer
  const { default: puppeteer } = await import('puppeteer');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();

    // Charge le HTML directement (pas besoin de serveur)
    await page.setContent(html, { waitUntil: 'load' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
