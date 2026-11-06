import { requireAdminPage } from '@/lib/admin-guard';
import { getSettings } from '@/lib/production/settings';
import { PageHeader, Section, Badge } from '@/components/admin/ui';
import SettingsForm from '@/components/admin/SettingsForm';

export default async function SettingsPage() {
  await requireAdminPage('settings:manage');
  const settings = await getSettings();
  const whatsappConfigured = Boolean(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN);
  const recipientConfigured = Boolean(process.env.WHATSAPP_RECIPIENT || settings.whatsappNumber);

  return (
    <div>
      <PageHeader
        title="Paramètres"
        breadcrumb={[{ label: 'Tableau de bord', href: '/admin' }, { label: 'Paramètres' }]}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface p-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Canal WhatsApp</p>
          <Badge tone={whatsappConfigured && recipientConfigured ? 'success' : 'warning'}>
            {whatsappConfigured && recipientConfigured ? 'Configuré' : 'Non configuré'}
          </Badge>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Destinataire</p>
          <p className="font-mono-brand text-xs font-semibold text-ink truncate">{process.env.WHATSAPP_RECIPIENT || settings.whatsappNumber || '—'}</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Stockage</p>
          <p className="font-mono-brand text-xs font-semibold text-ink truncate">{process.env.PRODUCTION_UPLOAD_DIR || 'storage/uploads/production'}</p>
        </div>
      </div>

      <SettingsForm settings={settings} />

      <div className="mt-6">
        <Section title="Variables d'environnement liées">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-2 pr-4">Variable</th>
                  <th className="pb-2 pr-4">Rôle</th>
                  <th className="pb-2">État</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['WHATSAPP_API_URL', 'Endpoint d’envoi WhatsApp', process.env.WHATSAPP_API_URL],
                  ['WHATSAPP_API_TOKEN', 'Jeton d’authentification', process.env.WHATSAPP_API_TOKEN],
                  ['WHATSAPP_RECIPIENT', 'Numéro destinataire des alertes', process.env.WHATSAPP_RECIPIENT],
                  ['PRODUCTION_UPLOAD_DIR', 'Dossier de stockage des documents', process.env.PRODUCTION_UPLOAD_DIR],
                ].map(([name, role, value]) => (
                  <tr key={name} className="border-b border-line/60 last:border-0">
                    <td className="py-2.5 pr-4 font-mono-brand text-xs">{name}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{role}</td>
                    <td className="py-2.5"><Badge tone={value ? 'success' : 'neutral'}>{value ? 'Défini' : 'Non défini'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  );
}
