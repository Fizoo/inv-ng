/** Кольори учасників. Власник завжди фіолетовий, гостям дістаються інші. */
export const OWNER_COLOR = '#6b5cff';
export const GUEST_COLORS = ['#35e3a4', '#ffb454', '#ff5c7c', '#4dd0ff', '#d56bff', '#c8f24a'];

export const pickColor = (used: string[]) =>
  GUEST_COLORS.find((c) => !used.includes(c)) ?? GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];

export const randomGuestColor = () => GUEST_COLORS[Math.floor(Math.random() * GUEST_COLORS.length)];
export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();
export const newCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
