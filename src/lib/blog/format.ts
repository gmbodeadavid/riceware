/** Abidjan est en UTC+0 toute l’année : affichage identique sur le serveur et le client. */
const TIME_ZONE = 'Africa/Abidjan';

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const longDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: TIME_ZONE,
});

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatLongDate(iso: string): string {
  return longDateFormatter.format(new Date(iso));
}
