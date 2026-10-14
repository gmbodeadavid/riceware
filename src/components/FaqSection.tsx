import SectionLabel from './SectionLabel';

const QUESTIONS = [
  {
    question: 'Vos produits sont-ils biodégradables et compostables ?',
    answer: 'Oui, notre vaisselle est 100 % végétale, biodégradable et compostable.',
  },
  {
    question: 'Quel est le prix des produits ?',
    answer: 'Nos tarifs sont dégressifs selon les volumes commandés.',
  },
  {
    question: 'Quels sont les délais et les zones de livraison ?',
    answer: 'Livraison sous 48h à 72h à Abidjan et partout en Côte d’Ivoire.',
  },
  {
    question: 'Proposez-vous des produits personnalisés ?',
    answer: 'Oui, personnalisation sur mesure (formats, gravures, finitions) sur devis.',
  },
  {
    question: 'Comment demander un lot pilote ?',
    answer: 'Contactez notre équipe pour recevoir des échantillons ou un lot test.',
  },
];

export default function FAQSection() {
  return (
    <section className="bg-ground py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <SectionLabel>FAQ</SectionLabel>
        <h2 className="mb-8 font-display text-title font-bold text-ink m-0">Questions fréquentes</h2>
        <div className="border-t border-line">
          {QUESTIONS.map((item) => (
            <details key={item.question} className="group border-b border-line py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-semibold text-ink marker:hidden sm:text-lg">
                {item.question}
                <span aria-hidden="true" className="font-body text-xl font-normal text-paddy transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted m-0">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
