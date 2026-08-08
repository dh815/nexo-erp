import { Icon } from './Icons';

export function Card({ className = '', children }) {
  return (
    <div className={`bg-white border border-line rounded-2xl shadow-card ${className}`}>
      {children}
    </div>
  );
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
  const variants = {
    primary: 'bg-primary text-white shadow-[0_6px_16px_rgba(46,94,255,0.28)] hover:bg-primary-dark',
    ghost: 'bg-white text-ink border border-line hover:bg-bg-soft',
    danger: 'bg-danger-bg text-danger hover:bg-red-100',
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

const pillColors = {
  green: 'bg-success-bg text-success',
  red: 'bg-danger-bg text-danger',
  orange: 'bg-warning-bg text-warning',
  blue: 'bg-primary-light text-primary-dark',
  gray: 'bg-bg-soft-2 text-muted',
};
export function Pill({ color = 'gray', children }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${pillColors[color]}`}>
      ● {children}
    </span>
  );
}

export function StatCard({ icon: IconCmp, color, trend, num, label }) {
  const iconColors = {
    blue: 'bg-primary-light text-primary',
    green: 'bg-success-bg text-success',
    orange: 'bg-warning-bg text-warning',
    red: 'bg-danger-bg text-danger',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColors[color]}`}>
          <IconCmp className="w-[18px] h-[18px]" />
        </div>
        {trend && (
          <span className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${trend.dir === 'up' ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg'}`}>
            {trend.val}
          </span>
        )}
      </div>
      <div className="text-[23px] font-extrabold tracking-tight mt-3.5 font-display">{num}</div>
      <div className="text-[12.5px] text-muted mt-1 font-medium">{label}</div>
    </Card>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3 className="font-bold text-[15px]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-soft text-faint">
            <Icon.x className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-3">
      <span className="text-[11.5px] font-bold text-muted mb-1.5 block">{label}</span>
      {children}
    </div>
  );
}

export const inputClass = 'w-full border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-primary';

export function EmptyState({ message }) {
  return <div className="text-center py-10 text-[12.5px] text-faint">{message}</div>;
}

export function Loading() {
  return <div className="text-center py-10 text-[12.5px] text-faint">Carregando...</div>;
}
