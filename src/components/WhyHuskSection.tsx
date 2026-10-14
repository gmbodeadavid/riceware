import PaddyAnatomy from './PaddyAnatomy';

export default function WhyHuskSection() {
  return (
    <section id="pourquoi-la-coque" className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <h2 className="font-display text-title font-bold text-ink mb-8 max-w-[600px]">
          Anatomie d’un grain de paddy.
        </h2>

        <div className="mb-8">
          <PaddyAnatomy />
        </div>

        {/* Sized so the whole quote fits on one line at full desktop width (xl); check before lengthening it. */}
        <div className="bg-husk-soft border-2 border-husk rounded-[10px] p-5 text-center">
          <p className="font-display text-base xl:text-[15px] font-semibold text-paddy m-0 leading-6">
            RiceWare valorise la coque et la paille de riz pour développer des alternatives locales aux plastiques à usage unique.
          </p>
        </div>

      </div>
    </section>
  );
}
