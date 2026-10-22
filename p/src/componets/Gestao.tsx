// Gestão de Chamados de Manutenção Predial
import { useId, useState } from 'react'
import './Chamados.css'

export interface problemaProps {
  nome: string;
  prioridade: number;
  descricao: string;
  categoria: string;
  status?: boolean;
  local: string;
}

/* ---------- Prioridades ---------- */
const PRIORIDADES = [
  { valor: 1, rotulo: 'Baixa' },
  { valor: 2, rotulo: 'Média' },
  { valor: 3, rotulo: 'Importante' },
  { valor: 4, rotulo: 'Alta' },
  { valor: 5, rotulo: 'Extrema' },
]

const CATEGORIAS = ['Elétrica', 'Hidráulica', 'Estrutural', 'Climatização', 'Limpeza', 'Segurança', 'Outros']

// Converte qualquer valor em um nível de 0 (desconhecida) a 5 (extrema)
function nivelPrioridade(prioridade?: number): number {
  return prioridade !== undefined && prioridade >= 1 ? Math.min(Math.floor(prioridade), 5) : 0
}

function rotuloPrioridade(nivel: number): string {
  return nivel === 0 ? 'Desconhecida' : PRIORIDADES[nivel - 1].rotulo
}

/* ---------- Nav ---------- */
export function Nav() {
  return (
    <nav className="nav">
      <h1>Gestão de Chamados de Manutenção Predial</h1>
    </nav>
  )
}

/* ---------- Register (formulário) ---------- */
interface RegisterProps {
  onRegister: (problema: problemaProps) => void;
}

export function Register({ onRegister }: RegisterProps) {
  const [nome, setNome] = useState('')
  const [prioridade, setPrioridade] = useState<number | undefined>(undefined)
  const [descricao, setDescricao] = useState('')
  const [categoria, setCategoria] = useState('')
  const [local, setLocal] = useState('')

  function limpar() {
    setNome('')
    setPrioridade(undefined)
    setDescricao('')
    setCategoria('')
    setLocal('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault() // Garante que a página NÃO vai recarregar

    onRegister({
      nome: nome.trim(),
      prioridade: prioridade ?? 0,
      descricao: descricao.trim(),
      categoria: categoria.trim(),
      status: false,
      local: local.trim(),
    })
    limpar()
  }

  return (
    <section className="Register">
      <h2>Registrar Pedros</h2>
      <p className="ajuda">Preencha os campos abaixo. Os campos marcados com * são obrigatórios.</p>

      <form onSubmit={handleSubmit}>
        <div className="campo">
          <label htmlFor="reg-nome" className="obrigatorio">Nome do problema</label>
          <input id="reg-nome" type="text" placeholder="Ex.: Vazamento no banheiro" required
            value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div className="campo">
          <label htmlFor="reg-prioridade" className="obrigatorio">Prioridade</label>
          <select id="reg-prioridade" required value={prioridade ?? ''}
            onChange={(e) => setPrioridade(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">Selecione...</option>
            {PRIORIDADES.map((p) => (
              <option key={p.valor} value={p.valor}>{p.valor} - {p.rotulo}</option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="reg-categoria" className="obrigatorio">Categoria</label>
          <input id="reg-categoria" type="text" list="reg-categorias" placeholder="Ex.: Hidráulica" required
            value={categoria} onChange={(e) => setCategoria(e.target.value)} />
          <datalist id="reg-categorias">
            {CATEGORIAS.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>

        <div className="campo">
          <label htmlFor="reg-local" className="obrigatorio">Local</label>
          <input id="reg-local" type="text" placeholder="Ex.: Bloco B, 2º andar" required
            value={local} onChange={(e) => setLocal(e.target.value)} />
        </div>

        <div className="campo campo-largo">
          <label htmlFor="reg-descricao" className="obrigatorio">Descrição</label>
          <textarea id="reg-descricao" rows={4} placeholder="Descreva o problema com o máximo de detalhes" required
            value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        <div className="acoes">
          <button type="submit" className="botao-primario">Registrar</button>
          <button type="button" className="botao-secundario" onClick={limpar}>Limpar</button>
        </div>
      </form>
    </section>
  )
}

export function ModuloChamados() {
  const [chamados, setChamados] = useState<problemaProps[]>([])

  return (
    <main className="App">
      <Nav />
      <Register onRegister={(chamado) => setChamados((atuais) => [...atuais, chamado])} />
      <section className="tarefa-list" aria-label="Chamados registrados">
        {chamados.map((chamado, index) => (
          <Card key={index} {...chamado} />
        ))}
      </section>
    </main>
  )
}

/* ---------- Card (details) ---------- */
export default function Card({ nome, prioridade, descricao, categoria, status, local }: problemaProps) {
  const id = useId()
  const [solucao, setSolucao] = useState('')
  const [concluido, setConcluido] = useState(status ?? false)
  const nivel = nivelPrioridade(prioridade)

  return (
    <details className="card" data-prioridade={nivel} data-concluido={concluido}>
      <summary>
        <span className="card-titulo">{nome}</span>
        <span className="badge badge-prioridade">{rotuloPrioridade(nivel)}</span>
        <span className="badge badge-status">{concluido ? 'Concluído' : 'Pendente'}</span>
      </summary>

      <div className="card-corpo">
        <dl className="card-info">
          <div>
            <dt>Descrição</dt>
            <dd>{descricao || '—'}</dd>
          </div>
          <div>
            <dt>Categoria</dt>
            <dd>{categoria || '—'}</dd>
          </div>
          <div>
            <dt>Local</dt>
            <dd>{local || '—'}</dd>
          </div>
        </dl>

        <div className="campo">
          <label htmlFor={`${id}-solucao`}>Solução</label>
          <input id={`${id}-solucao`} type="text" placeholder="Descreva a solução"
            value={solucao} onChange={(e) => setSolucao(e.target.value)} />
        </div>

        <button type="button" className="botao-concluir" onClick={() => setConcluido(true)}>
          Concluir
        </button>

        <label className="check">
          <input type="checkbox" checked={concluido} onChange={(e) => setConcluido(e.target.checked)} />
          <span>{concluido ? 'Concluído' : 'Pendente'}</span>
        </label>
      </div>
    </details>
  )
}