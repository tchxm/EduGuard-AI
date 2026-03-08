interface StatsSummaryProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function StatsSummary({ dateRange }: StatsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-border p-6">
        <p className="text-sm text-muted mb-1">Total Records</p>
        <p className="text-2xl font-bold text-foreground">2,450</p>
        <p className="text-xs text-muted mt-2">+12% from last period</p>
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <p className="text-sm text-muted mb-1">Average Attendance</p>
        <p className="text-2xl font-bold text-green-600">90.2%</p>
        <p className="text-xs text-muted mt-2">Across all classes</p>
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <p className="text-sm text-muted mb-1">Total Absences</p>
        <p className="text-2xl font-bold text-red-600">245</p>
        <p className="text-xs text-muted mt-2">-8% from last period</p>
      </div>

      <div className="bg-white rounded-lg border border-border p-6">
        <p className="text-sm text-muted mb-1">Classes Tracked</p>
        <p className="text-2xl font-bold text-primary">12</p>
        <p className="text-xs text-muted mt-2">Active sessions</p>
      </div>
    </div>
  );
}
