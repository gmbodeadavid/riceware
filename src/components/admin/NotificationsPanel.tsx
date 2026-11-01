'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  level: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string | Date;
};

const LEVEL_STYLES: Record<string, string> = {
  warning: 'border-husk-deep/30 bg-husk-soft/60',
  danger: 'border-danger/25 bg-danger/5',
  success: 'border-paddy/25 bg-paddy/5',
  info: 'border-line bg-ground/60',
};

export default function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((notification) => !notification.read).length;

  const markAll = async () => {
    setBusy(true);
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{unread ? `${unread} alerte(s) non lue(s)` : 'Tout est à jour.'}</p>
        {unread ? (
          <button
            type="button"
            onClick={() => void markAll()}
            disabled={busy || pending}
            className="rounded-control border border-line px-3 py-1.5 text-xs font-semibold hover:border-paddy hover:text-paddy disabled:opacity-50"
          >
            Tout marquer comme lu
          </button>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-control border border-dashed border-line px-4 py-6 text-sm text-ink-muted">
          Aucune alerte enregistrée.
        </p>
      ) : (
        <ul className="space-y-2">
          {notifications.slice(0, 8).map((notification) => (
            <li
              key={notification.id}
              className={`rounded-control border px-3 py-2.5 text-sm ${LEVEL_STYLES[notification.level] ?? LEVEL_STYLES.info} ${notification.read ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.read ? 'bg-line' : 'bg-danger'}`} aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink">{notification.title}</p>
                  <p className="mt-0.5 text-ink-muted">{notification.message}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
