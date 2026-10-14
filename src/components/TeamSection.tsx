import Image from 'next/image';
import SectionLabel from './SectionLabel';
import NoraPhoto from '../../Nora.jpg';
import MadePhoto from '../../Madé.png';

const TEAM = [
  {
    name: 'David GBONGUE',
    role: 'Fondateur',
    bio: [
      'RiceWare CI est porté par David GBONGUE.',
      'Développeur full-stack et entrepreneur technologique, et lauréat du KOICA Youth Leaders Program, il combine une expertise technique et une vision stratégique notamment le modèle économique, les partenariats rizeries, roadmap de déploiement.',
      'Titulaire d\'une licence MIAGE et engagé dans l\'écologie, il met son profil au service de la valorisation des déchets agricoles ivoiriens et de la réduction des plastiques à usage unique.',
    ],
    photo: MadePhoto,
    alt: 'Portrait de David GBONGUE',
    linkedIn: 'https://www.linkedin.com/in/gbongue-made-bodea-david',
  },
  {
    name: 'Daphné KOFFI',
    role: 'Co-fondatrice',
    bio: [
      'RiceWare CI est porté par Daphné KOFFI.',
      'Actuaire spécialisée en risque financier, elle met son expertise en analyse des risques, en évaluation financière et en prise de décision stratégique au service de RiceWare CI. Elle contribue à structurer son modèle économique, à en évaluer la viabilité et à accompagner son développement.',
      'Engagée dans une initiative de valorisation des résidus agricoles ivoiriens, elle participe à un modèle entrepreneurial alliant performance économique, innovation locale et réduction des plastiques à usage unique.',
    ],
    photo: NoraPhoto,
    alt: 'Portrait de Daphné KOFFI',
    linkedIn: 'https://www.linkedin.com/in/daphn%C3%A9-koffi-62a76b280/',
  },
];

export default function TeamSection() {
  return (
    <section id="equipe" className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>À PROPOS</SectionLabel>
            <h2 className="font-display text-title font-bold text-ink m-0">Notre équipe</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {TEAM.map((member) => (
            <article key={member.name} className="grid overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-[minmax(150px,0.7fr)_minmax(0,1fr)]">
              <div className="relative min-h-[220px] bg-ground sm:min-h-[260px]">
                <Image src={member.photo} alt={member.alt} fill sizes="(max-width: 768px) 100vw, 30vw" className="object-cover" />
              </div>
              <div className="flex flex-col items-start justify-center p-5 sm:p-6">
                <h3 className="font-display text-xl font-semibold text-ink m-0">{member.name}</h3>
                <p className="mt-2 font-mono-brand text-[11px] uppercase tracking-[0.08em] text-paddy m-0">{member.role}</p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-ink-muted">
                  {member.bio.map((paragraph, i) => (
                    <p key={i} className="m-0">{paragraph}</p>
                  ))}
                </div>
                <a href={member.linkedIn} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-paddy underline underline-offset-4 transition-colors hover:text-paddy-deep">
                  LinkedIn <span aria-hidden="true" className="ml-1">↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
