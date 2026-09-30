import SectionLabel from './SectionLabel';
import CountUp from './CountUp';

type Tone = 'husk' | 'plastic';

type Stat = {
  caption: string;
  value: number;
  decimals?: number;
  unit: string;
  note?: string;
};

const FLOWS: { tone: Tone; tag: string; subTag: string; label: string; stats: Stat[] }[] = [
  {
    tone: 'husk',
    tag: 'Ressource',
    subTag: 'Coques de riz',
    label: 'Ressource agricole issue de la production de riz',
    stats: [
      {
        caption: 'La Côte d’Ivoire produit chaque année une quantité importante de riz paddy.',
        value: 2.38,
        decimals: 2,
        unit: 'millions de tonnes en 2024',
      },
      {
        caption: 'Le décorticage du riz génère des coques qui peuvent être valorisées.',
        value: 476000,
        unit: 'tonnes de coques par an',
        note: 'Les coques représentent 20 % de la masse du paddy.',
      },
    ],
  },
  {
    tone: 'plastic',
    tag: 'Problèmes',
    subTag: 'Déchets plastiques',
    label: 'Déchets plastiques et besoin d’alternatives à Abidjan',
    stats: [
      {
        caption: 'Abidjan produit chaque jour une quantité importante de déchets plastiques.',
        value: 280,
        unit: 'tonnes par jour',
      },
      {
        caption: 'Cette pression crée un besoin d’alternatives locales au plastique.',
        value: 102200,
        unit: 'tonnes de déchets plastiques par an',
        note: 'Calcul basé sur 280 tonnes produites chaque jour pendant 365 jours.',
      },
    ],
  },
];

const TONES: Record<Tone, { card: string; tag: string; subTag: string; stat: string; caption: string; figure: string; unit: string; note: string }> = {
  husk: {
    card: 'bg-husk-soft',
    tag: 'bg-husk text-ink',
    subTag: 'text-husk-text',
    stat: 'border-husk-text/20',
    caption: 'text-ink-muted',
    figure: 'text-husk-text',
    unit: '',
    note: 'text-husk-text',
  },
  plastic: {
    card: 'bg-ink text-on-paddy',
    tag: 'bg-on-paddy/12 text-on-paddy',
    subTag: 'text-on-paddy/60',
    stat: 'border-on-paddy/12',
    caption: 'text-on-paddy/70',
    figure: 'text-on-paddy',
    unit: 'opacity-85',
    note: 'text-husk',
  },
};

const HUSK_OFFSETS = [0, 26, 52, 78, 104];

function HuskRow() {
  return (
    <svg className="hidden min-[900px]:block" width="120" height="30" viewBox="0 0 120 30" aria-hidden="true">
      {HUSK_OFFSETS.map((x, i) => (
        <g key={x} transform={i === HUSK_OFFSETS.length - 1 ? `translate(${x}) rotate(18 8 15)` : `translate(${x})`}>
          <path d="M8 28C3 20 5 8 13 2c3 8 2 20-5 26z" fill="var(--color-husk)" />
          <path d="M8 28c2-9 3-17 5-26 3 8 2 20-5 26z" fill="var(--color-husk-deep)" />
        </g>
      ))}
    </svg>
  );
}

export default function ProblemSection() {
  return (
    <section id="probleme" className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="text-center mb-8 lg:mb-10">
          <SectionLabel>LE PROBLÈME</SectionLabel>
          <h2 className="font-display text-title font-bold text-ink m-0">
            Deux flux qui ne se rencontrent pas.
          </h2>
        </div>

        {/* From 900px up the two cards share their rows (subgrid), so headers and stats line up across both.
            Captions and notes are sized (with the 32px side padding) so each sentence fits on one line at full desktop width. */}
        <div className="grid grid-cols-1 min-[900px]:grid-cols-2 min-[900px]:grid-rows-[auto_auto_auto] rounded-[20px] overflow-hidden">
          {FLOWS.map((flow) => {
            const tone = TONES[flow.tone];

            return (
              <article
                key={flow.tag}
                aria-label={flow.label}
                className={`${tone.card} grid px-6 py-8 min-[900px]:row-span-3 min-[900px]:grid-rows-subgrid min-[900px]:px-8 min-[900px]:pt-10 min-[900px]:pb-12`}
              >
                <div className="flex items-center justify-between min-h-9 pb-9">
                  <div className="flex items-center gap-3 font-mono-brand text-xs leading-4 tracking-[0.08em] uppercase">
                    <span className={`${tone.tag} px-3 py-1.5 rounded`}>{flow.tag}</span>
                    <span className={tone.subTag}>{flow.subTag}</span>
                  </div>
                  {flow.tone === 'husk' && <HuskRow />}
                </div>

                {flow.stats.map((stat) => (
                  <div key={stat.unit} className={`${tone.stat} border-t py-7 last:pb-0`}>
                    <p className={`${tone.caption} text-sm leading-[22px]`}>{stat.caption}</p>
                    <p className={`${tone.figure} font-display flex flex-col gap-1.5 mt-3.5`}>
                      <span className="font-bold text-[clamp(48px,5.6vw,76px)] leading-[0.95] tracking-[-0.02em] whitespace-nowrap">
                        <CountUp value={stat.value} decimals={stat.decimals} />
                      </span>
                      <span className={`${tone.unit} font-semibold text-[clamp(18px,1.8vw,22px)] leading-[1.2]`}>{stat.unit}</span>
                    </p>
                    {stat.note && (
                      <p className={`${tone.note} font-mono-brand text-xs leading-5 mt-5`}>{stat.note}</p>
                    )}
                  </div>
                ))}
              </article>
            );
          })}
        </div>

        <div className="mt-6 bg-surface border border-ink/12 rounded-[10px] px-[22px] py-5 min-[900px]:px-8 min-[900px]:py-6 text-center">
          <p className="font-display font-semibold text-[17px] sm:text-xl leading-[1.35] tracking-[-0.01em] text-ink max-w-[900px] mx-auto">
            <strong className="font-bold text-husk-text">RiceWare</strong> transforme les coques de riz en alternatives locales aux plastiques à usage unique.
          </p>
        </div>
      </div>
    </section>
  );
}
