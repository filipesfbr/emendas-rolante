import type { ReactNode } from 'react';
import type { Emenda } from '../../../coletor/src/tipos.ts';
import type { Dados } from '../App.tsx';
import { alertas, autores, AVISO_PARADO, chegou, faseRs, indicado, NOME_ESFERA, partidos, prefeituraPagou, titulo } from '../lib/emenda.ts';
import { formatBRL, formatDate, formatMes } from '../lib/format.ts';
import { SELO_MUNICIPAL } from '../lib/textos.ts';
import { Coletado, IcoVoltar, LinkExterno, Numero, PilulaEsfera } from './ui.tsx';

const LICITACOES = 'https://licitacoes.rolanters.com.br/#/licitacao/';
const data = (d: string | null) => (d ? formatDate(d) : 'sem data');

function Secao({ titulo, n, aberta, children }: { titulo: string; n?: number; aberta?: boolean; children: ReactNode }) {
  return (
    <details className="panel sec" open={aberta}>
      <summary>
        <span>
          {titulo} {n !== undefined && <span className="n">{n}</span>}
        </span>
      </summary>
      <div>{children}</div>
    </details>
  );
}

function Linhas({ itens }: { itens: [ReactNode, ReactNode, ReactNode?][] }) {
  return (
    <ul className="itens">
      {itens.map(([a, b, c], i) => (
        <li key={i}>
          <span className="it-d">{a}</span>
          <span className="it-q num">{b}</span>
          {c && <span className="it-a">{c}</span>}
        </li>
      ))}
    </ul>
  );
}

function Cgu({ e }: { e: Emenda }) {
  const c = e.cgu!;
  return (
    <Secao titulo="Pagamentos da União (CGU)" n={c.pagamentos.length} aberta>
      {c.tipo && <p className="d">Tipo na CGU: {c.tipo}</p>}
      {c.pagamentos.length ? (
        <Linhas itens={c.pagamentos.map((p) => [`Pago em ${formatMes(p.mes)}`, formatBRL(p.valor), p.favorecido])} />
      ) : (
        <p>Nenhum pagamento registrado na CGU até a coleta.</p>
      )}
      {[...c.parcerias, ...c.planos_te].map((x) => (
        <div key={'parceria' in x ? x.parceria : x.plano_acao} className="bloco-d">
          <span className="rot">{'parceria' in x ? `Parceria ${x.parceria} · ${x.situacao}` : `Plano de ação ${x.plano_acao} · ${x.situacao_plano_acao}`}</span>
          <p className="objeto">{x.objeto}</p>
        </div>
      ))}
    </Secao>
  );
}

function Fns({ e }: { e: Emenda }) {
  return (
    <Secao titulo="Ministério da Saúde (FNS)" n={e.fns.length} aberta>
      {e.fns.map((f) => (
        <div key={f.proposta} className="bloco-d">
          <span className="rot">
            Proposta {f.proposta} · {f.tipo}
          </span>
          <dl className="dados">
            <div>
              <dt>Situação</dt>
              <dd>
                {f.situacao ?? '—'}
                {f.data_situacao && <span className="d"> em {formatDate(f.data_situacao)}</span>}
              </dd>
            </div>
            <div>
              <dt>Portaria</dt>
              <dd>{f.portaria ? `${f.portaria}${f.data_portaria ? ` de ${formatDate(f.data_portaria)}` : ''}` : '—'}</dd>
            </div>
            <div>
              <dt>Empenhado</dt>
              <dd className="num">{formatBRL(f.empenhado)}</dd>
            </div>
            <div>
              <dt>Pago</dt>
              <dd className="num">{formatBRL(f.pago)}</dd>
            </div>
          </dl>
          {f.parlamentares_na_proposta > 1 && (
            <p className="d">Esta proposta junta {f.parlamentares_na_proposta} emendas; a parte desta é {formatBRL(f.valor_emenda)}.</p>
          )}
          {f.pagamentos.length > 0 && <Linhas itens={f.pagamentos.map((p) => [`Ordem bancária ${p.ob}`, formatBRL(p.valor), data(p.data)])} />}
        </div>
      ))}
    </Secao>
  );
}

