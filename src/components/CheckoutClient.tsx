'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { LuArrowLeft, LuCheck, LuMinus, LuPlus, LuTrash2 } from 'react-icons/lu';
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

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'djamo', label: 'Djamo' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'moov_money', label: 'Moov Money' },
];

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, '');
const whatsappUrl = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Bonjour RiceWare CI, j’ai une question sur ma commande.')}`
  : null;

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

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(readJsonStorage<CartItem[]>(CART_STORAGE_KEY, []));
      setIsLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const totals = useMemo(() => getCartTotals(items), [items]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (!paymentMethod) {
      setError('Choisissez un moyen de paiement préféré.');
      return;
    }

    const nationalPhone = customer.phone.replace(/\D/g, '').replace(/^225/, '');
    const orderCustomer: CheckoutCustomer = {
      ...customer,
      phone: `+225 ${nationalPhone}`,
    };
    const order: StoredOrder = {
      orderNumber: createOrderNumber(),
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
      commercialNote: 'Demande enregistrée localement. Les prix, les modalités de paiement et la livraison restent à confirmer par RiceWare CI. Aucun paiement n’a été prélevé.',
    };

    const previousOrders = readJsonStorage<StoredOrder[]>(ORDERS_STORAGE_KEY, []);
    writeJsonStorage(LAST_ORDER_STORAGE_KEY, order);
    writeJsonStorage(ORDERS_STORAGE_KEY, [order, ...previousOrders]);
    writeJsonStorage(CART_STORAGE_KEY, []);
    router.push(`/commande/confirmation?numero=${order.orderNumber}`);
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
            <span className="shrink-0 text-xs text-ink-muted">{totals.totalPacks} pack{totals.totalPacks > 1 ? 's' : ''}</span>
          </div>

          <div className="mt-3 divide-y divide-line">
            {items.map((item) => (
              <article key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-4 first:pt-1 last:pb-1 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl bg-ground sm:size-[76px]">
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    width={76}
                    height={76}
                    sizes="(min-width: 640px) 76px, 64px"
                    className="size-full object-contain p-1.5"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="m-0 truncate font-display text-base font-semibold text-ink">{item.productName}</h3>
                      <p className="mt-1 text-xs leading-5 text-ink-muted">
                        {item.packLabel} · {item.productFormat}
                      </p>
                      {item.packNote ? <p className="text-xs leading-5 text-ink-muted">{item.packNote}</p> : null}
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{item.packPrice || 'À confirmer'}</span>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <div className="flex h-10 items-center rounded-full border border-line bg-ground" aria-label={`Quantité : ${item.quantity}`}>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label={`Diminuer la quantité de ${item.productName}`}
                          className="flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <LuMinus size={15} aria-hidden="true" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink" aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= 99}
                          aria-label={`Augmenter la quantité de ${item.productName}`}
                          className="flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:text-paddy focus-visible:outline-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <LuPlus size={15} aria-hidden="true" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Retirer ${item.productName} du panier`}
                        className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
                      >
                        <LuTrash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Sous-total</dt>
              <dd className="m-0 font-medium text-ink">À confirmer</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-ink-muted">Livraison Abidjan</dt>
              <dd className="m-0 font-medium text-ink">À confirmer</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line pt-3 text-base">
              <dt className="font-semibold text-ink">Total commande</dt>
              <dd className="m-0 font-bold text-ink">À confirmer</dd>
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
              <div className="flex min-h-12 overflow-hidden rounded-control border border-line bg-ground transition-colors focus-within:border-paddy focus-within:ring-2 focus-within:ring-paddy/20">
                <span className="flex items-center border-r border-line px-3 text-sm font-semibold text-ink" aria-label="Indicatif de la Côte d’Ivoire">+225</span>
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={customer.phone}
                  onChange={(event) => updateCustomer('phone', event.target.value.replace(/^\+?225\s*/, '').replace(/[^\d\s]/g, ''))}
                  placeholder="07 00 00 00 00"
                  required
                  className="min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-hidden placeholder:text-ink-muted/60 sm:text-sm"
                />
              </div>
            </div>

            <TextField
              id="address"
              label="Adresse (commune, quartier, repère)"
              placeholder="Commune, quartier, repère"
              value={customer.addressDetails}
              onChange={(value) => updateCustomer('addressDetails', value)}
              autoComplete="street-address"
              required
            />
            <p className="-mt-2 text-xs leading-5 text-ink-muted">Un conseiller vous rappelle pour confirmer la livraison.</p>

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
              label="Email (optionnel)"
              type="email"
              placeholder="Email (optionnel)"
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
          <p className="mt-1 text-sm text-ink-muted">Votre préférence sera confirmée par RiceWare avant tout paiement.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAYMENT_METHODS.map((option) => (
              <RadioCard
                key={option.value}
                name="payment-method"
                value={option.value}
                selectedValue={paymentMethod}
                onChange={setPaymentMethod}
                label={option.label}
                compact
                required
              />
            ))}
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
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-paddy px-5 py-3 text-sm font-bold text-on-paddy transition-colors hover:bg-paddy-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paddy disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LuCheck size={18} aria-hidden="true" />
              Confirmer ma commande
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
