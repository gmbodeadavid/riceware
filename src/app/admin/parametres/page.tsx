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
        description="Valeurs par défaut de production, seuils d’alerte, objectif Greenpreneur et canal de notification."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Canal WhatsApp</p>
          <div className="mt-2">
            <Badge tone={whatsappConfigured && recipientConfigured ? 'success' : 'warning'}>
              {whatsappConfigured && recipientConfigured ? 'Configuré' : 'Stockage local uniquement'}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {whatsappConfigured
              ? 'Les alertes critiques sont envoyées à l’API WhatsApp configurée.'
              : 'Renseignez WHATSAPP_API_URL et WHATSAPP_API_TOKEN pour activer l’envoi externe.'}
          </p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Destinataire</p>
          <p className="mt-2 font-mono-brand text-sm font-semibold">{process.env.WHATSAPP_RECIPIENT || settings.whatsappNumber || 'Non renseigné'}</p>
          <p className="mt-2 text-xs text-ink-muted">Le numéro des paramètres sert de secours si la variable d’environnement est absente.</p>
        </div>
        <div className="rounded-panel border border-line bg-surface p-4">
          <p className="text-xs uppercase text-ink-muted">Stockage des pièces jointes</p>
          <p className="mt-2 font-mono-brand text-sm font-semibold">{process.env.PRODUCTION_UPLOAD_DIR || 'storage/uploads/production'}</p>
          <p className="mt-2 text-xs text-ink-muted">Les fichiers ne sont pas exposés dans le dossier public.</p>
        </div>
      </div>

      <SettingsForm settings={settings} />

      <div className="mt-6">
        <Section title="Variables d’environnement liées" description="À définir sur le serveur, puis redémarrer l’application.">
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
