import SectionLabel from './SectionLabel';

const IMPACT_TARGETS = [
  { indicator: 'Coques valorisées', target: '200 tonnes / an' },
  { indicator: 'Emplois créés', target: '20 emplois directs et indirects d\'ici M18' },
  { indicator: 'Rizeries partenaires', target: '3–5 rizeries mobilisées' },
];

export default function ImpactSection() {
  return (
    <section id="impact" className="bg-paddy py-section text-on-paddy">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="mb-8">
          <SectionLabel dark>IMPACT VISÉ</SectionLabel>
          <h2 className="font-display text-title font-bold text-on-paddy m-0">
            Une ambition locale, des objectifs mesurés.
          </h2>
        </div>

        <div className="overflow-hidden rounded-lg bg-white/15 ring-1 ring-white/10">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-white/10">
                <th scope="col" className="px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-white/65 m-0">Indicateur</th>
                <th scope="col" className="px-5 py-3 font-mono-brand text-[10px] uppercase tracking-[0.08em] text-white/65 m-0">Cible</th>
              </tr>
            </thead>
            <tbody>
              {IMPACT_TARGETS.map((target) => (
                <tr key={target.indicator} className="border-t border-white/10">
                  <td className="px-5 py-4 font-display text-base font-semibold text-on-paddy m-0 align-top">{target.indicator}</td>
                  <td className="px-5 py-4 font-display text-[32px] font-bold text-husk m-0 align-top sm:text-[38px]">{target.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
