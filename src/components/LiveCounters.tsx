'use client';

import { useEffect, useState } from 'react';

const SECONDS_PER_DAY = 24 * 60 * 60;

// Average rates derived from the figures shown in ProblemSection.
const HUSK_KG_PER_SECOND = 476_000_000 / (365 * SECONDS_PER_DAY); // ≈ 476,000 t of husks per year
const PLASTIC_KG_PER_SECOND = 280_000 / SECONDS_PER_DAY; // 280 t of plastic waste per day

const formatKg = (kg: number) => Math.floor(kg).toLocaleString('fr-FR');

export default function LiveCounters() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      setElapsedSeconds((performance.now() - start) / 1000);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <span className="font-mono-brand text-sm text-husk font-medium tabular-nums">
        {formatKg(elapsedSeconds * HUSK_KG_PER_SECOND)} kg de coques générées en Côte d’Ivoire
      </span>
      <span className="hidden md:inline text-on-paddy/30 text-base">·</span>
      <span className="font-mono-brand text-sm text-on-paddy/60 font-medium tabular-nums">
        {formatKg(elapsedSeconds * PLASTIC_KG_PER_SECOND)} kg de déchets plastiques produits à Abidjan
      </span>
    </>
  );
}
