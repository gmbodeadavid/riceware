import Image from 'next/image';
import LiveCounters from './LiveCounters';

export default function HeroSection() {
  return (
    <section className="bg-ground pt-8 sm:pt-10 pb-0">
      <div className="max-w-page mx-auto grid min-h-0 grid-cols-1 items-center gap-6 px-5 sm:px-8 lg:min-h-[420px] lg:grid-cols-[1fr_360px] lg:gap-10 xl:grid-cols-[1fr_420px]">

        {/* ── Left: Copy ── */}
        <div className="flex flex-col gap-5">
          <h1 className="font-display text-[32px] leading-[38px] min-[360px]:text-[38px] min-[360px]:leading-[44px] sm:text-[50px] sm:leading-[58px] font-bold text-ink m-0">
            <span className="bg-husk text-ink px-2 rounded">Coque et paille de riz</span><br/>
            pour une vaisselle compostable.
          </h1>

          <p className="text-[16px] sm:text-[17px] text-ink-muted leading-[26px] m-0 max-w-[500px]">
            RiceWare CI valorise la coque et la paille de riz pour développer une vaisselle végétale et locale, alternative au plastique jetable.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <a href="#produit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-paddy px-5 py-2.5 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep">
              Découvrir nos produits
            </a>
          </div>

        </div>

        {/* ── Right: Illustration ── */}
        <div className="mx-auto flex w-full max-w-[280px] items-end justify-center sm:max-w-[320px] lg:-mb-4 lg:h-full lg:max-w-none">
          <Image
            src="/rice-hero.png"
            alt="Épi de riz, coques et paille dorées, vaisselle compostable et couverts végétaux"
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
