interface AttendanceReportCardProps {
  className: string;
  attendanceRate: number;
  totalSessions: number;
  presentDays: number;
  absentDays: number;
}

export function AttendanceReportCard({
  className,
  attendanceRate,
  totalSessions,
  presentDays,
  absentDays,
}: AttendanceReportCardProps) {
  const getColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h3 className="font-semibold text-foreground mb-4">{className}</h3>

      <div className="space-y-4">
        {/* Attendance Rate Gauge */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted">Attendance Rate</span>
            <span className={`text-2xl font-bold ${getColor(attendanceRate)}`}>
              {attendanceRate}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                attendanceRate >= 90
                  ? 'bg-green-600'
                  : attendanceRate >= 75
                  ? 'bg-yellow-600'
                  : 'bg-red-600'
              }`}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted">Total Sessions</p>
            <p className="text-lg font-bold text-foreground">{totalSessions}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Present</p>
            <p className="text-lg font-bold text-green-600">{presentDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Absent</p>
            <p className="text-lg font-bold text-red-600">{absentDays}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
