import type { PagamentoCgu } from '../../../coletor/src/tipos.ts';
import type { Manifest } from '../App.tsx';
import { formatBRL, formatInt, formatMes } from '../lib/format.ts';

/** Pagamentos federais por ano do pagamento (CGU), de `ano_minimo` até a coleta. Só federal: é a única esfera com série paga. */
export function porAno(pagamentos: PagamentoCgu[], desde: number, ate: number) {
  const anos = Array.from({ length: ate - desde + 1 }, (_, i) => desde + i);
  return anos.map((ano) => {
    const doAno = pagamentos.filter((p) => p.mes.startsWith(String(ano)));
    return {
      ano,
      centavos: doAno.reduce((s, p) => s + Math.round(p.valor * 100), 0),
      emendas: new Set(doAno.map((p) => p.emenda)).size,
      autores: new Set(doAno.map((p) => p.autor)).size,
    };
  });
}

export function Historico({ manifest, pagamentos }: { manifest: Manifest; pagamentos: PagamentoCgu[] }) {
  const ate = manifest.fontes.cgu.dados_ate;
  const linhas = porAno(pagamentos, manifest.ano_minimo, Number(ate.slice(0, 4)));
  const maior = Math.max(...linhas.map((l) => l.centavos), 1);
  return (
    <section className="panel hist-sec" aria-labelledby="h-hist">
      <span className="eyebrow">Só federais · CGU</span>
      <h2 id="h-hist" className="h3" style={{ marginTop: 8 }}>
        Quanto a União pagou a Rolante em emendas, por ano
      </h2>
      <p className="d" style={{ maxWidth: '64ch' }}>
        Soma dos pagamentos feitos ao Município e aos fundos municipais, pelo ano do pagamento. Só entra o que foi pago: emenda empenhada e
        ainda não paga fica de fora. Dados da CGU até {formatMes(ate)}.
      </p>
      <ol className="barras">
        {linhas.map((l) => (
          <li key={l.ano}>
            <span className="barras-a num">{l.ano}</span>
            <span className="barras-t" aria-hidden="true">
              <span style={{ width: `${(l.centavos / maior) * 100}%` }} />
            </span>
            <span className="barras-v num">
              {formatBRL(l.centavos / 100)}
              <span className="d">
                {' '}
                · {formatInt(l.emendas)} {l.emendas === 1 ? 'emenda' : 'emendas'}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
