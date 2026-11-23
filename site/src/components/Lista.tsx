import { useState } from 'react';
import type { Emenda, Esfera } from '../../../coletor/src/tipos.ts';
import type { Dados } from '../App.tsx';
import { alertas, autores, chegou, ESFERAS, indicado, NOME_ESFERA, partidos, prefeituraPagou, titulo, totais } from '../lib/emenda.ts';
import { formatBRL, formatInt } from '../lib/format.ts';
import { GERAL, SELO_MUNICIPAL, TIPOS } from '../lib/textos.ts';
import { Historico } from './Historico.tsx';
import { Origem } from './Origem.tsx';
import { Coletado, PilulaEsfera, Seg } from './ui.tsx';

const ROTULO_CHEGOU: Record<Esfera, string> = { federal: 'Pago pela União', estadual: 'Entrou na conta', municipal: '' };

function Cartao({ e }: { e: Emenda }) {
  const ind = indicado(e);
  const che = chegou(e);
  const pag = prefeituraPagou(e);
  const partido = partidos(e)[0];
  return (
    <li>
      <a className="card" href={`#/emenda/${e.chave}`}>
        <div className="card-t">
          <span className="card-n">
            {autores(e).join(', ')}
            {partido && <span className="card-p"> · {partido.partido}</span>}
          </span>
          <PilulaEsfera esfera={e.esfera} />
        </div>
        <p className="card-o">{titulo(e)}</p>
        {e.esfera === 'municipal' && <p className="selo-mun">{SELO_MUNICIPAL}</p>}
        {alertas(e).length > 0 && <p className="card-al">Parada ou atrasada: ver detalhe</p>}
        <dl className="card-b">
          <div>
            <dt>Indicado</dt>
            <dd className="num">{ind ? formatBRL(ind.valor) : '—'}</dd>
          </div>
          {che && (
            <div>
              <dt>{ROTULO_CHEGOU[e.esfera]}</dt>
              <dd className="num">{formatBRL(che.valor)}</dd>
            </div>
          )}
          <div>
            <dt>Prefeitura pagou</dt>
            <dd className="num">{pag ? formatBRL(pag.valor) : '—'}</dd>
          </div>
        </dl>
      </a>
    </li>
  );
}

/** Totais só desta esfera: as três nunca são somadas num «total trazido». */
function Totais({ esfera, lista, ano }: { esfera: Esfera; lista: Emenda[]; ano: number }) {
  const t = totais(lista);
  const caixa = (rotulo: string, v: number | null, nota: string) => (
    <div>
      <dt>{rotulo}</dt>
      <dd className="num">{v === null ? '—' : formatBRL(v)}</dd>
      <dd className="totais-n">{nota}</dd>
    </div>
  );
  return (
    <section className="panel totais" aria-label={`Totais das emendas ${NOME_ESFERA[esfera].varios.toLowerCase()} de ${ano}`}>
      <p className="rot">
        Emendas {NOME_ESFERA[esfera].varios.toLowerCase()} de {ano} · {formatInt(t.quantidade)}
      </p>
      <dl>
        {caixa('Indicado', t.indicado, 'Valor de cada emenda na fonte mais próxima da prefeitura')}
        {esfera === 'federal' && caixa('Pago pela União', t.chegou, 'Pagamentos a Rolante na CGU, em qualquer mês')}
        {esfera === 'estadual' && caixa('Entrou na conta da prefeitura', t.chegou, 'Receitas registradas no portal da prefeitura')}
        {caixa('A prefeitura já pagou', t.pagou, 'Despesas pagas com a emenda, no portal da prefeitura')}
      </dl>
      {esfera === 'municipal' && <p className="selo-mun">{SELO_MUNICIPAL}</p>}
    </section>
  );
}

function Tipo({ esfera }: { esfera: Esfera }) {
  const t = TIPOS[esfera];
  return (
    <details className="panel sec tipo">
      <summary>O que é uma emenda {NOME_ESFERA[esfera].um.toLowerCase()}?</summary>
      <dl className="tipo-d">
        <div>
          <dt>Quem indica</dt>
          <dd>{t.quem}</dd>
        </div>
        <div>
          <dt>De onde sai o dinheiro</dt>
          <dd>{t.deOnde}</dd>
        </div>
        <div>
          <dt>Na prática</dt>
          <dd>{t.pratica}</dd>
        </div>
        <div>
          <dt>A ironia</dt>
          <dd>{t.ironia}</dd>
        </div>
      </dl>
    </details>
  );
}

export function Lista({ dados }: { dados: Dados }) {
  const { manifest, emendas } = dados;
  const anos = [...manifest.anos].sort((a, b) => b - a);
  const [ano, setAno] = useState(anos[0]!);
  const [esfera, setEsfera] = useState<Esfera>('federal');
  const doAno = emendas[ano] ?? [];
  const visiveis = doAno.filter((e) => e.esfera === esfera);

  return (
    <>
      <section className="topo" aria-labelledby="h-topo">
        <h1 id="h-topo">
          <span className="topo-t">Acompanhe as</span>
          <span className="bignum">emendas</span>
          <span className="topo-t">enviadas a Rolante/RS</span>
        </h1>
        <div className="src">
          <span>Fontes: CGU, FNS, Transferegov e Portal da Transparência de Rolante ·</span>
          <Coletado em={manifest.coletado_em} />
        </div>
      </section>

      <section className="panel intro" aria-labelledby="h-intro">
        <h2 id="h-intro" className="intro-h">
          {GERAL.titulo}
        </h2>
        <p className="intro-p">{GERAL.texto}</p>
      </section>

      <section className="filtros" aria-label="Filtros">
        {anos.length > 1 && <Seg label="Ano" valor={ano} opcoes={anos.map((a) => [a, String(a)])} onChange={setAno} />}
        <Seg
          label="Tipo de emenda"
          valor={esfera}
          opcoes={ESFERAS.map((x) => [x, `${NOME_ESFERA[x].varios} ${formatInt(doAno.filter((e) => e.esfera === x).length)}`])}
          onChange={setEsfera}
        />
      </section>

      <Tipo esfera={esfera} />
      <Totais esfera={esfera} lista={visiveis} ano={ano} />

      {visiveis.length === 0 ? (
        <div className="msg info" style={{ marginTop: 12 }}>
          <p>
            Nenhuma emenda {NOME_ESFERA[esfera].um.toLowerCase()} de {ano} nas fontes.
            {ano < manifest.fontes.abase.desde && ' O portal da prefeitura só tem o módulo de emendas a partir de ' + manifest.fontes.abase.desde + '.'}
          </p>
        </div>
      ) : (
        <ul className="cards">
          {visiveis.map((e) => (
            <Cartao key={e.chave} e={e} />
          ))}
        </ul>
      )}

      <Historico manifest={manifest} pagamentos={dados.historico} />
      <Origem manifest={manifest} />
    </>
  );
}
