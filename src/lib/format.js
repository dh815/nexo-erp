export function money(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dateBR(value) {
  if (!value) return '—';
  const d = value?.toDate ? value.toDate() : new Date(value);
  return d.toLocaleDateString('pt-BR');
}
