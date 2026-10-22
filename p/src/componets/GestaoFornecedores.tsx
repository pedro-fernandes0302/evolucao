import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import Navbar, { type NavItem } from './Navbar';
import './GestaoFornecedores.css';

/* ========== Tipos ========== */

type Aba = 'fornecedores' | 'cotacoes' | 'pedidos';
type StatusPedido = 'pendente' | 'enviado' | 'recebido' | 'cancelado';

interface Fornecedor {
  id: string;
  nome: string;
  cnpj: string;
  contato: string;
  email: string;
  telefone: string;
  categoria: string;
  prazoMedio: number;
  avaliacao: number;
  ativo: boolean;
}

interface Proposta {
  id: string;
  fornecedorId: string;
  precoUnit: number;
  prazoDias: number;
  frete: number;
  condicao: string;
}

interface Cotacao {
  id: string;
  item: string;
  quantidade: number;
  criadaEm: string;
  propostas: Proposta[];
  pedidoId?: string;
}

interface Pedido {
  id: string;
  numero: string;
  fornecedorId: string;
  item: string;
  quantidade: number;
  precoUnit: number;
  frete: number;
  previsao: string;
  status: StatusPedido;
  criadoEm: string;
  cotacaoId?: string;
}

/* ========== Utilitários ========== */

const uid = () => crypto.randomUUID();
const hoje = () => new Date().toISOString().slice(0, 10);

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dataBR = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR') : '—');

const somarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const soDigitos = (s: string) => s.replace(/\D/g, '');

function mascaraCnpj(valor: string): string {
  const d = soDigitos(valor).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function mascaraTelefone(valor: string): string {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function useLocalState<T>(chave: string, inicial: T): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(chave);
      return raw ? (JSON.parse(raw) as T) : inicial;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch {
      /* storage indisponível: segue só em memória */
    }
  }, [chave, valor]);
  return [valor, setValor];
}

const STATUS_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  enviado: 'Enviado',
  recebido: 'Recebido',
  cancelado: 'Cancelado',
};

/* ========== Dados iniciais (troque pela sua API) ========== */

const FORNECEDORES_INICIAIS: Fornecedor[] = [
  {
    id: 'f1',
    nome: 'Distribuidora Central',
    cnpj: '12.345.678/0001-90',
    contato: 'Marcos Lima',
    email: 'vendas@distcentral.com.br',
    telefone: '(62) 3333-1020',
    categoria: 'Material de escritório',
    prazoMedio: 5,
    avaliacao: 4,
    ativo: true,
  },
  {
    id: 'f2',
    nome: 'Papel & Cia',
    cnpj: '98.765.432/0001-10',
    contato: 'Juliana Reis',
    email: 'contato@papelecia.com.br',
    telefone: '(62) 99888-4411',
    categoria: 'Material de escritório',
    prazoMedio: 3,
    avaliacao: 5,
    ativo: true,
  },
  {
    id: 'f3',
    nome: 'TecnoSuprimentos',
    cnpj: '45.111.222/0001-33',
    contato: 'Rafael Souza',
    email: 'comercial@tecnosup.com.br',
    telefone: '(11) 4002-8922',
    categoria: 'Informática',
    prazoMedio: 7,
    avaliacao: 3,
    ativo: true,
  },
];

/* ========== Componentes pequenos ========== */

function Estrelas({ valor }: { valor: number }) {
  return (
    <span className="gf-estrelas" role="img" aria-label={`Avaliação ${valor} de 5`}>
      {'★'.repeat(valor)}
      <span className="gf-estrelas__vazias">{'★'.repeat(5 - valor)}</span>
    </span>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="gf-campo">
      <span>{rotulo}</span>
      {children}
    </label>
  );
}

/* ========== Fornecedores ========== */

interface FormFornecedorProps {
  inicial?: Fornecedor;
  onSalvar: (f: Fornecedor) => void;
  onCancelar: () => void;
}

