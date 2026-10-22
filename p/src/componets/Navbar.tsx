import './Navbar.css';

export interface NavItem<T extends string = string> {
  id: T;
  label: string;
  badge?: number;
}

interface NavbarProps<T extends string> {
  marca: string;
  itens: NavItem<T>[];
  ativo: T;
  onChange: (id: T) => void;
}

export default function Navbar<T extends string>({ marca, itens, ativo, onChange }: NavbarProps<T>) {
  return (
    <header className="app-nav">
      <div className="app-nav__interno">
        <span className="app-nav__marca">{marca}</span>
        <nav className="app-nav__menu" aria-label="Seções">
          <ul>
            {itens.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`app-nav__botao${item.id === ativo ? ' is-ativo' : ''}`}
                  aria-current={item.id === ativo ? 'page' : undefined}
                  onClick={() => onChange(item.id)}
                >
                  {item.label}
                  {item.badge !== undefined && <span className="app-nav__badge">{item.badge}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
