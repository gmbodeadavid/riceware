import SectionLabel from './SectionLabel';
import ProductCarousel from './ProductCarousel';

const PROOFS = [
  'Résistance mécanique',
  'Résistance à l’eau',
  'Résistance à la chaleur',
  'Contact alimentaire',
  'Biodégradabilité / compostabilité',
];

export default function ProductSection() {
  return (
    <section id="produit" className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <SectionLabel>LE PRODUIT</SectionLabel>
        <h2 className="font-display text-title font-bold text-ink mb-8">
          Une recette ouverte.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 items-stretch">

          <ProductCarousel />

          {/* Evidence register: its rows share the height left by the carousel next to it. */}
          <div className="bg-surface border border-line rounded-[10px] p-5 sm:px-6 flex flex-col">
            <div className="flex flex-wrap justify-between items-start gap-x-4 gap-y-1 mb-2">
              <h3 className="font-display text-base font-semibold text-ink m-0">Registre des preuves</h3>
              <span className="text-xs font-mono-brand text-ink-muted italic">“Aucune allégation sans preuve.”</span>
            </div>
            <div className="flex flex-col flex-1">

              {PROOFS.map((item, i) => (
                <div key={item} className={`flex-1 flex justify-between items-center gap-4 py-2 ${i !== 0 ? 'border-t border-line' : ''}`}>
                  <span className="text-sm text-ink font-medium">{item}</span>
                  <span className="font-mono-brand bg-grain text-ink-muted text-[11px] font-medium px-2 py-0.5 rounded tracking-[0.06em] uppercase whitespace-nowrap">À tester</span>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
