// Exportação simples de dados para CSV (funciona 100% no navegador, sem backend).
export function exportCSV(filename, rows, columns) {
  const header = columns.map((c) => c.label).join(';');
  const body = rows.map((row) =>
    columns.map((c) => {
      const raw = c.value(row);
      const value = raw === null || raw === undefined ? '' : String(raw);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(';')
  ).join('\n');

  const csv = '\uFEFF' + header + '\n' + body; // BOM para acentuação abrir certo no Excel
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
