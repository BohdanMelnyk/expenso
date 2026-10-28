/** Recharts tooltip box that matches light and dark mode. */
export const tooltipStyle = (dark: boolean) => ({
  borderRadius: 8,
  fontSize: 12,
  background: dark ? '#1c1c1e' : '#ffffff',
  border: `1px solid ${dark ? 'rgba(255,255,255,.12)' : '#e5e5ea'}`,
  color: dark ? '#f5f5f7' : '#1d1d1f',
});
