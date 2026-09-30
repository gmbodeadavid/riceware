type TagTone = 'plus' | 'minus' | 'neutral';

type Cell = { tag?: { tone: TagTone; label: string }; text?: string };

// The last column is RiceWare's choice and gets the highlighted style.
const COLUMNS = [
  { name: 'Maïs', detail: 'Spathes et rafles' },
  { name: 'Canne à sucre', detail: 'Bagasse' },
  { name: 'Riz', detail: 'Coque' },
];
const HIGHLIGHT_COLUMN = COLUMNS.length - 1;

// One cell per column, in COLUMNS order.
// A row either has a tag in every cell or in none: never tag only some of the columns.
const ROWS: { criterion: string; cells: Cell[] }[] = [
  {
    criterion: 'Accès à la matière',
    cells: [
      { tag: { tone: 'minus', label: 'Dispersée' }, text: 'Laissée au champ' },
      { tag: { tone: 'neutral', label: 'Concentrée' }, text: 'Dans quelques sucreries' },
      { tag: { tone: 'plus', label: 'Rassemblée' }, text: 'Rizeries de plusieurs bassins' },
    ],
  },
  {
    criterion: 'Disponibilité',
    cells: [
      { tag: { tone: 'neutral', label: 'Partielle' }, text: 'Fourrage ou combustible' },
      { tag: { tone: 'minus', label: 'Faible' }, text: 'Brûlée pour l’énergie' },
      { tag: { tone: 'plus', label: 'Élevée' }, text: 'Souvent brûlée ou entassée' },
    ],
  },
  {
    criterion: 'Évolution du gisement',
    cells: [
      { tag: { tone: 'neutral', label: 'Dépendante' }, text: 'Suit la récolte de maïs' },
      { tag: { tone: 'neutral', label: 'Dépendante' }, text: 'Suit la récolte de sucre' },
      { tag: { tone: 'plus', label: 'En hausse' }, text: 'Autosuffisance en riz' },
    ],
  },
  {
    criterion: 'Maturité pour la vaisselle',
    cells: [
      { tag: { tone: 'minus', label: 'Peu développée' }, text: 'Peu d’applications en vaisselle' },
      { tag: { tone: 'plus', label: 'Technologie mûre' }, text: 'Souvent importée' },
      { tag: { tone: 'neutral', label: 'En développement' }, text: 'Formules en test' },
    ],
  },
];

const TAG_TONES: Record<TagTone, string> = {
  plus: 'bg-paddy/12 text-paddy-deep',
  minus: 'bg-danger/10 text-danger',
  neutral: 'bg-grain text-ink',
};

const LOCAL_REASONS = [
  {
    title: 'Production locale',
    desc: 'Une matière collectée auprès de rizeries ivoiriennes, transformée à Abidjan, au plus près des clients.',
  },
  {
    title: 'Prix en FCFA',
    desc: 'Des coûts de production locaux, sans dépendance aux importations ni au taux de change.',
  },
  {
    title: 'Traçabilité',
    desc: 'Origine des coques, formulation et conditions de fin de vie documentées pour chaque lot.',
  },
];

const LABEL_CLASS = 'font-mono-brand text-xs leading-4 tracking-[0.08em] uppercase text-husk-text';
const CELL_CLASS = 'px-3 py-3 text-left align-top border-b border-line md:px-4';