function FormFornecedor({ inicial, onSalvar, onCancelar }: FormFornecedorProps) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [cnpj, setCnpj] = useState(inicial?.cnpj ?? '');
  const [contato, setContato] = useState(inicial?.contato ?? '');
  const [email, setEmail] = useState(inicial?.email ?? '');
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? '');
  const [prazoMedio, setPrazoMedio] = useState(String(inicial?.prazoMedio ?? 5));
  const [avaliacao, setAvaliacao] = useState(String(inicial?.avaliacao ?? 3));
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [erro, setErro] = useState('');

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return setErro('Informe o nome do fornecedor.');
    if (soDigitos(cnpj).length !== 14) return setErro('O CNPJ precisa ter 14 dígitos.');
    onSalvar({
      id: inicial?.id ?? uid(),
      nome: nome.trim(),
      cnpj,
      contato: contato.trim(),
      email: email.trim(),
      telefone,
      categoria: categoria.trim() || 'Geral',
      prazoMedio: Math.max(0, Number(prazoMedio) || 0),
      avaliacao: Math.min(5, Math.max(1, Number(avaliacao) || 1)),
      ativo,
    });
  };

  return (
    <form className="gf-form" onSubmit={enviar}>
      <h3>{inicial ? 'Editar fornecedor' : 'Novo fornecedor'}</h3>
      <div className="gf-form__grade">
        <Campo rotulo="Nome / razão social">
          <input value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        </Campo>
        <Campo rotulo="CNPJ">
          <input value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
        </Campo>
        <Campo rotulo="Contato">
          <input value={contato} onChange={(e) => setContato(e.target.value)} />
        </Campo>
        <Campo rotulo="E-mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo="Telefone">
          <input value={telefone} onChange={(e) => setTelefone(mascaraTelefone(e.target.value))} />
        </Campo>
        <Campo rotulo="Categoria">
          <input value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        </Campo>
        <Campo rotulo="Prazo médio (dias)">
          <input type="number" min={0} value={prazoMedio} onChange={(e) => setPrazoMedio(e.target.value)} />
        </Campo>
        <Campo rotulo="Avaliação (1 a 5)">
          <select value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <label className="gf-check">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
        Fornecedor ativo
      </label>
      {erro && <p className="gf-erro">{erro}</p>}
      <div className="gf-acoes">
        <button type="submit" className="gf-btn gf-btn--primario">
          Salvar fornecedor
        </button>
        <button type="button" className="gf-btn" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

interface AbaFornecedoresProps {
  fornecedores: Fornecedor[];
  setFornecedores: Dispatch<SetStateAction<Fornecedor[]>>;
  pedidos: Pedido[];
}

function AbaFornecedores({ fornecedores, setFornecedores, pedidos }: AbaFornecedoresProps) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [editando, setEditando] = useState<Fornecedor | 'novo' | null>(null);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fornecedores.filter((f) => {
      const passaFiltro = filtro === 'todos' || (filtro === 'ativos' ? f.ativo : !f.ativo);
      const passaBusca =
        !termo ||
        f.nome.toLowerCase().includes(termo) ||
        f.categoria.toLowerCase().includes(termo) ||
        soDigitos(f.cnpj).includes(soDigitos(termo));
      return passaFiltro && passaBusca;
    });
  }, [fornecedores, busca, filtro]);

  const salvar = (f: Fornecedor) => {
    setFornecedores((atual) => (atual.some((x) => x.id === f.id) ? atual.map((x) => (x.id === f.id ? f : x)) : [...atual, f]));
    setEditando(null);
  };

  const excluir = (f: Fornecedor) => {
    if (pedidos.some((p) => p.fornecedorId === f.id)) {
      window.alert('Esse fornecedor tem pedidos registrados. Inative-o em vez de excluir.');
      return;
    }
    if (window.confirm(`Excluir ${f.nome}?`)) setFornecedores((atual) => atual.filter((x) => x.id !== f.id));
  };

  return (
    <div>
      <div className="gf-barra">
        <input
          className="gf-busca"
          type="search"
          placeholder="Buscar por nome, categoria ou CNPJ"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          aria-label="Buscar fornecedores"
        />
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por situação">
          <option value="todos">Todos</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
        <button type="button" className="gf-btn gf-btn--primario" onClick={() => setEditando('novo')}>
          Novo fornecedor
        </button>
      </div>

      {editando && (
        <FormFornecedor
          inicial={editando === 'novo' ? undefined : editando}
          onSalvar={salvar}
          onCancelar={() => setEditando(null)}
        />
      )}

      {lista.length === 0 ? (
        <p className="gf-vazio">Nenhum fornecedor encontrado.</p>
      ) : (
        <div className="gf-tabela-wrap">
          <table className="gf-tabela">
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Contato</th>
                <th>Prazo médio</th>
                <th>Avaliação</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>{f.nome}</strong>
                    <div className="gf-sub">{f.cnpj}</div>
                  </td>
                  <td>{f.categoria}</td>
                  <td>
                    {f.contato || '—'}
                    <div className="gf-sub">{f.email || f.telefone}</div>
                  </td>
                  <td>{f.prazoMedio} dias</td>
                  <td>
                    <Estrelas valor={f.avaliacao} />
                  </td>
                  <td>
                    <span className={`gf-selo ${f.ativo ? 'gf-selo--ok' : 'gf-selo--neutro'}`}>{f.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="gf-tabela__acoes">
                    <button type="button" className="gf-btn gf-btn--leve" onClick={() => setEditando(f)}>
                      Editar
                    </button>
                    <button type="button" className="gf-btn gf-btn--leve gf-btn--perigo" onClick={() => excluir(f)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ========== Cotações ========== */

interface AbaCotacoesProps {
  fornecedores: Fornecedor[];
  cotacoes: Cotacao[];
  setCotacoes: Dispatch<SetStateAction<Cotacao[]>>;
  gerarPedido: (c: Cotacao, p: Proposta) => void;
}

function AbaCotacoes({ fornecedores, cotacoes, setCotacoes, gerarPedido }: AbaCotacoesProps) {
  const [selecionadaId, setSelecionadaId] = useState<string | null>(cotacoes[0]?.id ?? null);
  const [item, setItem] = useState('');
  const [qtd, setQtd] = useState('');

  const [fornecedorId, setFornecedorId] = useState('');
  const [preco, setPreco] = useState('');
  const [prazo, setPrazo] = useState('');
  const [frete, setFrete] = useState('0');
  const [condicao, setCondicao] = useState('');

  const selecionada = cotacoes.find((c) => c.id === selecionadaId) ?? null;
  const nomeForn = (id: string) => fornecedores.find((f) => f.id === id)?.nome ?? 'Fornecedor removido';

  const disponiveis = selecionada
    ? fornecedores.filter((f) => f.ativo && !selecionada.propostas.some((p) => p.fornecedorId === f.id))
    : [];

  const totalProposta = (c: Cotacao, p: Proposta) => p.precoUnit * c.quantidade + p.frete;

  const melhores = useMemo(() => {
    if (!selecionada || selecionada.propostas.length === 0) return { preco: '', prazo: '' };
    const porPreco = [...selecionada.propostas].sort((a, b) => totalProposta(selecionada, a) - totalProposta(selecionada, b))[0];
    const porPrazo = [...selecionada.propostas].sort((a, b) => a.prazoDias - b.prazoDias)[0];
    return { preco: porPreco.id, prazo: porPrazo.id };
  }, [selecionada]);

  const criarCotacao = (e: FormEvent) => {
    e.preventDefault();
    const quantidade = Number(qtd);
    if (!item.trim() || quantidade <= 0) return;
    const nova: Cotacao = { id: uid(), item: item.trim(), quantidade, criadaEm: hoje(), propostas: [] };
    setCotacoes((atual) => [nova, ...atual]);
    setSelecionadaId(nova.id);
    setItem('');
    setQtd('');
  };

  const escolherFornecedor = (id: string) => {
    setFornecedorId(id);
    const f = fornecedores.find((x) => x.id === id);
    if (f) setPrazo(String(f.prazoMedio));
  };

  const adicionarProposta = (e: FormEvent) => {
    e.preventDefault();
    if (!selecionada || !fornecedorId || Number(preco) <= 0) return;
    const proposta: Proposta = {
      id: uid(),
      fornecedorId,
      precoUnit: Number(preco),
      prazoDias: Math.max(0, Number(prazo) || 0),
      frete: Math.max(0, Number(frete) || 0),
      condicao: condicao.trim(),
    };
    setCotacoes((atual) => atual.map((c) => (c.id === selecionada.id ? { ...c, propostas: [...c.propostas, proposta] } : c)));
    setFornecedorId('');
    setPreco('');
    setPrazo('');
    setFrete('0');
    setCondicao('');
  };

  const removerProposta = (cotacaoId: string, propostaId: string) =>
    setCotacoes((atual) =>
      atual.map((c) => (c.id === cotacaoId ? { ...c, propostas: c.propostas.filter((p) => p.id !== propostaId) } : c)),
    );

  const excluirCotacao = (c: Cotacao) => {
    if (!window.confirm(`Excluir a cotação de "${c.item}"?`)) return;
    setCotacoes((atual) => atual.filter((x) => x.id !== c.id));
    if (selecionadaId === c.id) setSelecionadaId(null);
  };

  return (
    <div className="gf-cotacoes">
      <aside className="gf-cotacoes__lista">
        <form className="gf-form gf-form--compacto" onSubmit={criarCotacao}>
          <h3>Nova cotação</h3>
          <Campo rotulo="Item">
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex.: Papel A4 (caixa)" />
          </Campo>
          <Campo rotulo="Quantidade">
            <input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Campo>
          <button type="submit" className="gf-btn gf-btn--primario">
            Criar cotação
          </button>
        </form>

        <ul className="gf-lista-cot">
          {cotacoes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={c.id === selecionadaId ? 'is-ativo' : ''}
                aria-pressed={c.id === selecionadaId}
                onClick={() => setSelecionadaId(c.id)}
              >
                <strong>{c.item}</strong>
                <span className="gf-sub">
                  {c.quantidade} un. · {c.propostas.length} proposta(s) · {dataBR(c.criadaEm)}
                </span>
                {c.pedidoId && <span className="gf-selo gf-selo--ok">Pedido gerado</span>}
              </button>
            </li>
          ))}
          {cotacoes.length === 0 && <li className="gf-vazio">Nenhuma cotação criada.</li>}
        </ul>
      </aside>

      <div className="gf-cotacoes__detalhe">
        {!selecionada ? (
          <p className="gf-vazio">Selecione ou crie uma cotação para comparar propostas.</p>
        ) : (
          <>
            <header className="gf-detalhe-topo">
              <div>
                <h2>{selecionada.item}</h2>
                <span className="gf-sub">Quantidade: {selecionada.quantidade} un.</span>
              </div>
              <button type="button" className="gf-btn gf-btn--leve gf-btn--perigo" onClick={() => excluirCotacao(selecionada)}>
                Excluir cotação
              </button>
            </header>

            {selecionada.propostas.length === 0 ? (
              <p className="gf-vazio">Adicione propostas de fornecedores para comparar.</p>
            ) : (
              <div className="gf-tabela-wrap">
                <table className="gf-tabela">
                  <thead>
                    <tr>
                      <th>Fornecedor</th>
                      <th>Preço unit.</th>
                      <th>Frete</th>
                      <th>Total</th>
                      <th>Prazo</th>
                      <th>Condição</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {selecionada.propostas.map((p) => (
                      <tr key={p.id} className={p.id === melhores.preco ? 'gf-linha-destaque' : ''}>
                        <td>
                          <strong>{nomeForn(p.fornecedorId)}</strong>
                          <div className="gf-badges">
                            {p.id === melhores.preco && <span className="gf-selo gf-selo--ok">Menor custo</span>}
                            {p.id === melhores.prazo && <span className="gf-selo gf-selo--info">Mais rápido</span>}
                          </div>
                        </td>
                        <td>{brl(p.precoUnit)}</td>
                        <td>{brl(p.frete)}</td>
                        <td>
                          <strong>{brl(totalProposta(selecionada, p))}</strong>
                        </td>
                        <td>{p.prazoDias} dias</td>
                        <td>{p.condicao || '—'}</td>
                        <td className="gf-tabela__acoes">
                          <button
                            type="button"
                            className="gf-btn gf-btn--primario"
                            disabled={!!selecionada.pedidoId}
                            onClick={() => gerarPedido(selecionada, p)}
                          >
                            Gerar pedido
                          </button>
                          <button
                            type="button"
                            className="gf-btn gf-btn--leve gf-btn--perigo"
                            disabled={!!selecionada.pedidoId}
                            onClick={() => removerProposta(selecionada.id, p.id)}
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!selecionada.pedidoId && (
              <form className="gf-form" onSubmit={adicionarProposta}>
                <h3>Adicionar proposta</h3>
                <div className="gf-form__grade">
                  <Campo rotulo="Fornecedor">
                    <select value={fornecedorId} onChange={(e) => escolherFornecedor(e.target.value)}>
                      <option value="">Selecione</option>
                      {disponiveis.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nome}
                        </option>
                      ))}
                    </select>
                  </Campo>
                  <Campo rotulo="Preço unitário (R$)">
                    <input type="number" min={0} step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
                  </Campo>
                  <Campo rotulo="Prazo (dias)">
                    <input type="number" min={0} value={prazo} onChange={(e) => setPrazo(e.target.value)} />
                  </Campo>
                  <Campo rotulo="Frete (R$)">
                    <input type="number" min={0} step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
                  </Campo>
                  <Campo rotulo="Condição de pagamento">
                    <input value={condicao} onChange={(e) => setCondicao(e.target.value)} placeholder="Ex.: 28 dias" />
                  </Campo>
                </div>
                <div className="gf-acoes">
                  <button type="submit" className="gf-btn gf-btn--primario" disabled={!fornecedorId}>
                    Adicionar proposta
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ========== Pedidos ========== */

interface AbaPedidosProps {
  fornecedores: Fornecedor[];
  pedidos: Pedido[];
  setPedidos: Dispatch<SetStateAction<Pedido[]>>;
  proximoNumero: () => string;
}

function AbaPedidos({ fornecedores, pedidos, setPedidos, proximoNumero }: AbaPedidosProps) {
  const [filtro, setFiltro] = useState<StatusPedido | 'todos'>('todos');
  const [aberto, setAberto] = useState(false);

  const [fornecedorId, setFornecedorId] = useState('');
  const [item, setItem] = useState('');
  const [qtd, setQtd] = useState('');
  const [preco, setPreco] = useState('');
  const [frete, setFrete] = useState('0');
  const [previsao, setPrevisao] = useState('');

  const nomeForn = (id: string) => fornecedores.find((f) => f.id === id)?.nome ?? 'Fornecedor removido';
  const total = (p: Pedido) => p.precoUnit * p.quantidade + p.frete;

  const lista = pedidos.filter((p) => filtro === 'todos' || p.status === filtro);

  const resumo = useMemo(() => {
    const emAberto = pedidos.filter((p) => p.status === 'pendente' || p.status === 'enviado');
    const atrasados = emAberto.filter((p) => p.previsao && p.previsao < hoje());
    return {
      abertos: emAberto.length,
      valorAberto: emAberto.reduce((acc, p) => acc + total(p), 0),
      atrasados: atrasados.length,
    };
  }, [pedidos]);

  const mudarStatus = (id: string, status: StatusPedido) =>
    setPedidos((atual) => atual.map((p) => (p.id === id ? { ...p, status } : p)));

  const criar = (e: FormEvent) => {
    e.preventDefault();
    if (!fornecedorId || !item.trim() || Number(qtd) <= 0 || Number(preco) <= 0) return;
    setPedidos((atual) => [
      {
        id: uid(),
        numero: proximoNumero(),
        fornecedorId,
        item: item.trim(),
        quantidade: Number(qtd),
        precoUnit: Number(preco),
        frete: Math.max(0, Number(frete) || 0),
        previsao,
        status: 'pendente',
        criadoEm: hoje(),
      },
      ...atual,
    ]);
    setFornecedorId('');
    setItem('');
    setQtd('');
    setPreco('');
    setFrete('0');
    setPrevisao('');
    setAberto(false);
  };

  return (
    <div>
      <div className="gf-resumo">
        <div>
          <span>Pedidos em aberto</span>
          <strong>{resumo.abertos}</strong>
        </div>
        <div>
          <span>Valor em aberto</span>
          <strong>{brl(resumo.valorAberto)}</strong>
        </div>
        <div className={resumo.atrasados > 0 ? 'is-alerta' : ''}>
          <span>Entregas atrasadas</span>
          <strong>{resumo.atrasados}</strong>
        </div>
      </div>

      <div className="gf-barra">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar por status">
          <option value="todos">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as StatusPedido[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="button" className="gf-btn gf-btn--primario" onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Fechar formulário' : 'Novo pedido de reposição'}
        </button>
      </div>

      {aberto && (
        <form className="gf-form" onSubmit={criar}>
          <h3>Novo pedido de reposição</h3>
          <div className="gf-form__grade">
            <Campo rotulo="Fornecedor">
              <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                <option value="">Selecione</option>
                {fornecedores
                  .filter((f) => f.ativo)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
              </select>
            </Campo>
            <Campo rotulo="Item">
              <input value={item} onChange={(e) => setItem(e.target.value)} />
            </Campo>
            <Campo rotulo="Quantidade">
              <input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} />
            </Campo>
            <Campo rotulo="Preço unitário (R$)">
              <input type="number" min={0} step="0.01" value={preco} onChange={(e) => setPreco(e.target.value)} />
            </Campo>
            <Campo rotulo="Frete (R$)">
              <input type="number" min={0} step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} />
            </Campo>
            <Campo rotulo="Previsão de entrega">
              <input type="date" value={previsao} min={hoje()} onChange={(e) => setPrevisao(e.target.value)} />
            </Campo>
          </div>
          <div className="gf-acoes">
            <button type="submit" className="gf-btn gf-btn--primario">
              Criar pedido
            </button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        <p className="gf-vazio">Nenhum pedido com esse filtro.</p>
      ) : (
        <div className="gf-tabela-wrap">
          <table className="gf-tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fornecedor</th>
                <th>Item</th>
                <th>Total</th>
                <th>Previsão</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const atrasado = (p.status === 'pendente' || p.status === 'enviado') && p.previsao && p.previsao < hoje();
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.numero}</strong>
                      <div className="gf-sub">{dataBR(p.criadoEm)}</div>
                    </td>
                    <td>{nomeForn(p.fornecedorId)}</td>
                    <td>
                      {p.item}
                      <div className="gf-sub">
                        {p.quantidade} un. × {brl(p.precoUnit)}
                      </div>
                    </td>
                    <td>{brl(total(p))}</td>
                    <td className={atrasado ? 'gf-atrasado' : ''}>
                      {dataBR(p.previsao)}
                      {atrasado && <div className="gf-sub">Atrasado</div>}
                    </td>
                    <td>
                      <span className={`gf-selo gf-selo--${p.status}`}>{STATUS_LABEL[p.status]}</span>
                    </td>
                    <td className="gf-tabela__acoes">
                      {p.status === 'pendente' && (
                        <button type="button" className="gf-btn gf-btn--primario" onClick={() => mudarStatus(p.id, 'enviado')}>
                          Marcar enviado
                        </button>
                      )}
                      {p.status === 'enviado' && (
                        <button type="button" className="gf-btn gf-btn--primario" onClick={() => mudarStatus(p.id, 'recebido')}>
                          Confirmar recebimento
                        </button>
                      )}
                      {(p.status === 'pendente' || p.status === 'enviado') && (
                        <button type="button" className="gf-btn gf-btn--leve gf-btn--perigo" onClick={() => mudarStatus(p.id, 'cancelado')}>
                          Cancelar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ========== Componente principal ========== */

const CABECALHOS: Record<Aba, { titulo: string; descricao: string }> = {
  fornecedores: { titulo: 'Fornecedores', descricao: 'Cadastro dos parceiros fornecedores.' },
  cotacoes: { titulo: 'Cotações', descricao: 'Compare propostas e escolha a melhor para gerar o pedido.' },
  pedidos: { titulo: 'Pedidos de reposição', descricao: 'Acompanhe pedidos em aberto, entregas e recebimentos.' },
};

export default function GestaoFornecedores() {
  const [aba, setAba] = useState<Aba>('fornecedores');
  const [fornecedores, setFornecedores] = useLocalState<Fornecedor[]>('gf:fornecedores', FORNECEDORES_INICIAIS);
  const [cotacoes, setCotacoes] = useLocalState<Cotacao[]>('gf:cotacoes', []);
  const [pedidos, setPedidos] = useLocalState<Pedido[]>('gf:pedidos', []);

  const proximoNumero = () => {
    const maior = pedidos.reduce((acc, p) => Math.max(acc, Number(p.numero.replace(/\D/g, '')) || 0), 0);
    return `PC-${String(maior + 1).padStart(4, '0')}`;
  };

  const gerarPedido = (c: Cotacao, p: Proposta) => {
    const pedido: Pedido = {
      id: uid(),
      numero: proximoNumero(),
      fornecedorId: p.fornecedorId,
      item: c.item,
      quantidade: c.quantidade,
      precoUnit: p.precoUnit,
      frete: p.frete,
      previsao: somarDias(hoje(), p.prazoDias),
      status: 'pendente',
      criadoEm: hoje(),
      cotacaoId: c.id,
    };
    setPedidos((atual) => [pedido, ...atual]);
    setCotacoes((atual) => atual.map((x) => (x.id === c.id ? { ...x, pedidoId: pedido.id } : x)));
    setAba('pedidos');
  };

  const abas: NavItem<Aba>[] = [
    { id: 'fornecedores', label: 'Fornecedores', badge: fornecedores.length },
    { id: 'cotacoes', label: 'Cotações', badge: cotacoes.length },
    { id: 'pedidos', label: 'Pedidos', badge: pedidos.length },
  ];

  const { titulo, descricao } = CABECALHOS[aba];

  return (
    <div className="gf">
      <Navbar<Aba> marca="Compras" itens={abas} ativo={aba} onChange={setAba} />

      <main className="gf-conteudo">
        <header className="gf-cabecalho">
          <h1>{titulo}</h1>
          <p>{descricao}</p>
        </header>

        <div className="gf-painel">
          {aba === 'fornecedores' && (
            <AbaFornecedores fornecedores={fornecedores} setFornecedores={setFornecedores} pedidos={pedidos} />
          )}
          {aba === 'cotacoes' && (
            <AbaCotacoes fornecedores={fornecedores} cotacoes={cotacoes} setCotacoes={setCotacoes} gerarPedido={gerarPedido} />
          )}
          {aba === 'pedidos' && (
            <AbaPedidos fornecedores={fornecedores} pedidos={pedidos} setPedidos={setPedidos} proximoNumero={proximoNumero} />
          )}
        </div>
      </main>
    </div>
  );
}