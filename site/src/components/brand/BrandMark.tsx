// Símbolo do Emendas Rolante (folha em ciclo). Geometria em docs/brand/emendas-rolante/assets/emendas-rolante/mark.svg.
type Props = { height?: number; tone?: 'auto' | 'ink' | 'white'; title?: string };

export function BrandMark({ height = 34, tone = 'auto', title }: Props) {
  const stroke = tone === 'ink' ? 'var(--tinta)' : tone === 'white' ? 'var(--branco)' : 'var(--accent)';
  const fill = tone === 'auto' ? 'var(--brand-bg)' : 'none';
  return (
    <svg
      width={(height * 26) / 34}
      height={height}
      viewBox="0 0 26 34"
      fill="none"
      stroke={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect x="2" y="2" width="22" height="30" rx="11" fill={fill} strokeWidth="1.8" />
      <path d="M18.8 11 V22.4 A2 2 0 0 1 16.8 24.4 H9.2 A2 2 0 0 1 7.2 22.4 V9.6 A2 2 0 0 1 9.2 7.6 H15.4 M13.8 6.2 L15.4 7.6 L13.8 9" strokeWidth="1.5" />
      <path d="M9.8 12.8 H16.2 M9.8 16 H16.2 M9.8 19.2 H13.6" strokeOpacity=".45" strokeWidth="1.4" />
    </svg>
  );
}
