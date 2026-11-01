'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { LuArrowLeft, LuCheck, LuMinus, LuPlus, LuTrash2 } from 'react-icons/lu';
import { PRODUCT_COLORS } from '@/lib/boutique';
import {
  CART_STORAGE_KEY,
  LAST_ORDER_STORAGE_KEY,
  ORDERS_STORAGE_KEY,
  type CartItem,
  type CheckoutCustomer,
  type DeliveryOption,
  type PaymentMethod,
  type PaymentPlan,
  type StoredOrder,
  createOrderNumber,
  getCartTotals,
  readJsonStorage,
  writeJsonStorage,
} from '@/lib/cart';

const initialCustomer: CheckoutCustomer = {
  fullName: '',
  phone: '',
  email: '',
  city: 'Abidjan',
  district: '',
  addressDetails: '',
  deliveryInstructions: '',
  channel: 'site',
};

const PAYMENT_PLANS: Array<{
  value: PaymentPlan;
  label: string;
  detail: string;
}> = [
  {
    value: 'comptant',
    label: 'Paiement comptant',
    detail: 'Le montant définitif sera confirmé par RiceWare avant la validation de votre commande.',
  },
  {
    value: 'flex',
    label: 'Paiement FLEX',
    detail: 'L’acompte et les échéances seront précisés lors du rappel par un conseiller.',
  },
];

const DELIVERY_OPTIONS: Array<{
  value: DeliveryOption;
  label: string;
  detail: string;
}> = [
  {
    value: 'standard',
    label: 'Livraison standard',
    detail: 'Les frais et modalités seront confirmés par l’équipe RiceWare.',
  },
  {
    value: 'express',
    label: 'Livraison Express (seulement Abidjan)',
    detail: 'Option proposée à Abidjan, sous réserve de confirmation.',
  },
];

const PAYMENT_METHODS: Array<{
  value: PaymentMethod;
  label: string;
  logo: string;
  /** tailwind bg color for the card when selected, matches brand */
  logoBg: string;
  /** contain or cover */
  fit: 'contain' | 'cover';
}> = [
  { value: 'wave',        label: 'Wave',         logo: '/payment/wave.png',         logoBg: 'bg-white',     fit: 'contain' },
  { value: 'orange_money',label: 'Orange Money', logo: '/payment/orange-money.png', logoBg: 'bg-white',     fit: 'contain' },
  { value: 'mtn_momo',    label: 'MTN MoMo',     logo: '/payment/mtn-momo.jpg',     logoBg: 'bg-white',     fit: 'contain' },
  { value: 'moov_money',  label: 'Moov Money',   logo: '/payment/moov-money.png',   logoBg: 'bg-white',     fit: 'contain' },
  { value: 'djamo',       label: 'Djamo',        logo: '/payment/djamo.webp',       logoBg: 'bg-white',     fit: 'contain' },
];

const DELIVERY_FEE = 2_000; // FCFA — Abidjan livraison standard

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '');
const whatsappUrl = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour RiceWare CI, j\u2019ai une question sur ma commande.")}`
  : null;

function formatFCFA(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value)) + '\u00a0FCFA';
}

