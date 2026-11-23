export type OpcoesHttp = {
  userAgent: string;
  /** Pausa mínima entre duas chamadas do mesmo cliente. */
  intervaloMs: number;
  fetch?: typeof fetch;
  esperar?: (ms: number) => Promise<void>;
};

const TENTATIVAS = 3;
const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Cliente JSON com ritmo fixo. Rede, 5xx e corpo que não é JSON: até 3 tentativas (5 s, 10 s).
 * 429/403: espera 30 s, 60 s, 90 s. Qualquer outra resposta não-2xx quebra a coleta.
 */
export function criarHttp(op: OpcoesHttp) {
  const f = op.fetch ?? fetch;
  const esperar = op.esperar ?? dormir;
  let ultima = 0;

  return async function json<T>(url: string | URL, init: RequestInit = {}, rotulo = String(url)): Promise<T> {
    for (let tentativa = 1; ; tentativa++) {
      const falta = ultima + op.intervaloMs - Date.now();
      if (ultima && falta > 0) await esperar(falta);
      ultima = Date.now();

      let resp: Response;
      let corpo: string;
      try {
        resp = await f(url, {
          ...init,
          headers: { 'User-Agent': op.userAgent, Accept: 'application/json', ...init.headers },
          signal: AbortSignal.timeout(60_000),
        });
        corpo = await resp.text();
      } catch (erro) {
        if (tentativa >= TENTATIVAS) throw new Error(`${rotulo}: falha de rede`, { cause: erro });
        await esperar(5000 * tentativa);
        continue;
      }
      if (resp.status === 429 || resp.status === 403) {
        if (tentativa > TENTATIVAS) throw new Error(`${rotulo}: limite de chamadas (${resp.status})`);
        await esperar(30_000 * tentativa);
        continue;
      }
      if (resp.status >= 500 && tentativa < TENTATIVAS) {
        await esperar(5000 * tentativa);
        continue;
      }
      if (!resp.ok) throw new Error(`${rotulo}: HTTP ${resp.status}`);
      try {
        return JSON.parse(corpo) as T;
      } catch (erro) {
        if (tentativa >= TENTATIVAS) throw new Error(`${rotulo}: resposta não é JSON`, { cause: erro });
        await esperar(5000 * tentativa);
      }
    }
  };
}
