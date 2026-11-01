// Test complet du comportement du retour navigateur avec la visionneuse 3D
export default async function run(page, ui) {
  // 1. Aller d'abord sur /boutique (simuler la navigation réelle de l'utilisateur)
  await page.goto('http://localhost:3000/boutique');
  await page.waitForLoadState('domcontentloaded');
  const urlBoutique = page.url();

  // 2. Naviguer vers la page produit
  await page.goto('http://localhost:3000/boutique/barquette-repas');
  await page.waitForLoadState('domcontentloaded');
  const urlProduit = page.url();

  // 3. Trouver et cliquer sur "Explorer en 3D"
  const snap1 = await ui.snapshot();
  const btn3d = snap1.match(/@(e\d+) button "Explorer en 3D"/)?.[1];
  if (!btn3d) return { error: 'Bouton 3D introuvable', snap1 };

  await ui.click(btn3d);
  await page.waitForTimeout(1200);

  const urlModal = page.url();

  // 4. Appuyer sur le bouton retour — avec un timeout court car on veut juste savoir l'URL résultante
  try {
    await page.goBack({ timeout: 5000, waitUntil: 'domcontentloaded' });
  } catch {
    // timeout acceptable, on lit l'URL quand même
  }
  await page.waitForTimeout(600);

  const urlApresRetour = page.url();

  return {
    '1_boutique': urlBoutique,
    '2_produit': urlProduit,
    '3_modal_ouverte_url': urlModal,
    '4_apres_retour': urlApresRetour,
    OK_retour_sur_produit: urlApresRetour.includes('/boutique/barquette-repas'),
    FAIL_retour_sur_catalogue: urlApresRetour.endsWith('/boutique') || urlApresRetour.endsWith('/boutique/'),
  };
}