export default function CheckoutClient({
  showHeader = true,
  compactLayout = false,
}: {
  showHeader?: boolean;
  compactLayout?: boolean;
}) {
  const router = useRouter();
  const containerWidthClass = compactLayout ? 'max-w-xl' : 'max-w-3xl';
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [customer, setCustomer] = useState<CheckoutCustomer>(initialCustomer);
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('comptant');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(readJsonStorage<CartItem[]>(CART_STORAGE_KEY, []));
      setIsLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.packPriceValue * item.quantity, 0),
    [items],
  );
  const hasAllPrices = subtotal > 0 && items.every((item) => item.packPriceValue > 0);
  const grandTotal = hasAllPrices ? subtotal + DELIVERY_FEE : null;

  function updateCustomer(key: keyof CheckoutCustomer, value: string) {
    setCustomer((current) => ({ ...current, [key]: value }));
  }

  function commitCart(nextItems: CartItem[]) {
    setItems(nextItems);
    writeJsonStorage(CART_STORAGE_KEY, nextItems);
  }

  function updateQuantity(itemId: string, quantity: number) {
    commitCart(items.map((item) => (
      item.id === itemId ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item
    )));
  }

  function removeItem(itemId: string) {
    commitCart(items.filter((item) => item.id !== itemId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Votre panier est vide.');
      return;
    }

    if (!customer.fullName.trim() || !customer.phone.trim() || !customer.addressDetails.trim()) {
      setError('Nom, téléphone et adresse sont obligatoires.');
      return;
    }

    const rawPhone = customer.phone.replace(/\D/g, '');
    if (!/^(01|05|07)\d{8}$/.test(rawPhone)) {
      setError('Le numéro de téléphone doit commencer par 01, 05 ou 07 et contenir exactement 10 chiffres.');
      return;
    }

    if (!paymentMethod) {
      setError('Choisissez un moyen de paiement préféré.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            fullName: customer.fullName.trim(),
            phone: `+225${rawPhone}`,
            email: customer.email.trim() || undefined,
            city: customer.city,
            district: customer.district.trim() || undefined,
            addressDetails: customer.addressDetails.trim(),
            deliveryInstructions: customer.deliveryInstructions.trim() || undefined,
            channel: 'site',
          },
          paymentPlan,
          deliveryOption,
          paymentMethod,
          items: items.map((item) => ({
            productPackId: item.packId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = (await response.json()) as { orderNumber?: string; error?: string };

      if (!response.ok) {
        setError(data.error ?? 'Une erreur est survenue. Veuillez réessayer.');
        setSubmitting(false);
        return;
      }

      const orderNumber = data.orderNumber ?? createOrderNumber();

      // Persist a local snapshot for the confirmation page
      const orderCustomer: CheckoutCustomer = { ...customer, phone: `+225 ${rawPhone}` };
      const localOrder: StoredOrder = {
        orderNumber,
        createdAt: new Date().toISOString(),
        status: 'reçue',
        paymentStatus: 'à confirmer',
        customer: orderCustomer,
        items,
        totalPacks: totals.totalPacks,
        totalArticles: totals.totalArticles,
        paymentPlan,
        deliveryOption,
        paymentMethod,
        commercialNote: "Demande enregistrée. Les prix, les modalités de paiement et la livraison restent à confirmer par RiceWare CI. Aucun paiement n\u2019a été prélevé.",
      };
      const previousOrders = readJsonStorage<StoredOrder[]>(ORDERS_STORAGE_KEY, []);
      writeJsonStorage(LAST_ORDER_STORAGE_KEY, localOrder);
      writeJsonStorage(ORDERS_STORAGE_KEY, [localOrder, ...previousOrders]);
      writeJsonStorage(CART_STORAGE_KEY, []);

      router.push(`/commande/confirmation?numero=${orderNumber}`);
    } catch {
      setError('Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.');
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className={`mx-auto ${containerWidthClass} pb-52`} aria-busy="true" aria-label="Chargement du panier">
        <div className="mb-6 h-10 w-64 animate-pulse rounded-xl bg-grain/70" />
        <div className="h-48 animate-pulse rounded-[18px] border border-line bg-surface" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={`mx-auto ${containerWidthClass} pb-12`}>
        {showHeader ? <CheckoutHeader /> : null}
        <section className="flex min-h-[60vh] flex-col items-center justify-center rounded-[18px] border border-line bg-surface px-5 py-12 text-center sm:px-8" aria-labelledby="empty-cart-title">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl border border-line bg-ground">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-ink-muted">
              <path d="M6 6h15l-2 12H7L4 3H2" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
            </svg>
          </div>
          <h2 id="empty-cart-title" className="m-0 font-display text-xl font-bold text-ink">Votre panier est vide</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
            Ajoutez des produits depuis la boutique avant de préparer votre commande.
          </p>
          <div className="mt-6">
            <Link
              href="/boutique"
              className="inline-flex items-center gap-2 rounded-full bg-paddy px-5 py-2.5 text-sm font-semibold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
            >
              Voir le catalogue
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={`mx-auto ${containerWidthClass} pb-56 sm:pb-60`}>
      {showHeader ? <CheckoutHeader /> : null}

      <form onSubmit={handleSubmit} className="grid gap-5 sm:gap-6">
        <section className="rounded-panel border border-line bg-surface p-4 sm:p-5" aria-labelledby="summary-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="summary-title" className="m-0 font-display text-xl font-bold text-ink">Récapitulatif du panier</h2>
            <div className="text-right shrink-0">
              <p className="text-xs text-ink-muted">
                {totals.totalPacks} pack{totals.totalPacks > 1 ? 's' : ''}
              </p>
              <p className="text-xs font-semibold text-paddy-deep">
                {totals.totalArticles} article{totals.totalArticles > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="mt-3 divide-y divide-line">
            {items.map((item) => {
              const colorHex = PRODUCT_COLORS.find((c) => c.id === item.productColor)?.value;
              const totalArticlesLine = item.packQuantity * item.quantity;
              return (
              <article key={item.id} className="flex gap-3 py-4 first:pt-1 last:pb-1 sm:gap-4">

                {/* ── Vignette produit ── */}
                <div className="flex-shrink-0 size-16 sm:size-[76px] overflow-hidden rounded-xl bg-ground flex items-center justify-center">
                  <Image
                    src={item.productColorImage ?? item.productImage}
                    alt={`${item.productName}, ${item.productColorLabel}`}
                    width={76}
                    height={76}
                    sizes="(min-width: 640px) 76px, 64px"
                    className="size-full object-contain p-1.5"
                  />
                </div>

                {/* ── Corps : 2 colonnes [infos gauche | prix droite] ── */}
                <div className="flex flex-1 min-w-0 justify-between gap-3">

                  {/* Colonne gauche : nom + pack + stepper */}
                  <div className="flex flex-col justify-between min-w-0 gap-2">
                    {/* Nom + pack label */}
                    <div className="min-w-0">
                      <h3 className="m-0 font-display text-sm font-semibold text-ink leading-5">{item.productName}</h3>
                      <p className="mt-0.5 text-xs leading-4 text-ink-muted">{item.packLabel}</p>
                      <p className="text-xs leading-4 text-ink-muted">{item.productFormat}</p>
                      {item.packNote ? <p className="mt-0.5 text-[11px] leading-4 text-ink-muted/70 italic">{item.packNote}</p> : null}
                    </div>

                    {/* Stepper quantité */}
                    <div className="flex h-8 w-fit items-center rounded-full border border-line bg-ground" aria-label={`Quantité : ${item.quantity}`}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label={`Diminuer la quantité de ${item.productName}`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LuMinus size={12} aria-hidden="true" />
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums text-ink px-1" aria-live="polite">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= 99}
                        aria-label={`Augmenter la quantité de ${item.productName}`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <LuPlus size={12} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {/* Colonne droite : prix + badges + corbeille */}
                  <div className="flex-shrink-0 flex flex-col items-end justify-between gap-1.5">
                    {/* Corbeille en haut */}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Retirer ${item.productName} du panier`}
                      className="flex size-7 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
                    >
                      <LuTrash2 size={14} aria-hidden="true" />
                    </button>

                    {/* Prix total ligne */}
                    <div className="text-right">
                      {item.packPriceValue > 0 ? (
                        <>
                          <p className="text-sm font-bold text-ink leading-5">
                            {formatFCFA(item.packPriceValue * item.quantity)}
                          </p>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-ink-muted leading-4">
                              {item.quantity} × {formatFCFA(item.packPriceValue)}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm font-semibold text-ink">{item.packPrice || 'À confirmer'}</p>
                      )}
                    </div>

                    {/* Badges : articles + couleur */}
                    <div className="flex flex-col items-end gap-1">
                      <span className="inline-flex items-center rounded-full bg-paddy/8 px-2 py-0.5 text-[11px] font-semibold text-paddy-deep">
                        {totalArticlesLine} article{totalArticlesLine > 1 ? 's' : ''}
                      </span>
                      {colorHex && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          <span
                            className="inline-block size-2.5 rounded-full border border-line/50 flex-shrink-0"
                            style={{ backgroundColor: colorHex }}
                            aria-hidden="true"
                          />
                          {item.productColorLabel}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </article>
              );
            })}
          </div>

          <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Sous-total</dt>
              <dd className="m-0 font-medium text-ink">
                {hasAllPrices ? formatFCFA(subtotal) : 'À confirmer'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Livraison Abidjan</dt>
              <dd className="m-0 font-medium text-ink">
                {hasAllPrices ? formatFCFA(DELIVERY_FEE) : 'À confirmer'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3 text-base">
              <dt className="font-semibold text-ink">Total commande</dt>
              <dd className="m-0 font-bold text-paddy-deep">
                {grandTotal !== null ? formatFCFA(grandTotal) : 'À confirmer'}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-panel border border-line bg-surface p-4 sm:p-5" aria-labelledby="delivery-address-title">
          <h2 id="delivery-address-title" className="m-0 font-display text-xl font-bold text-ink">Où livrons-nous ?</h2>
          <div className="mt-4 grid gap-4">
            <TextField
              id="full-name"
              label="Nom complet"
              placeholder="Nom complet"
              value={customer.fullName}
              onChange={(value) => updateCustomer('fullName', value)}
              autoComplete="name"
              required
            />

            <div className="grid gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-ink">Téléphone</label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                value={customer.phone}
                onChange={(event) => {
                  // Chiffres uniquement, max 10
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
                  updateCustomer('phone', digits);
                }}
                placeholder="0700000000"
                maxLength={10}
                required
                className="min-h-12 w-full rounded-control border border-line bg-ground px-3 text-base font-normal text-ink outline-hidden transition-colors placeholder:text-ink-muted/60 focus:border-paddy focus:ring-2 focus:ring-paddy/20 sm:text-sm"
              />
            </div>

            <TextField
              id="address"
              label="Adresse"
              placeholder="Commune, quartier, repère"
              value={customer.addressDetails}
              onChange={(value) => updateCustomer('addressDetails', value)}
              autoComplete="street-address"
              required
            />
            <label htmlFor="city" className="grid gap-1.5 text-sm font-medium text-ink">
              Ville
              <select
                id="city"
                value={customer.city}
                onChange={(event) => updateCustomer('city', event.target.value)}
                required
                className="min-h-12 w-full rounded-control border border-line bg-ground px-3 text-base font-normal text-ink outline-hidden transition-colors focus:border-paddy focus:ring-2 focus:ring-paddy/20 sm:text-sm"
              >
                <option value="Abidjan">Abidjan</option>
              </select>
            </label>

            <TextField
              id="email"
              label="Email"
              type="email"
              placeholder="Email"
              value={customer.email}
              onChange={(value) => updateCustomer('email', value)}
              autoComplete="email"
            />
          </div>
        </section>

        <fieldset aria-labelledby="payment-plan-title" className="rounded-panel border border-line bg-surface p-4 sm:p-5">
          <h2 id="payment-plan-title" className="m-0 mb-4 font-display text-xl font-bold text-ink">Comment souhaitez-vous payer ?</h2>
          <div className="grid gap-3">
            {PAYMENT_PLANS.map((option) => (
              <RadioCard
                key={option.value}
                name="payment-plan"
                value={option.value}
                selectedValue={paymentPlan}
                onChange={setPaymentPlan}
                label={option.label}
                trailing="À confirmer"
                detail={option.detail}
                required
              />
            ))}
          </div>
        </fieldset>

        <fieldset aria-labelledby="delivery-option-title" className="rounded-panel border border-line bg-surface p-4 sm:p-5">
          <h2 id="delivery-option-title" className="m-0 mb-4 font-display text-xl font-bold text-ink">Quelle option de livraison souhaitez-vous ?</h2>
          <div className="grid gap-3">
            {DELIVERY_OPTIONS.map((option) => (
              <RadioCard
                key={option.value}
                name="delivery-option"
                value={option.value}
                selectedValue={deliveryOption}
                onChange={setDeliveryOption}
                label={option.label}
                detail={option.detail}
                required
              />
            ))}
          </div>
        </fieldset>

        <fieldset aria-labelledby="payment-method-title" className="rounded-panel border border-line bg-surface p-4 sm:p-5">
          <h2 id="payment-method-title" className="m-0 font-display text-xl font-bold text-ink">Moyen de paiement</h2>
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-5">
            {PAYMENT_METHODS.map((option) => {
              const isSelected = paymentMethod === option.value;
              const inputId = `payment-method-${option.value.replaceAll('_', '-')}`;
              return (
                <label
                  key={option.value}
                  htmlFor={inputId}
                  className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 p-3 transition-all focus-within:ring-2 focus-within:ring-paddy/30 ${
                    isSelected
                      ? 'border-paddy bg-paddy/5 shadow-sm'
                      : 'border-line bg-surface hover:border-paddy/40 hover:bg-ground'
                  }`}
                >
                  {/* Radio caché */}
                  <input
                    id={inputId}
                    type="radio"
                    name="payment-method"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => setPaymentMethod(option.value)}
                    required
                    className="sr-only"
                  />

                  {/* Indicateur sélection */}
                  {isSelected && (
                    <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-paddy" aria-hidden="true">
                      <LuCheck size={10} className="text-on-paddy" />
                    </span>
                  )}

                  {/* Logo */}
                  <div className={`flex size-12 items-center justify-center overflow-hidden rounded-xl ${option.logoBg}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={option.logo}
                      alt={option.label}
                      className={`size-full ${option.fit === 'contain' ? 'object-contain p-1' : 'object-cover'}`}
                    />
                  </div>

                  {/* Label */}
                  <span className={`text-center text-[11px] font-semibold leading-tight ${isSelected ? 'text-paddy-deep' : 'text-ink-muted'}`}>
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-surface px-4 py-3 text-sm font-medium text-danger" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(28,42,32,0.08)] backdrop-blur-sm sm:px-6">
          <div className={`mx-auto grid w-full ${containerWidthClass} gap-2`}>
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 text-xs font-medium text-ink-muted transition-colors hover:text-paddy focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
              >
                <FaWhatsapp size={16} aria-hidden="true" />
                Une question ? WhatsApp
              </a>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-paddy px-5 py-3 text-sm font-bold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuCheck size={18} aria-hidden="true" />
              {submitting ? 'Envoi en cours…' : 'Confirmer ma commande'}
            </button>
            <p className="m-0 text-center text-[11px] leading-4 text-ink-muted">
              Aucun paiement prélevé maintenant · Confirmation par RiceWare CI
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function CheckoutHeader() {
  return (
    <header className="mb-5 flex items-center gap-3 sm:mb-6">
      <Link
        href="/panier"
        aria-label="Retour au panier"
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:border-paddy hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
      >
        <LuArrowLeft size={18} aria-hidden="true" />
      </Link>
      <h1 className="m-0 font-display text-title font-bold text-ink">Finaliser ma commande</h1>
    </header>
  );
}

function TextField({
  id,
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email';
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="grid gap-1.5 text-sm font-medium text-ink">
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="min-h-12 w-full rounded-xl border border-line bg-ground px-3 text-base font-normal text-ink outline-hidden transition-colors placeholder:text-ink-muted/60 focus:border-paddy focus:ring-2 focus:ring-paddy/20 sm:text-sm"
      />
    </label>
  );
}

function RadioCard<T extends string>({
  name,
  value,
  selectedValue,
  onChange,
  label,
  detail,
  trailing,
  compact = false,
  required = false,
}: {
  name: string;
  value: T;
  selectedValue: T | '';
  onChange: (value: T) => void;
  label: string;
  detail?: string;
  trailing?: string;
  compact?: boolean;
  required?: boolean;
}) {
  const id = `${name}-${value.replaceAll('_', '-')}`;
  const isSelected = selectedValue === value;

  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition-colors focus-within:ring-2 focus-within:ring-paddy/20 ${
        isSelected ? 'border-paddy bg-paddy/5' : 'border-line bg-surface hover:border-paddy/50'
      } ${compact ? 'min-h-12 items-center p-3' : ''}`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={isSelected}
        onChange={() => onChange(value)}
        required={required}
        className="mt-0.5 size-4 shrink-0 accent-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2"
      />
      <span className="min-w-0 flex-1">
        <span className={`flex items-start justify-between gap-2 ${compact ? 'items-center' : ''}`}>
          <span className="text-sm font-semibold leading-5 text-ink">{label}</span>
          {trailing ? <span className="shrink-0 text-xs font-semibold text-ink-muted">{trailing}</span> : null}
        </span>
        {detail ? <span className="mt-1 block text-xs leading-5 text-ink-muted">{detail}</span> : null}
      </span>
    </label>
  );
}
