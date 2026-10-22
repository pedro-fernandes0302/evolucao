import { useState } from 'react'
import GestaoFornecedores from './componets/GestaoFornecedores'
import { ModuloChamados } from './componets/Gestao'
import Navbar, { type NavItem } from './componets/Navbar'
import './App.css'

type Secao = 'chamados' | 'fornecedores'

const secoes: NavItem<Secao>[] = [
  { id: 'chamados', label: 'Chamados' },
  { id: 'fornecedores', label: 'Fornecedores' },
]

function App() {
  const [secaoAtiva, setSecaoAtiva] = useState<Secao>('chamados')

  return (
    <>
      <Navbar<Secao>
        marca="Gestão Predial"
        itens={secoes}
        ativo={secaoAtiva}
        onChange={setSecaoAtiva}
      />
      {secaoAtiva === 'chamados' ? <ModuloChamados /> : <GestaoFornecedores />}
    </>
  )
}

export default App