export default function ResidueComparison() {
  return (
    <div>
      <p className={LABEL_CLASS}>Pourquoi la coque de riz</p>
      <h2 className="font-display text-title font-bold text-ink mt-3 max-w-[760px]">
        Un résidu parmi d’autres, mais le mieux placé en Côte d’Ivoire.
      </h2>
      <p className="text-[18px] leading-7 text-ink-muted mt-4 max-w-[720px]">
        Plusieurs résidus agricoles peuvent servir à fabriquer de la vaisselle végétale. Nous les avons comparés honnêtement, forces et faiblesses comprises.
      </p>

      {/* Ethical argument */}
      <div className="mt-8 flex items-start gap-3.5 min-[900px]:gap-5 bg-husk-soft rounded-[20px] px-5 py-[22px] min-[900px]:px-8 min-[900px]:py-7">
        <svg width="26" height="34" viewBox="0 0 22 28" aria-hidden="true" className="shrink-0 mt-0.5">
          <path d="M4 27C-1 19 2 7 12 1c5 9 2 21-8 26z" fill="var(--color-husk)" />
          <path d="M4 27c2-9 4-17 8-26 5 9 2 21-8 26z" fill="var(--color-husk-deep)" />
        </svg>
        <p className="font-display font-semibold text-[clamp(20px,2.2vw,26px)] leading-[1.3] text-ink">
          La coque n’est pas un aliment : l’utiliser ne retire rien à l’alimentation et ne demande aucune terre supplémentaire.
        </p>
      </div>

      {/* Comparison table */}
      <div className="mt-12">
        <h3 className="font-display font-semibold text-xl leading-[26px] text-ink">Comparaison entre résidus agricoles</h3>
        <p className="text-sm leading-5 text-ink-muted mt-1.5">
          Trois résidus, trois cultures, un même usage possible : la vaisselle compostable.
        </p>

        <div className="mt-5 hidden overflow-hidden rounded-lg border border-line bg-surface min-[830px]:block">
          <table className="w-full table-fixed border-separate border-spacing-0 text-sm leading-5">
            <thead>
              <tr>
                <th scope="col" className={`${CELL_CLASS} w-[22%] bg-ground font-display text-base font-semibold`}>Critère</th>
                {COLUMNS.map((column, i) => (
                  <th
                    key={column.name}
                    scope="col"
                    className={`${CELL_CLASS} font-display text-base font-semibold ${i === HIGHLIGHT_COLUMN ? 'bg-husk text-ink' : 'bg-ground'}`}
                  >
                    {column.name}
                    <small className={`mt-0.5 block font-body text-xs font-normal ${i === HIGHLIGHT_COLUMN ? 'text-ink' : 'text-ink-muted'}`}>
                      {column.detail}
                    </small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, rowIndex) => {
                const lastRow = rowIndex === ROWS.length - 1 ? 'border-b-0' : '';

                return (
                  <tr key={row.criterion}>
                    <th scope="row" className={`${CELL_CLASS} ${lastRow} w-[22%] font-mono-brand font-medium text-xs tracking-[0.06em] uppercase text-ink-muted`}>
                      {row.criterion}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td key={COLUMNS[i].name} className={`${CELL_CLASS} ${lastRow} ${i === HIGHLIGHT_COLUMN ? 'bg-husk-soft' : ''}`}>
                        <span className="flex min-h-[22px] flex-wrap items-center gap-x-2 gap-y-1">
                          {cell.tag && (
                            <span className={`${TAG_TONES[cell.tag.tone]} shrink-0 rounded-full px-2 py-0.5 font-mono-brand text-xs leading-4`}>
                              {cell.tag.label}
                            </span>
                          )}
                          {cell.text && <span className="min-w-0 break-words">{cell.text}</span>}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 min-[830px]:hidden">
          {ROWS.map((row) => (
            <section key={row.criterion} className="border-b border-line pb-3 last:border-0">
              <h4 className="font-mono-brand text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted m-0 mb-2">
                {row.criterion}
              </h4>
              <dl className="m-0 grid gap-1.5">
                {row.cells.map((cell, i) => (
                  <div
                    key={COLUMNS[i].name}
                    className={`grid min-w-0 grid-cols-[minmax(78px,0.7fr)_minmax(0,1.5fr)] items-start gap-2 rounded-md px-2.5 py-2 ${i === HIGHLIGHT_COLUMN ? 'bg-husk-soft' : 'bg-surface'}`}
                  >
                    <dt className={`min-w-0 break-words text-[13px] font-semibold leading-5 ${i === HIGHLIGHT_COLUMN ? 'text-ink' : 'text-ink-muted'}`}>
                      {COLUMNS[i].name}
                    </dt>
                    <dd className="m-0 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5 text-ink">
                      {cell.tag && (
                        <span className={`${TAG_TONES[cell.tag.tone]} shrink-0 rounded-full px-2 py-0.5 font-mono-brand text-[11px] leading-4`}>
                          {cell.tag.label}
                        </span>
                      )}
                      {cell.text && <span className="min-w-0 break-words">{cell.text}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>

      {/* Why local */}
      <div className="mt-12">
        <p className={LABEL_CLASS}>Face à la bagasse importée</p>
        <h3 className="font-display font-semibold text-[clamp(22px,2.6vw,28px)] leading-[1.2] text-ink mt-2 max-w-[760px]">
          Pourquoi une vaisselle locale en coque de riz ?
        </h3>
        <div className="mt-6 grid grid-cols-1 min-[900px]:grid-cols-3 gap-4">
          {LOCAL_REASONS.map((reason, i) => (
            <article key={reason.title} className="bg-ground border border-line rounded-[10px] p-6">
              <p className="font-mono-brand text-sm text-husk-text">{String(i + 1).padStart(2, '0')}</p>
              <h4 className="font-display font-semibold text-xl leading-[26px] text-ink mt-2">{reason.title}</h4>
              <p className="text-[15px] leading-[22px] text-ink-muted mt-2">{reason.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
