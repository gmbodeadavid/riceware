'use client';

import { useState } from 'react';

type DeletedGroup = {
  model: string;
  label: string;
  items: { id: string; display: string; deletedAt: Date | string }[];
  canRestore: boolean;
};

type Props = { groups: DeletedGroup[] };

export default function CorbeilleClient({ groups }: Props) {
  const [restoring, setRestoring] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState<Set<string>>(new Set());

  async function handleRestore(model: string, id: string) {
    setRestoring(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/corbeille', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setRestored((prev) => new Set([...prev, id]));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setRestoring(null);
    }
  }

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-control border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </div>
      )}

      {total === 0 ? (
        <p className="text-sm text-ink-muted">La corbeille est vide.</p>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((group) => (
            <section key={group.model}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
                {group.label} ({group.items.length})
              </h2>
              <ul className="divide-y divide-line rounded-control border border-line">
                {group.items.map((item) => {
                  const isRestored = restored.has(item.id);
                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className={`text-sm font-medium ${isRestored ? 'text-ink-muted line-through' : 'text-ink'}`}>
                          {item.display}
                        </p>
                        <p className="text-xs text-ink-muted">
                          Supprimé le{' '}
                          {new Date(item.deletedAt).toLocaleString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {isRestored ? (
                        <span className="text-xs text-paddy">Restauré ✓</span>
                      ) : group.canRestore ? (
                        <button
                          type="button"
                          disabled={restoring === item.id}
                          onClick={() => handleRestore(group.model, item.id)}
                          className="rounded-control border border-line bg-ground px-3 py-1.5 text-xs font-medium text-ink hover:border-paddy hover:text-paddy disabled:opacity-50"
                        >
                          {restoring === item.id ? 'Restauration…' : 'Restaurer'}
                        </button>
                      ) : (
                        <span className="text-xs text-ink-muted" title="Restauration non disponible en P1">
                          Non restaurable
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
