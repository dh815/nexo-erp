import { Icon } from './Icons';
import { Button } from './ui';

export function PageHeader({ crumb, title, subtitle, actionLabel, onAction }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
      <div>
        {crumb && <div className="text-[11.5px] text-faint font-bold uppercase tracking-wider mb-1">{crumb}</div>}
        <h1 className="text-[22px] font-extrabold tracking-tight font-display">{title}</h1>
        {subtitle && <div className="text-[13px] text-muted mt-1">{subtitle}</div>}
      </div>
      {actionLabel && (
        <Button onClick={onAction}>
          <Icon.plus className="w-[15px] h-[15px]" /> {actionLabel}
        </Button>
      )}
    </div>
  );
}
