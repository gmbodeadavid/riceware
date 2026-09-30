import Image from 'next/image';
import SectionLabel from './SectionLabel';
import LiveCounters from './LiveCounters';

export default function HeroSection() {
  return (
    <section className="bg-ground pt-8 sm:pt-10 pb-0">
      <div className="max-w-page mx-auto px-5 sm:px-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_420px] gap-6 lg:gap-10 items-center min-h-[420px]">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col gap-5">
          <SectionLabel>ABIDJAN, CÔTE D’IVOIRE · BIOMATÉRIAUX</SectionLabel>

          <h1 className="font-display text-[32px] leading-[38px] min-[360px]:text-[38px] min-[360px]:leading-[44px] sm:text-[50px] sm:leading-[58px] font-bold text-ink m-0">
            Des <span className="bg-husk text-ink px-2 rounded whitespace-nowrap">coques de riz</span><br/>
            aux assiettes compostables.
          </h1>

          <p className="text-[16px] sm:text-[17px] text-ink-muted leading-[26px] m-0 max-w-[500px]">
            RiceWare CI transforme un déchet agricole ivoirien en vaisselle végétale, locale et compostable pour remplacer le plastique jetable.
          </p>

          <div className="flex pt-1">
            <a
              href="#procede"
              className="inline-flex items-center justify-center gap-1.5 text-[15px] text-paddy font-semibold hover:text-paddy-deep transition-colors"
            >
              Voir le procédé
              <span className="text-husk-text">↓</span>
            </a>
          </div>

        </div>

        {/* ── Right: Illustration ── */}
        <div className="hidden lg:flex items-end justify-center h-full -mb-4">
          <Image
            src="/rice-hero.png"
            alt="Épi de riz, coques dorées, vaisselle compostable et couverts végétaux"
            width={460}
            height={460}
            className="w-full max-w-[400px] xl:max-w-[460px] object-contain"
            preload
          />
        </div>

      </div>

      {/* Live counter bar */}
      <div className="bg-paddy-deep text-on-paddy px-5 sm:px-8 py-3.5 mt-6">
        <div className="max-w-page mx-auto flex flex-wrap gap-x-10 gap-y-1.5 items-center justify-center text-center">
          <LiveCounters />
        </div>
      </div>
    </section>
  );
}
