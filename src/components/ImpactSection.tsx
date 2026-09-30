import SectionLabel from './SectionLabel';

const TARGETS = [
  { value: '200', unit: 't', label: 'de coques valorisées / an', note: 'Objectif pilote' },
  { value: '20', label: 'emplois créés d’ici M18', note: 'Objectif pilote' },
  { value: '40%', label: 'de femmes en production et qualité', note: 'Objectif' },
];

const PILLARS = [
  {
    title: 'Matière locale',
    desc: 'Résidus agricoles ivoiriens récupérés sans créer de nouvelle filière ni concurrencer l’alimentation.',
    rotation: -15,
  },
  {
    title: 'Ancré en CI',
    desc: 'Coques de riz + amidon de manioc ivoiriens. Production à Abidjan, marché local et régional.',
    rotation: 0,
  },
  {
    title: 'Traçable',
    desc: 'Origine, production et impact documentés. Traçabilité digitale en projet.',
    rotation: 15,
  },
];

export default function ImpactSection() {
  return (
    <section id="impact" className="bg-paddy-deep py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="flex justify-between items-start gap-4 mb-6">
          <div>
            <SectionLabel dark>IMPACT</SectionLabel>
            <h2 className="font-display text-title font-bold text-on-paddy m-0">
              Ce que chaque coque crée.
            </h2>
          </div>
          <span className="font-mono-brand bg-husk-soft text-husk-text text-[11px] font-medium px-2 py-0.5 rounded tracking-[0.06em] uppercase shrink-0">Objectif</span>
        </div>

        {/* On phones each target is a compact row (figure left, caption right); from md up it becomes a column. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] mb-3 rounded-lg overflow-hidden">
          {TARGETS.map((target, i) => (
            <div key={target.label} className={`bg-white/5 p-4 sm:p-5 lg:p-6 flex items-center gap-4 md:block ${i < TARGETS.length - 1 ? 'md:border-r border-white/10' : ''}`}>
              <div className="flex items-baseline gap-1.5 md:mb-2 w-[104px] shrink-0 md:w-auto">
                <span className="font-mono-brand text-[36px] md:text-[48px] font-medium text-husk leading-none">{target.value}</span>
                {target.unit && <span className="font-mono-brand text-[20px] md:text-[24px] text-husk opacity-70">{target.unit}</span>}
              </div>
              <div>
                <p className="text-[15px] md:text-base text-on-paddy font-medium m-0 mb-1 md:mb-1.5 leading-[21px] md:leading-[22px]">{target.label}</p>
                <p className="font-mono-brand text-[11px] text-white/40 m-0 tracking-[0.05em] uppercase">{target.note}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="bg-white/5 border border-white/10 rounded-lg p-4 sm:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <svg width="32" height="20" viewBox="0 0 32 20" fill="none" aria-hidden="true" className="shrink-0">
                  <ellipse cx="16" cy="10" rx="12" ry="8" transform={`rotate(${pillar.rotation} 16 10)`} fill="var(--color-husk)" opacity="0.7" />
                  <ellipse cx="16" cy="10" rx="7" ry="5" transform={`rotate(${pillar.rotation} 16 10)`} fill="var(--color-husk-deep)" opacity="0.4" />
                </svg>
                <h3 className="font-display text-base font-semibold text-on-paddy m-0">{pillar.title}</h3>
              </div>
              <p className="text-sm text-white/65 leading-5 m-0">{pillar.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
