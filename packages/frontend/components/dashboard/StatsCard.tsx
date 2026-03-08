interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend: string;
  color?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  trend,
  color = 'primary',
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground mb-2">{value}</h3>
          <p className="text-xs text-muted">{trend}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
