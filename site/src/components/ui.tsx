import type { ReactNode } from 'react';
import type { Esfera } from '../../../coletor/src/tipos.ts';
import { NOME_ESFERA, type Valor } from '../lib/emenda.ts';
import { formatBRL, formatColeta } from '../lib/format.ts';

// Ícones de traço único arredondado (coerentes com a gota, traço 1.8).
const Ico = ({ size = 16, children }: { size?: number; children: ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
export const IcoExterno = () => (
  <Ico size={12}>
    <path d="M6 3.5h6.5V10M12.5 3.5l-9 9" />
  </Ico>
);
export const IcoVoltar = () => (
  <Ico>
    <path d="M13 8H3.5M7.5 4l-4 4 4 4" />
  </Ico>
);
export const IcoRelogio = () => (
  <Ico size={20}>
    <circle cx="8" cy="8" r="6.4" />
    <path d="M8 4.6V8l2.4 1.6" />
  </Ico>
);

export function LinkExterno({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener">
      {children}
      <IcoExterno />
      <span className="sr">(abre em nova aba)</span>
    </a>
  );
}

/** Rótulo da esfera. Uma só cor de acento: as três se distinguem pela forma da pílula, não pela cor. */
export function PilulaEsfera({ esfera }: { esfera: Esfera }) {
  return <span className={`pill esf-${esfera}`}>{NOME_ESFERA[esfera].um}</span>;
}

// Coleta mensal (dia 25): passou de 35 dias, a última coleta falhou ou não rodou.
const LIMITE_ATRASO_MS = 35 * 86_400_000;

/** «coletado em …» com um selo discreto quando a última coleta passou do prazo. */
export function Coletado({ em }: { em: string }) {
  const atrasado = Date.now() - new Date(em).getTime() > LIMITE_ATRASO_MS;
  return (
    <>
      <span>coletado em {formatColeta(em)}</span>
      {atrasado && (
        <span className="selo" role="status" title="A última coleta foi há mais de 35 dias. As informações são dessa coleta e podem estar atrás das fontes.">
          <IcoRelogio />
          Atualização pendente
        </span>
      )}
    </>
  );
}

export function Seg<T extends string | number>({
  label,
  valor,
  opcoes,
  onChange,
}: {
  label: string;
  valor: T;
  opcoes: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {opcoes.map(([v, txt]) => (
        <button key={String(v)} type="button" className="segb" aria-pressed={valor === v} onClick={() => onChange(v)}>
          {txt}
        </button>
      ))}
    </div>
  );
}

/** Número com rótulo e a fonte embaixo. Sem valor: «—» e o motivo. */
export function Numero({ rotulo, v, vazio }: { rotulo: string; v: Valor | null; vazio: string }) {
  return (
    <div className="numero">
      <dt>{rotulo}</dt>
      <dd className="num">{v ? formatBRL(v.valor) : '—'}</dd>
      <dd className="numero-f">{v ? `Fonte: ${v.fonte}` : vazio}</dd>
    </div>
  );
}
