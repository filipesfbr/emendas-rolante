import type { Manifest } from '../App.tsx';
import { AVISO_PARADO } from '../lib/emenda.ts';
import { formatColeta, formatInt, formatMes } from '../lib/format.ts';
import { LinkExterno } from './ui.tsx';

const PRINCIPIOS = [
  ['Cada número com a sua fonte', 'Valor indicado, pago e gasto vêm de fontes diferentes. Cada um aparece com o nome da fonte, sem misturar.'],
  ['Três esferas, três contas', 'Federal, estadual e municipal ficam sempre separadas. Nunca somamos as três num “total trazido”.'],
  ['Sem nomes de pessoas', 'Quando a despesa pode ser com pessoa física, o credor não é identificado. O nome continua no portal.'],
  ['Coleta que falha em voz alta', 'Se uma fonte sai do ar ou muda de formato, a coleta para e o site fica com os dados anteriores.'],
] as const;

/** Mesmo padrão da seção “De onde vêm os dados” do Licitações, do Impostômetro e do Gastômetro. */
export function Origem({ manifest }: { manifest: Manifest }) {
  const f = manifest.fontes;
  const ano = Math.max(...manifest.anos);
  const c = manifest.contagem[ano];
  return (
    <section className="panel origem" id="de-onde-vem" aria-labelledby="t-origem">
      <h2 className="origem-h" id="t-origem">
        De onde vêm os dados
      </h2>
      <p className="origem-lead">Cinco fontes públicas, cada uma mostrando um pedaço do caminho do dinheiro.</p>
      <p className="origem-p">
        Só emendas de {manifest.ano_minimo} em diante. Os dados são coletados uma vez por mês, no dia 25. Este site é independente e não tem vínculo com a prefeitura, com a Câmara nem com
        nenhum parlamentar.
      </p>

      <ol className="princ">
        {PRINCIPIOS.map(([t, d], i) => (
          <li key={t}>
            <span className="princ-n num">{String(i + 1).padStart(2, '0')}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        ))}
      </ol>

      <div className="origem-duas">
        <div>
          <h3>CGU (Portal da Transparência federal)</h3>
          <p>
            Pagamentos de emendas federais aos CNPJs do Município e dos fundos municipais, desde {manifest.ano_minimo}, e o objeto das
            parcerias e das emendas Pix. Dados até {formatMes(f.cgu.dados_ate)}. <LinkExterno href={f.cgu.pagina}>Baixar na CGU</LinkExterno>
          </p>
        </div>
        <div>
          <h3>FNS (Fundo Nacional de Saúde)</h3>
          <p>
            Emendas de saúde: portaria, situação, valor empenhado e pago, ordens bancárias e o partido do parlamentar como o FNS registra.
            É uma consulta interna do site do FNS, sem documentação. <LinkExterno href={f.fns.portal}>Abrir o FNS</LinkExterno>
          </p>
        </div>
        <div>
          <h3>Transferegov (emendas Pix)</h3>
          <p>
            Plano de ação, objeto, metas, prazo, empenho e ordem bancária das transferências especiais. A base pública anda meses atrás da
            CGU. <LinkExterno href={f.transferegov.portal}>Abrir o Transferegov</LinkExterno>
          </p>
        </div>
        <div>
          <h3>SEFAZ/RS (emendas estaduais)</h3>
          <p>
            Destinação de cada emenda dos deputados estaduais a Rolante/RS (deputado, partido, valor, destino) e a execução na despesa do
            Estado (CAGE): empenho, liquidação e pagamento, à prefeitura ou à entidade. Arquivos abertos da SEFAZ, sem chave.{' '}
            <LinkExterno href={f.rs.portal}>Abrir o painel do RS</LinkExterno>
          </p>
        </div>
        <div>
          <h3>Portal da Transparência de Rolante/RS</h3>
          <p>
            Emendas federais, estaduais e municipais registradas pela prefeitura: autor, partido, entrada na conta, despesas e credores. Só
            existe a partir de {f.abase.desde}. <LinkExterno href={f.abase.portal}>Abrir o portal</LinkExterno>
          </p>
        </div>
      </div>

      <div className="origem-duas">
        <div>
          <h3>Dinheiro parado</h3>
          <p>{AVISO_PARADO} Quando mostramos “parada ou atrasada”, é o fato que a fonte registra, não uma acusação.</p>
        </div>
        <div>
          <h3>Partido</h3>
          <p>O partido muda com o tempo e as fontes nem sempre concordam. Mostramos o partido de cada fonte, com a data da coleta.</p>
        </div>
      </div>

      <div className="origem-status">
        <span className="rot">Status da última coleta</span>
        <p className="origem-data num">{formatColeta(manifest.coletado_em)}</p>
        {c && (
          <p>
            {ano}: {formatInt(c.federal)} federais · {formatInt(c.estadual)} estaduais · {formatInt(c.municipal)} municipais
          </p>
        )}
        <p className="d">
          Todas as coletas ficam guardadas, com data e hash, na branch de dados do{' '}
          <LinkExterno href={manifest.repositorio}>repositório público</LinkExterno>.
        </p>
      </div>
    </section>
  );
}
