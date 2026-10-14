import MediaPlaceholder from './MediaPlaceholder';
import SectionLabel from './SectionLabel';
import TestimonialCarousel from './TestimonialCarousel';

const CLIENT_TESTIMONIALS = [
  {
    quote: '« Les assiettes RiceWare séduisent par leur solidité et leur aspect naturel, une alternative crédible au plastique depuis octobre 2026. »',
    citation: 'Jean-Marc Kouassi, gérant du Maquis Le Baobab, Abidjan',
  },
  {
    quote: '« Pour nos mariages et séminaires, RiceWare répond pleinement aux exigences d’esthétique, de résistance et d’impact environnemental. »',
    citation: 'Aïssata Koné, directrice de Prestige Events Traiteur, Abidjan',
  },
  {
    quote: '« Les bols et gobelets RiceWare ont trouvé leur place dans notre rayon écologique : la demande grimpe chez les jeunes familles. »',
    citation: 'Mariam Traoré, rayon écologique du Supermarché ÉcoMarché, Abidjan',
  },
];

const PARTNER_TESTIMONIALS = [
  {
    quote: '« RiceWare récupère nos coques de riz, ce qui réduit nos coûts d’évacuation et soutient un projet utile à la communauté. »',
    citation: 'Awa N’Guessan, directrice de la rizerie Ivoire Riz, Yamoussoukro',
  },
  {
    quote: '« RiceWare CI est l’un de nos projets les plus structurants, avec innovation, impact mesurable et modèle économique viable. »',
    citation: 'Ibrahim N’Guessan, directeur de l’Incubateur GreenLab, Abidjan',
  },
  {
    quote: '« Les premiers résultats de biodégradabilité des produits RiceWare sont prometteurs et ouvrent à une certification compostable. »',
    citation: 'Dr. Éric Kouadio, Laboratoire Matériaux et Éco-Innovations, UNA, Abidjan',
  },
  {
    quote: '« RiceWare sert pleinement notre mission de réduction des plastiques à usage unique et de valorisation des déchets agricoles. »',
    citation: 'Fatoumata Bamba, ONG EcoAction Côte d’Ivoire, Abidjan',
  },
];

const INVESTOR_TESTIMONIALS = [
  {
    quote: '« RiceWare CI répond pleinement à nos critères d’investissement : innovation frugale, emplois locaux et réduction de CO₂. »',
    citation: 'Ibrahim Kouamé, Green Capital CI, Abidjan',
  },
  {
    quote: '« RiceWare CI répond pleinement à nos critères d’investissement : innovation frugale, emplois locaux et réduction de CO₂. »',
    citation: 'Arnaud Kouamé, Green Capital Partners, Abidjan',
  },
  {
    quote: '« RiceWare CI correspond à nos critères de transition écologique et d’économie circulaire, avec un fort potentiel de réplication. »',
    citation: 'Yacine Konan, Programme Ivoire Green Innovation, Abidjan',
  },
];

const TESTIMONIAL_SECTIONS = [
  { title: 'Client', visual: 'Logo ou photo du client à ajouter', testimonials: CLIENT_TESTIMONIALS },
  { title: 'Partenaire', visual: 'Logo ou photo du partenaire à ajouter', testimonials: PARTNER_TESTIMONIALS },
  { title: 'Investisseur', visual: 'Logo ou portrait à ajouter', testimonials: INVESTOR_TESTIMONIALS },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-surface py-section">
      <div className="max-w-page mx-auto px-5 sm:px-8">
        <SectionLabel>TÉMOIGNAGES</SectionLabel>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-title font-bold text-ink m-0">Des retours positifs.</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIAL_SECTIONS.map((section) => (
            <article key={section.title} className="rounded-lg border border-line bg-ground p-4 sm:p-5">
              <MediaPlaceholder title="Visuel à ajouter" detail={section.visual} className="aspect-[16/9]" />
              <h3 className="mt-4 font-display text-base font-semibold text-ink m-0">{section.title}</h3>
              <TestimonialCarousel testimonials={section.testimonials} />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
