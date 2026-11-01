export default async function run(page, ui) {
  // Add to cart first
  const snap0 = await ui.snapshot();
  const cmdBtn = snap0.match(/@(e\d+) button "Commander"/)?.[1];
  if (cmdBtn) {
    await ui.click(cmdBtn);
    await page.waitForTimeout(4000);
  }

  // Extract city select options directly
  const cityOptions = await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (!sel) return { found: false, options: [] };
    return {
      found: true,
      options: Array.from(sel.options).map(o => ({ value: o.value, text: o.text.trim() }))
    };
  });

  // Open the select to screenshot
  await page.evaluate(() => {
    const sel = document.querySelector('select');
    if (sel) sel.size = sel.options.length;
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'scripts/revvo-cities2.png' });

  // Also try changing city to see if delivery fee changes
  // Change to first non-Abidjan option
  const firstOther = cityOptions.options?.find(o => !o.text.includes('Abidjan'));
  if (firstOther) {
    await page.evaluate((val) => {
      const sel = document.querySelector('select');
      if (sel) {
        sel.value = val;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, firstOther.value);
    await page.waitForTimeout(1500);
    
    // Read updated delivery fee
    const updatedFee = await page.evaluate(() => {
      const texts = [...document.querySelectorAll('*')]
        .filter(el => !el.children.length && /FCFA/.test(el.textContent || ''))
        .map(el => el.textContent?.trim())
        .filter(t => t && t.length < 100);
      return [...new Set(texts)];
    });

    await page.screenshot({ path: 'scripts/revvo-othercity.png' });

    return { cityOptions, firstOther, updatedFee };
  }

  return { cityOptions };
}
