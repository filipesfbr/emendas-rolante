import { useEffect, useState } from 'react';
import type { Emenda, Esfera, PagamentoCgu } from '../../coletor/src/tipos.ts';
import { BrandLockup } from './components/brand/BrandLockup.tsx';
import { BrandMark } from './components/brand/BrandMark.tsx';
import { Detalhe } from './components/Detalhe.tsx';
import { Lista } from './components/Lista.tsx';

export type Manifest = {
  coletado_em: string;
  anos: number[];
  historico_desde: number;
  favorecidos: Record<string, string>;
  fontes: {
    cgu: { pagina: string; atualizado_em: string | null; dados_ate: string };
    fns: { portal: string };
    transferegov: { portal: string };
    abase: { portal: string; desde: number };
  };
  repositorio: string;
  contagem: Record<string, Record<Esfera, number>>;
};
export type Dados = { manifest: Manifest; emendas: Record<number, Emenda[]>; historico: PagamentoCgu[] };

const FAMILIA = [
  ['https://impostometro.rolanters.com.br/', 'Impostômetro Rolante: quanto a prefeitura arrecada'],
  ['https://gastometro.rolanters.com.br/', 'Gastômetro Rolante: quanto a prefeitura gasta'],
  ['https://licitacoes.rolanters.com.br/', 'Licitações Rolante: o que a prefeitura está comprando'],
] as const;

const pegar = <T,>(caminho: string): Promise<T> =>
  fetch(`dados/${caminho}`, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${caminho}: ${r.status}`))));

/** `#/emenda/{chave}` abre o detalhe; qualquer outra coisa é a lista. */
const rota = () => /^#\/emenda\/([\w-]+)$/.exec(location.hash)?.[1] ?? null;

function Carregando() {
  return (
    <div style={{ padding: '44px 0', display: 'flex', flexDirection: 'column', gap: 14 }} aria-busy="true" aria-label="Carregando os dados">
      <div className="sk" style={{ width: '60%', height: 18 }} />
      <div className="sk" style={{ width: '100%', height: 72 }} />
      <div className="sk" style={{ height: 120 }} />
      <div className="sk" style={{ height: 120 }} />
    </div>
  );
}

export function App() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [erro, setErro] = useState(false);
  const [chave, setChave] = useState(rota);

  useEffect(() => {
    pegar<Manifest>('manifest.json')
      .then(async (manifest) => {
        const [historico, ...listas] = await Promise.all([
          pegar<PagamentoCgu[]>('historico.json'),
          ...manifest.anos.map((a) => pegar<Emenda[]>(`emendas/${a}.json`)),
        ]);
        setDados({
          manifest,
          historico: historico as PagamentoCgu[],
          emendas: Object.fromEntries(manifest.anos.map((a, i) => [a, listas[i] as Emenda[]])),
        });
      })
      .catch(() => setErro(true));
  }, []);

  useEffect(() => {
    if (dados && location.hash.startsWith('#de-onde-vem')) document.getElementById('de-onde-vem')?.scrollIntoView();
  }, [dados]);

  useEffect(() => {
    const mudou = () => {
      setChave(rota());
      // #de-onde-vem é âncora (como nos irmãos): rola até a seção em vez de ir ao topo.
      if (location.hash === '#de-onde-vem') setTimeout(() => document.getElementById('de-onde-vem')?.scrollIntoView(), 50);
      else window.scrollTo(0, 0);
    };
    addEventListener('hashchange', mudou);
    return () => removeEventListener('hashchange', mudou);
  }, []);

  return (
    <div className="pg">
      <div className="wrap">
        <header className="hdr">
          <a className="logo" href="#/" aria-label="Emendas Rolante: início">
            <BrandLockup />
          </a>
        </header>
        {erro && (
          <div className="msg err" role="alert">
            <BrandMark height={52} />
            <p>Não conseguimos carregar os dados deste site agora. Tente recarregar a página.</p>
          </div>
        )}
        {!dados && !erro && <Carregando />}
        {dados && <main>{chave ? <Detalhe dados={dados} chave={chave} /> : <Lista dados={dados} />}</main>}
        <footer className="ftr">
          <p style={{ marginBottom: 12 }}>
            <BrandLockup markHeight={22} />
          </p>
          <p className="ftr-l">
            {FAMILIA.map(([href, txt]) => (
              <a key={href} href={href}>
                {txt}
              </a>
            ))}
          </p>
          <p className="ftr-l" style={{ marginTop: 8 }}>
            <a href="#de-onde-vem">De onde vêm os dados</a>
            {dados && (
              <a href={dados.manifest.repositorio} target="_blank" rel="noopener">
                Repositório público
              </a>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}
