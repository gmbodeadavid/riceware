import SectionLabel from './SectionLabel';
import Image from 'next/image';
import NoraPhoto from '../../Nora.jpg';
import MadePhoto from '../../Madé.png';

// Single source for the bar and its legend: shares must add up to 100.
const FUND_ALLOCATION = [
  { share: 40, label: 'Équipement pilote', barClass: 'bg-paddy text-on-paddy', dotClass: 'bg-paddy' },
  { share: 20, label: 'R&D + certifications', barClass: 'bg-husk text-ink', dotClass: 'bg-husk' },
  { share: 20, label: 'Fonds de roulement', barClass: 'bg-grain text-ink', dotClass: 'bg-grain' },
  { share: 10, label: 'Équipe clé', barClass: 'bg-ink text-surface', dotClass: 'bg-ink' },
  { share: 10, label: 'Ventes & marketing', barClass: 'bg-husk-deep text-surface', dotClass: 'bg-husk-deep' },
];

const CARD_CLASS = 'bg-surface border border-line rounded-[12px] p-5 sm:p-6 flex flex-col items-center gap-4';
const PHOTO_CLASS = 'size-28 sm:size-36 lg:size-40 shrink-0 rounded-lg object-cover';

export default function TeamFinanceSection() {
  return (
    <section id="equipe" className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">

        <div className="mb-8">
          <SectionLabel>ÉQUIPE & FINANCEMENT</SectionLabel>
          <h2 className="font-display text-title font-bold text-ink m-0">
            L’équipe et les partenaires que nous cherchons.
          </h2>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-10 lg:mb-12">

          {/* Made Bodea David GBONGUE */}
          <div className={CARD_CLASS}>
            <Image src={MadePhoto} alt="Portrait de Made Bodea David GBONGUE" className={PHOTO_CLASS} />
            <div>
              <a href="https://www.linkedin.com/in/gbongue-made-bodea-david" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-paddy underline underline-offset-4 hover:text-paddy-deep">
                LinkedIn
              </a>
            </div>
          </div>

          {/* Daphné Amani Nora Koffi */}
          <div className={CARD_CLASS}>
            <Image src={NoraPhoto} alt="Portrait de Daphné Amani Nora Koffi" className={PHOTO_CLASS} />
            <div>
              <a href="https://www.linkedin.com/in/daphn%C3%A9-koffi-62a76b280/" target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-paddy underline underline-offset-4 hover:text-paddy-deep">
                LinkedIn
              </a>
            </div>
          </div>

        </div>

        {/* Finance Section */}
        <div className="mb-10 lg:mb-12">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <h3 className="font-display text-xl font-bold text-ink m-0">Utilisation des fonds</h3>
            <span className="font-mono-brand bg-husk-soft text-husk-text text-[11px] font-semibold px-2.5 py-1 rounded tracking-[0.08em] uppercase border border-husk/30">Allocation indicative</span>
          </div>

          <div className="flex h-10 rounded-lg overflow-hidden w-full mb-4 font-mono-brand text-xs font-medium">
            {FUND_ALLOCATION.map((item) => (
              <div key={item.label} className={`${item.barClass} flex items-center justify-center`} style={{ width: `${item.share}%` }}>{item.share}%</div>
            ))}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono-brand text-[12px] text-ink-muted">
            {FUND_ALLOCATION.map((item) => (
              <div key={item.label} className="flex items-center gap-2"><span className={`w-3 h-3 rounded-sm ${item.dotClass}`}></span> {item.share}% - {item.label}</div>
            ))}
          </div>
        </div>

        {/* CTA Banner */}
        <div id="contact" className="bg-paddy-mid rounded-[16px] p-6 sm:p-8 lg:p-10 text-on-paddy flex flex-col lg:flex-row gap-8 lg:gap-12 lg:items-center justify-between">
          <div className="flex-1">
            <p className="font-mono-brand text-[11px] text-paddy-soft tracking-[0.08em] uppercase font-semibold mb-3 m-0">Appel aux partenaires</p>
            <h2 className="font-display text-[22px] sm:text-[26px] lg:text-[30px] leading-tight font-bold mb-6">
              “Nous cherchons des partenaires industriels, commerciaux et financiers pour lancer l’atelier pilote.”
            </h2>

          </div>

        </div>

      </div>
    </section>
  );
}
