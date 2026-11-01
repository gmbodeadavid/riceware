export default async function run(page, ui) {
  await page.waitForTimeout(1000);
  
  // Click "Changer" (first one = livraison)
  const snap0 = await ui.snapshot();
  const changerBtns = [...snap0.matchAll(/@(e\d+) button "Changer"/g)].map(m => m[1]);
  
  if (changerBtns[0]) {
    await ui.click(changerBtns[0]);
    await page.waitForTimeout(2000);
  }
  
  await page.screenshot({ path: 'scripts/revvo-delivery.png' });
  
  const snap = await ui.snapshot({ full: true });
  
  // Extract all visible text about villes/tarifs
  const allText = await page.evaluate(() => document.body.innerText);
  
  // Find city options in selects or radio buttons
  const deliveryOptions = await page.evaluate(() => {
    // Look for any elements containing FCFA near city names
    const allEls = document.querySelectorAll('*');
    const results = [];
    for (const el of allEls) {
      if (el.children.length === 0 && el.textContent?.match(/FCFA/) && el.textContent?.length < 200) {
        results.push(el.textContent.trim());
      }
    }
    return [...new Set(results)].slice(0, 50);
  });
  
  return { 
    snap: snap.slice(0, 5000),
    deliveryOptions,
    // relevant section of full text
    deliverySection: allText.match(/livraison[\s\S]{0,1000}/i)?.[0]
  };
}