function Transferegov({ e }: { e: Emenda }) {
  return (
    <Secao titulo="Emenda Pix (Transferegov)" n={e.transferegov.length} aberta>
      {e.transferegov.map((t) => (
        <div key={t.id} className="bloco-d">
          <span className="rot">
            Plano de ação {t.codigo} · {t.situacao}
          </span>
          {t.metas.map((m, i) => (
            <p key={i} className="objeto">
              {m.descricao}
              {m.quantidade !== null && m.unidade && (
                <span className="d">
                  {' '}
                  ({m.quantidade.toLocaleString('pt-BR')} {m.unidade})
                </span>
              )}
            </p>
          ))}
          {t.plano_trabalho && (
            <p className="d">
              Plano de trabalho {t.plano_trabalho.situacao.toLowerCase()}
              {t.plano_trabalho.inicio && t.plano_trabalho.fim && `, execução de ${formatDate(t.plano_trabalho.inicio)} a ${formatDate(t.plano_trabalho.fim)}`}
              {t.plano_trabalho.prazo_meses && ` (${t.plano_trabalho.prazo_meses} meses)`}.
            </p>
          )}
          {t.empenhos.length > 0 && (
            <Linhas itens={t.empenhos.map((x) => [`Empenho ${x.numero ?? '(minuta)'} · ${x.situacao}`, formatBRL(x.valor), data(x.data)])} />
          )}
          {t.ordens_bancarias.map((o) => (
            <p key={o.numero} className="d">
              Ordem bancária {o.numero} em {data(o.data)}
            </p>
          ))}
        </div>
      ))}
    </Secao>
  );
}

function Rs({ e }: { e: Emenda }) {
  const r = e.rs!;
  return (
    <Secao titulo="Governo do RS (SEFAZ/CAGE)" n={r.execucao.length} aberta>
      <p className="d">Emenda nº {r.numero} do orçamento do RS de {r.ano}.</p>
      <div className="bloco-d">
        <span className="rot">Destinação</span>
        <Linhas itens={r.itens.map((i) => [i.subtitulo, formatBRL(i.valor), [i.orgao, i.projeto].filter(Boolean).join(' · ')])} />
      </div>
      <dl className="dados">
        {['Empenho', 'Liquidação', 'Pagamento'].map((f) => (
          <div key={f}>
            <dt>{f === 'Empenho' ? 'Empenhado' : f === 'Liquidação' ? 'Liquidado' : 'Pago'}</dt>
            <dd className="num">{formatBRL(faseRs(e, f))}</dd>
          </div>
        ))}
      </dl>
      <div className="bloco-d">
        <span className="rot">Despesa do Estado</span>
        {r.execucao.length ? (
          <Linhas
            itens={r.execucao.map((l) => [
              `${l.fase} · ${l.favorecido ?? 'Favorecido sem CNPJ (pode ser pessoa física; não identificado aqui)'}`,
              formatBRL(l.valor),
              `${data(l.data)} · ${l.orgao}${l.cnpj ? ` · CNPJ ${l.cnpj}` : ''}`,
            ])}
          />
        ) : (
          <p>Nenhum lançamento na despesa do Estado até a coleta.</p>
        )}
      </div>
    </Secao>
  );
}

function Prefeitura({ e }: { e: Emenda }) {
  return (
    <>
      {e.abase.map((a) => (
        <Secao key={a.codigo} titulo="Na prefeitura (Portal da Transparência de Rolante)" n={a.empenhos.length} aberta>
          <dl className="dados" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <div>
              <dt>Nº na prefeitura</dt>
              <dd>{a.numero}</dd>
            </div>
            {a.objetivo && (
              <div>
                <dt>Objetivo</dt>
                <dd>{a.objetivo}</dd>
              </div>
            )}
            {a.aplicacao && (
              <div>
                <dt>Aplicação</dt>
                <dd>{a.aplicacao}</dd>
              </div>
            )}
          </dl>
          {a.beneficiarios.length > 0 && (
            <div className="bloco-d">
              <span className="rot">Beneficiário</span>
              <Linhas itens={a.beneficiarios.map((b) => [b.descricao, formatBRL(b.valor)])} />
            </div>
          )}
          {a.receitas.length > 0 && (
            <div className="bloco-d">
              <span className="rot">Entrada na conta da prefeitura</span>
              <Linhas itens={a.receitas.map((r) => [r.descricao, formatBRL(r.valor), data(r.data)])} />
            </div>
          )}
          <div className="bloco-d">
            <span className="rot">Despesas (empenhos)</span>
            {a.empenhos.length ? (
              <Linhas
                itens={a.empenhos.map((x) => [
                  x.credor ?? 'Credor não identificado aqui (pode ser pessoa física; o nome está no portal)',
                  `${formatBRL(x.pago)} pagos`,
                  <>
                    Empenho {x.empenho} em {data(x.data)} · empenhado {formatBRL(x.empenhado)}
                    {x.licitacao && (
                      <>
                        {' · '}
                        <a href={`${LICITACOES}${x.licitacao.codigo}`}>
                          {x.licitacao.modalidade} nº {x.licitacao.numero}
                        </a>
                      </>
                    )}
                  </>,
                ])}
              />
            ) : (
              <p>Nenhuma despesa empenhada com esta emenda até a coleta.</p>
            )}
          </div>
        </Secao>
      ))}
    </>
  );
}

