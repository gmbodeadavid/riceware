export default async function run(page, ui) {
  // Login
  await page.goto('http://localhost:3000/admin/login');
  await page.waitForLoadState('domcontentloaded');

  const snap = await ui.snapshot();
  // Find password field (no email — uses legacy admin)
  const inputs = [...snap.matchAll(/@(e\d+) textbox/g)].map(m => m[1]);
  // Password is the last textbox on this page
  const pwdField = inputs[inputs.length - 1];
  if (!pwdField) return { error: 'No password field found', snap };

  // Try to get admin password from env via the page (won't work, but try API)
  // Use the seed password — admin account
  await ui.fill(pwdField, 'RiceWare2026!');

  const btn = snap.match(/@(e\d+) button "Se connecter"/)?.[1];
  if (!btn) return { error: 'No submit button', snap };

  await ui.click(btn);
  await page.waitForTimeout(3000);

  const afterUrl = page.url();
  const afterSnap = await ui.snapshot({ full: true });

  // Screenshot
  await page.screenshot({ path: 'C:\\Users\\david\\OneDrive\\Desktop\\RiceWare\\debug-admin-dashboard.png', fullPage: false });

  return { url: afterUrl, snapshot: afterSnap.slice(0, 500) };
}
