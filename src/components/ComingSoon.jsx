import { PageHeader } from './PageHeader';
import { Card } from './ui';

export function ComingSoon({ crumb, title, subtitle, note }) {
  return (
    <div>
      <PageHeader crumb={crumb} title={title} subtitle={subtitle} />
      <Card className="p-8 text-center">
        <div className="font-bold text-[14.5px] mb-1">Este módulo está na próxima etapa do desenvolvimento</div>
        <div className="text-[13px] text-muted max-w-md mx-auto">{note}</div>
      </Card>
    </div>
  );
}
