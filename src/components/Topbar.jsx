import { Icon } from './Icons';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export function Topbar({ onMenuClick }) {
  const { user, empresa, logout } = useAuth();
  const displayName = user?.displayName || user?.email || 'Usuário';

  return (
    <div className="h-[66px] bg-white border-b border-line flex items-center gap-4 px-4 md:px-6 sticky top-0 z-30">
      <button onClick={onMenuClick} className="md:hidden w-[34px] h-[34px] flex items-center justify-center rounded-lg hover:bg-bg-soft">
        <Icon.menu className="w-[18px] h-[18px]" />
      </button>
      <div className="flex-1 max-w-[420px] hidden sm:flex items-center gap-2 bg-bg-soft border border-line rounded-[10px] px-3 py-2 text-faint">
        <Icon.search className="w-4 h-4 shrink-0" />
        <input placeholder="Pesquisar produtos, clientes, pedidos, SKU..." className="bg-transparent outline-none text-[13.5px] text-ink w-full" />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <button className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-muted hover:bg-bg-soft relative">
          <Icon.bell className="w-[19px] h-[19px]" />
          <span className="absolute top-[7px] right-2 w-[7px] h-[7px] bg-danger rounded-full border-2 border-white" />
        </button>
        <button onClick={logout} title="Sair" className="flex items-center gap-2 pl-[5px] pr-2.5 py-[5px] rounded-full border border-line hover:bg-bg-soft">
          <div className="w-[29px] h-[29px] rounded-full bg-gradient-to-br from-[#6f8dff] to-primary flex items-center justify-center text-white text-xs font-bold">
            {initials(displayName)}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold leading-tight">{displayName}</div>
            <div className="text-[10.5px] text-faint leading-tight">{empresa?.nome || 'Minha empresa'}</div>
          </div>
        </button>
      </div>
    </div>
  );
}
