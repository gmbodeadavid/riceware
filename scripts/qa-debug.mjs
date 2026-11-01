export default async function run(page, ui) {
  await page.waitForTimeout(1500);

  // Snapshot complet pour voir ce qui est réellement dans le DOM
  const snap = await ui.snapshot();
  console.log('SNAPSHOT:', snap);

  // Lire le HTML brut du form
  const formHtml = await page.evaluate(() => document.querySelector('form')?.innerHTML?.slice(0, 2000));
  console.log('FORM HTML:', formHtml);

  // Chercher les boutons + et -
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      aria: b.getAttribute('aria-label'),
      type: b.getAttribute('type'),
      disabled: b.disabled,
    }))
  );

  return { snap: snap.slice(0, 1000), buttons };
}
