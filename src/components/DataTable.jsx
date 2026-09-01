import { Icon } from './Icons';
import { EmptyState, TableSkeleton } from './ui';

export function DataTable({ columns, rows, loading, onEdit, onDelete, emptyMessage = 'Nenhum registro encontrado.' }) {
  if (loading) return <TableSkeleton columns={columns.length} />;
  if (!rows.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="text-left text-[11px] uppercase tracking-wider text-faint font-bold pb-2.5 px-3.5 border-b border-line whitespace-nowrap">
                {c.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="border-b border-line" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-bg-soft">
              {columns.map((c) => (
                <td key={c.key} className="px-3.5 py-3 border-b border-[#f0f2f8] whitespace-nowrap">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="px-3.5 py-3 border-b border-[#f0f2f8] whitespace-nowrap">
                  <span className="flex gap-0.5">
                    {onEdit && (
                      <button onClick={() => onEdit(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-primary-dark">
                        <Icon.edit className="w-[14px] h-[14px]" />
                      </button>
                    )}
                    {onDelete && (
                      <button onClick={() => onDelete(row)} className="w-7 h-7 rounded-lg flex items-center justify-center text-faint hover:bg-bg-soft-2 hover:text-danger">
                        <Icon.trash className="w-[14px] h-[14px]" />
                      </button>
                   )}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
