'use client';

import { useState, type ReactNode } from 'react';

/**
 * Ligne de tableau expansible : affiche les cellules de résumé,
 * et déplie une ligne de formulaire au clic sur le bouton "Modifier".
 */
export function ExpandableRow({
  cells,
  form,
  colSpan,
  editLabel = 'Modifier',
}: {
  /** Contenu des cellules de la ligne principale (sauf la dernière — actions) */
  cells: ReactNode;
  /** Contenu du formulaire dans la ligne expansible */
  form: ReactNode;
  /** Nombre total de colonnes du tableau (pour colspan de la ligne dépliée) */
  colSpan: number;
  editLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Ligne principale */}
      <tr className={`group transition-colors ${open ? 'bg-paddy/[0.04]' : 'hover:bg-paddy/[0.03]'}`}>
        {cells}
        {/* Cellule actions */}
        <td className="px-4 py-3 align-middle">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-control border px-2.5 py-1 text-xs font-semibold transition-colors ${
              open
                ? 'border-paddy bg-paddy/10 text-paddy-deep'
                : 'border-line text-ink hover:border-paddy hover:text-paddy'
            }`}
          >
            {open ? '▲ Fermer' : `✎ ${editLabel}`}
          </button>
        </td>
      </tr>

      {/* Ligne de formulaire */}
      {open && (
        <tr className="bg-ground/60">
          <td colSpan={colSpan} className="px-4 pb-5 pt-3">
            <div className="max-w-2xl">
              {form}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
