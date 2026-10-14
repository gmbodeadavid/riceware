import SectionLabel from './SectionLabel';

export default function ProcessSection() {
  return (
    <section id="procede" className="bg-paddy-deep py-section text-on-paddy">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="rounded-xl border border-husk/20 bg-surface bg-[radial-gradient(var(--color-husk-soft)_0.7px,transparent_0.7px)] bg-size-[24px_24px] p-5 shadow-xl sm:rounded-2xl sm:p-7 lg:p-8">
          <header className="mb-5 flex flex-col gap-2 border-b border-line/70 pb-4">
            <div>
              <SectionLabel>LE PROCÉDÉ</SectionLabel>
              <h2 className="m-0 max-w-[560px] font-display text-title font-bold text-ink">
                De la rizerie au produit fini.
              </h2>
            </div>
          </header>

          {/* Viewer 3D interactif agrandi pour laisser la scène respirer sous les commandes. */}
          <div className="relative h-[min(68dvh,760px)] min-h-[360px] w-full overflow-hidden rounded-xl border border-line bg-ground shadow-inner sm:min-h-[500px] lg:min-h-[560px]">
            <iframe
              src="/process-3d.html"
              title="Process de fabrication RiceWare CI — vue 3D interactive"
              className="w-full h-full border-0 block"
              loading="lazy"
              allow="fullscreen"
            />
          </div>

        </div>
      </div>
    </section>
  );
}
