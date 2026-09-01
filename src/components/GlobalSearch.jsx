import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../hooks/useCollection';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icons';
import { money } from '../lib/format';

// Busca global instantânea em Produtos, Clientes, Pedidos, Categorias,
// Entradas, Saídas e (quando a feature "agenda" está ligada) Agendamentos,
// Serviços e Profissionais — filtra o que já está carregado em tempo real
// (mesmos dados que alimentam as telas) e navega pro módulo ao clicar.
export function GlobalSearch() {
  const navigate = useNavigate();
  const { hasFeature } = useAuth();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const { data: produtos } = useCollection('produtos', { orderByField: 'nome', direction: 'asc' });
  const { data: clientes } = useCollection('clientes', { orderByField: 'nome', direction: 'asc' });
  const { data: pedidos } = useCollection('pedidos');
  const { data: categorias } = useCollection('categorias', { orderByField: 'nome', direction: 'asc' });
  const { data: entradas } = useCollection('entradas');
  const { data: saidas } = useCollection('saidas');
  const { data: agendamentos } = useCollection('agendamentos');
  const { data: servicos } = useCollection('servicos', { orderByField: 'nome', direction: 'asc' });
  const { data: profissionais } = useCollection('profissionais', { orderByField: 'nome', direction: 'asc' });

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const match = (s) => (s || '').toLowerCase().includes(q);

    return {
      produtos: produtos.filter((p) => match(p.nome) || match(p.sku) || match(p.codigoBarras)).slice(0, 5),
      clientes: clientes.filter((c) => match(c.nome) || match(c.whatsapp) || match(c.email)).slice(0, 5),
      pedidos: pedidos.filter((p) => match(p.id) || match(p.clienteNome)).slice(0, 5),
      categorias: categorias.filter((c) => match(c.nome)).slice(0, 5),
      entradas: entradas.filter((e) => match(e.descricao) || match(e.categoria)).slice(0, 5),
      saidas: saidas.filter((s) => match(s.descricao) || match(s.categoria) || match(s.fornecedor)).slice(0, 5),
      agendamentos: agendamentos.filter((a) => match(a.clienteNome) || match(a.servicoNome) || match(a.profissionalNome)).slice(0, 5),
      servicos: servicos.filter((s) => match(s.nome) || match(s.categoria)).slice(0, 5),
      profissionais: profissionais.filter((p) => match(p.nome) || match(p.telefone)).slice(0, 5),
    };
  }, [query, produtos, clientes, pedidos, categorias, entradas, saidas, agendamentos, servicos, profissionais]);

  const totalResults = results
    ? Object.values(results).reduce((s, arr) => s + arr.length, 0)
    : 0;

  function go(path) {
    navigate(path);
    setOpen(false);
    setQuery('');
  }

  const sections = results ? [
    { key: 'produtos', label: 'Produtos', items: results.produtos, render: (p) => `${p.nome} · ${p.sku}`, path: '/produtos' },
    { key: 'clientes', label: 'Clientes', items: results.clientes, render: (c) => c.nome, path: '/clientes' },
    { key: 'pedidos', label: 'Pedidos', items: results.pedidos, render: (p) => `${p.clienteNome} · ${money(p.valorTotal)}`, path: '/pedidos' },
    { key: 'categorias', label: 'Categorias', items: results.categorias, render: (c) => c.nome, path: '/categorias' },
    { key: 'entradas', label: 'Entradas', items: results.entradas, render: (e) => `${e.descricao} · ${money(e.valor)}`, path: '/entradas' },
    { key: 'saidas', label: 'Saídas', items: results.saidas, render: (s) => `${s.descricao} · ${money(s.valor)}`, path: '/saidas' },
    ...(hasFeature('agenda') ? [
      { key: 'agendamentos', label: 'Agendamentos', items: results.agendamentos, render: (a) => `${a.clienteNome} · ${a.servicoNome} · ${a.data}`, path: '/agenda' },
      { key: 'servicos', label: 'Serviços', items: results.servicos, render: (s) => `${s.nome} · ${money(s.preco)}`, path: '/servicos' },
      { key: 'profissionais', label: 'Profissionais', items: results.profissionais, render: (p) => p.nome, path: '/profissionais' },
    ] : []),
  ].filter((s) => s.items.length > 0) : [];

  return (
    <div ref={boxRef} className="relative flex-1 max-w-[420px] hidden sm:block">
      <div className="flex items-center gap-2 bg-bg-soft border border-line rounded-[10px] px-3 py-2 text-faint">
        <Icon.search className="w-4 h-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); e.target.blur(); } }}
          placeholder="Pesquisar produtos, clientes, pedidos, SKU..."
          className="bg-transparent outline-none text-[13.5px] text-ink w-full"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-faint hover:text-ink">
            <Icon.x className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-white border border-line rounded-xl shadow-card-lg max-h-[70vh] overflow-y-auto z-50">
          {totalResults === 0 ? (
            <div className="text-center py-6 text-[12.5px] text-faint">Nenhum resultado para "{query}"</div>
          ) : (
            sections.map((s) => (
              <div key={s.key} className="py-1.5">
                <div className="text-[10.5px] font-bold text-faint uppercase tracking-wider px-3.5 pt-1.5 pb-1">{s.label}</div>
                {s.items.map((item) => (
                  <button key={item.id} onClick={() => go(s.path)}
                    className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-bg-soft flex items-center justify-between gap-2">
                    <span className="truncate">{s.render(item)}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
