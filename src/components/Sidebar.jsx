import { NavLink } from 'react-router-dom';
import { Icon } from './Icons';
import { useAuth } from '../context/AuthContext';

const groups = [
  { label: 'Visão geral', items: [
    { to: '/', label: 'Dashboard', icon: Icon.grid, end: true },
  ]},
  { label: 'Agenda', items: [
    { to: '/agenda', label: 'Agenda', icon: Icon.calendarPlus, feature: 'agenda' },
    { to: '/servicos', label: 'Serviços', icon: Icon.scissors, feature: 'agenda' },
    { to: '/profissionais', label: 'Profissionais', icon: Icon.userCheck, feature: 'agenda' },
  ]},
  { label: 'Financeiro', items: [
    { to: '/entradas', label: 'Entradas', icon: Icon.arrowDown },
    { to: '/saidas', label: 'Saídas', icon: Icon.arrowUp },
    { to: '/financeiro', label: 'Financeiro', icon: Icon.wallet },
    { to: '/calendario', label: 'Calendário', icon: Icon.calendar },
  ]},
  { label: 'Vendas', items: [
    { to: '/pedidos', label: 'Pedidos de Venda', icon: Icon.cart },
    { to: '/calculadora', label: 'Calculadora', icon: Icon.calc },
    { to: '/clientes', label: 'Clientes', icon: Icon.users },
  ]},
  { label: 'Catálogo', items: [
    { to: '/produtos', label: 'Produtos', icon: Icon.box },
    { to: '/categorias', label: 'Categorias', icon: Icon.tag },
    { to: '/estoque', label: 'Estoque', icon: Icon.layers },
  ]},
  { label: 'Compras', items: [
    { to: '/compras', label: 'Compras', icon: Icon.bag },
  ]},
  { label: 'Notas Fiscais', items: [
    { to: '/notas-entrada', label: 'NFs de Entrada', icon: Icon.arrowDown },
    { to: '/notas-saida', label: 'NFs de Saída', icon: Icon.arrowUp },
  ]},
  { label: 'Sistema', items: [
    { to: '/relatorios', label: 'Relatórios', icon: Icon.chart },
    { to: '/configuracoes', label: 'Configurações', icon: Icon.settings },
  ]},
];

export function Sidebar({ open, onNavigate }) {
  const { hasFeature, empresa } = useAuth();
  // Item com "feature" só aparece se empresas/{id}.features[chave] === true.
  // Item sem "feature" aparece pra todo mundo, como sempre.
  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((item) => !item.feature || hasFeature(item.feature)) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className={`w-[242px] shrink-0 bg-white border-r border-line flex flex-col fixed top-0 bottom-0 left-0 z-40 transition-transform
      ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex items-center gap-2.5 px-5 pt-[22px] pb-[18px]">
        <div className="w-[34px] h-[34px] rounded-[10px] bg-gradient-to-br from-[#9c8ff2] to-primary flex items-center justify-center text-white font-extrabold text-[15px] shrink-0 font-display">N</div>
        <div>
          <div className="font-extrabold text-[17px] tracking-tight font-display leading-none">NEXO</div>
          <div className="text-[10.5px] text-faint font-bold tracking-wider uppercase mt-0.5 truncate">Negócio no automático</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            <div className="text-[10.5px] font-bold text-faint uppercase tracking-wider px-2.5 pt-4 pb-1.5">{g.label}</div>
            {g.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-[11px] px-3 py-2 rounded-[10px] text-[13.5px] font-semibold mb-0.5 ${
                    isActive ? 'bg-primary-light text-primary-dark' : 'text-muted hover:bg-bg-soft hover:text-ink'
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      {/* Rodapé com a empresa logada, com base em dados reais (empresas/{id}.nome).
          Antes mostrava um card fixo de "Plano Profissional — 620/1.000 pedidos",
          com número inventado sem nenhuma consulta ao banco. Removido até existir
          cobrança/planos de verdade (Fase 9 do roadmap). */}
      <div className="px-5 py-5 border-t border-line">
        <div className="bg-bg-soft rounded-xl p-3 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary-dark flex items-center justify-center font-extrabold text-[13px] shrink-0 font-display">
            {(empresa?.nome || '?').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-ink truncate">{empresa?.nome || 'Sua empresa'}</div>
            <div className="text-[10.5px] text-faint">Conta ativa</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
