'use client';

import { useState } from 'react';
import SectionLabel from './SectionLabel';

export default function ProcessSection() {
  const steps = [
    {
      num: "01",
      title: "Collecte & inspection",
      desc: "Réception aux rizeries, pesée, contrôle de l’humidité, des impuretés et traçabilité de l’origine.",
      badge: "3–5 rizeries partenaires pilotes",
      svg: (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="16" rx="10" ry="14" transform="rotate(-30 24 16)" fill="var(--color-husk)" />
          <ellipse cx="25" cy="15" rx="6" ry="9" transform="rotate(-30 24 16)" fill="var(--color-husk-deep)" opacity="0.5" />
        </svg>
      )
    },
    {
      num: "02",
      title: "Prétraitement",
      desc: "Séchage, tamisage, broyage en poudre homogène. La coque entière devient particules.",
      badge: "Cible : humidité 8–15%",
      svg: (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
          {[0, 20, 40, 60, 80, 100].map((rot, i) => (
            <ellipse key={i} cx={8 + i*7} cy={i%2===0 ? 12 : 20} rx="3" ry="5" transform={`rotate(${rot} ${8 + i*7} ${i%2===0 ? 12 : 20})`} fill="var(--color-husk)" opacity={0.4 + i*0.1} />
          ))}
        </svg>
      )
    },
    {
      num: "03",
      title: "Liant",
      desc: "Gélatinisation d’amidon de manioc local avec eau + additifs alimentaires (acide citrique, cires naturelles).",
      badge: "Liant : amidon de manioc ivoirien",
      svg: (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
          <circle cx="24" cy="16" r="12" fill="var(--color-grain)" />
          <circle cx="24" cy="16" r="7" fill="var(--color-husk)" opacity="0.6" />
        </svg>
      )
    },
    {
      num: "04",
      title: "Moulage",
      desc: "Compression à chaud dans des moules métalliques. Chaque coque devient la forme voulue.",
      badge: "≈ 150–200 °C",
      svg: (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
          <rect x="4" y="6" width="40" height="6" rx="2" fill="var(--color-ink)" opacity="0.2" />
          <rect x="8" y="12" width="32" height="8" rx="2" fill="var(--color-husk)" opacity="0.8" />
          <rect x="4" y="20" width="40" height="6" rx="2" fill="var(--color-ink)" opacity="0.2" />
        </svg>
      )
    },
    {
      num: "05",
      title: "Finition & contrôle",
      desc: "Séchage, ébavurage, tests de résistance mécanique, étanchéité, tenue thermique. Certifications à valider.",
      badge: "5 contrôles qualité",
      svg: (
        <svg width="48" height="32" viewBox="0 0 48 32" fill="none" aria-hidden="true">
          <ellipse cx="24" cy="18" rx="20" ry="8" fill="var(--color-husk)" opacity="0.3" />
          <ellipse cx="24" cy="16" rx="18" ry="6" fill="var(--color-husk)" />
          <ellipse cx="24" cy="16" rx="12" ry="3.5" fill="var(--color-husk-deep)" opacity="0.4" />
        </svg>
      )
    }
  ];

  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="procede" className="bg-paddy-deep py-section text-on-paddy">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="rounded-xl border border-husk/20 bg-surface bg-[radial-gradient(var(--color-husk-soft)_0.7px,transparent_0.7px)] bg-size-[24px_24px] p-5 shadow-xl sm:rounded-2xl sm:p-7 lg:p-8">
          <header className="mb-6 flex flex-col gap-2 border-b border-line/70 pb-5">
            <div>
              <SectionLabel>LE PROCÉDÉ</SectionLabel>
              <h2 className="m-0 max-w-[440px] font-display text-title font-bold text-ink">
                Cinq gestes, un emballage écologique.
              </h2>
            </div>
            <div className="max-w-[520px]">
              <p className="m-0 text-sm leading-[22px] text-ink-muted">
                Procédés connus, adaptés à une matière première ivoirienne.
              </p>
            </div>
          </header>

          <div className="relative">
            <div className="pointer-events-none absolute left-[8%] right-[8%] top-6 hidden border-t border-dashed border-husk-deep/50 xl:block" aria-hidden="true" />
            <ol className="relative m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-4">
              {steps.map((step, index) => (
                <li key={step.num}>
                  <button
                    type="button"
                    onClick={() => setActiveStep(index)}
                    aria-pressed={activeStep === index}
                    className={`group flex h-full min-h-[220px] w-full flex-col justify-between gap-5 rounded-lg border bg-surface p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-husk-deep hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-husk sm:p-5 ${activeStep === index ? 'border-husk-deep shadow-[0_0_0_2px_var(--color-husk-soft),0_12px_28px_-10px_var(--color-ink-muted)]' : 'border-line'}`}
                    aria-label={`Sélectionner l’étape ${step.num} : ${step.title}`}
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <span className="font-mono-brand text-[28px] font-medium leading-none text-husk-text sm:text-[32px]">
                          {step.num}
                        </span>
                        <span className="flex size-11 items-center justify-center rounded-md border border-husk/40 bg-ground [&>svg]:max-w-full">
                          {step.svg}
                        </span>
                      </div>
                      <h3 className="mb-2 font-display text-base font-semibold leading-5 text-ink transition-colors group-hover:text-husk-text sm:text-lg">
                        {step.title}
                      </h3>
                      <p className="m-0 text-sm leading-[21px] text-ink-muted">
                        {step.desc}
                      </p>
                    </div>
                    <span className="inline-flex min-h-8 items-center gap-2 rounded-sm border border-husk/40 bg-husk-soft/70 px-2.5 py-1.5 font-mono-brand text-[11px] font-medium leading-4 text-husk-text sm:text-xs">
                      <span className={`size-1.5 shrink-0 rounded-full ${activeStep === index ? 'animate-pulse bg-paddy' : 'bg-husk-deep'}`} aria-hidden="true" />
                      {step.badge}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </div>

    </section>
  );
}