export function Detalhe({ dados, chave }: { dados: Dados; chave: string }) {
  const e = Object.values(dados.emendas)
    .flat()
    .find((x) => x.chave === chave);
  const voltar = (
    <a className="voltar" href="#/">
      <IcoVoltar /> Todas as emendas
    </a>
  );
  if (!e) {
    return (
      <>
        {voltar}
        <div className="msg info" style={{ marginTop: 12 }}>
          <p>Emenda não encontrada nos anos coletados ({dados.manifest.anos.join(' e ')}).</p>
        </div>
      </>
    );
  }
  const al = alertas(e);
  const coleta = formatDate(dados.manifest.coletado_em);
  return (
    <article>
      {voltar}
      <div className="card-t" style={{ marginTop: 16 }}>
        <span className="rot">
          Emenda {NOME_ESFERA[e.esfera].um.toLowerCase()} de {e.ano}
          {/^\d{12}$/.test(e.chave) && ` · ${e.chave}`}
        </span>
        <PilulaEsfera esfera={e.esfera} />
      </div>
      <h1 className="h1">{autores(e).join(', ')}</h1>
      <p className="d">
        {partidos(e).length
          ? partidos(e).map((p) => `${p.partido} (${p.fonte}, consultado em ${coleta})`).join(' · ')
          : 'Partido não informado nas fontes'}
      </p>
      <p className="objeto">{titulo(e)}</p>
      {e.esfera === 'municipal' && <p className="selo-mun">{SELO_MUNICIPAL}</p>}

      <dl className="dados numeros">
        <Numero rotulo="Indicado" v={indicado(e)} vazio="Sem valor nas fontes" />
        {e.esfera !== 'municipal' && (
          <Numero rotulo={e.esfera === 'federal' ? 'Pago pela União' : 'Pago pelo Estado'} v={chegou(e)} vazio="Sem registro" />
        )}
        <Numero
          rotulo="A prefeitura já pagou"
          v={prefeituraPagou(e)}
          vazio={e.rs && !e.abase.length ? 'Não passa pela prefeitura' : 'Emenda fora do portal da prefeitura'}
        />
      </dl>

      {al.length > 0 && (
        <div className="msg warn alerta" role="note">
          <div>
            <p className="alerta-t">Parada ou atrasada</p>
            <ul>
              {al.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="d">{AVISO_PARADO}</p>
          </div>
        </div>
      )}

      <div className="grupos bloco-d">
        {e.cgu && <Cgu e={e} />}
        {e.fns.length > 0 && <Fns e={e} />}
        {e.transferegov.length > 0 && <Transferegov e={e} />}
        {e.rs && <Rs e={e} />}
        <Prefeitura e={e} />
      </div>

      <p className="src bloco-d">
        <span>Fontes: CGU, FNS, Transferegov, SEFAZ/RS e Portal da Transparência de Rolante ·</span>
        <Coletado em={dados.manifest.coletado_em} />
      </p>
      <p className="src">
        <LinkExterno href={dados.manifest.fontes.abase.portal}>Conferir no portal da prefeitura</LinkExterno>
        {e.esfera === 'estadual' ? (
          <LinkExterno href={dados.manifest.fontes.rs.portal}>Painel de emendas do RS</LinkExterno>
        ) : (
          <LinkExterno href={dados.manifest.fontes.cgu.pagina}>Dados da CGU</LinkExterno>
        )}
      </p>
    </article>
  );
}
