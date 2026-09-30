import SectionLabel from './SectionLabel';
import PaddyAnatomy from './PaddyAnatomy';
import ResidueComparison from './ResidueComparison';

export default function WhyHuskSection() {
  return (
    <section id="pourquoi-la-coque" className="bg-surface py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <SectionLabel>POURQUOI LA COQUE</SectionLabel>
        <h2 className="font-display text-title font-bold text-ink mb-8 max-w-[600px]">
          Anatomie d’un grain de paddy.
        </h2>

        <div className="mb-8">
          <PaddyAnatomy />
        </div>

        {/* Sized so the whole quote fits on one line at full desktop width (xl); check before lengthening it. */}
        <div className="bg-husk-soft border-2 border-husk rounded-[10px] p-5">
          <p className="font-display text-base xl:text-[15px] font-semibold text-ink m-0 leading-6">
            “Nous ne créons pas une matière première : nous créons un débouché pour une matière qui existe déjà, car nous ne récupérons que la coque de riz.”
          </p>
        </div>

        <div className="mt-12 pt-12 border-t border-line">
          <ResidueComparison />
        </div>
      </div>
    </section>
  );
}
