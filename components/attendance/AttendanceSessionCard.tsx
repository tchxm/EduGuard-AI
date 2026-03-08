import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface AttendanceSessionCardProps {
  session: {
    id: string;
    classId: string;
    className: string;
    date: string;
    status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
    recordCount: number;
  };
}

export function AttendanceSessionCard({ session }: AttendanceSessionCardProps) {
  const statusColors = {
    SCHEDULED: 'bg-yellow-100 text-yellow-700',
    ONGOING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-lg border border-border p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">{session.className}</h3>
          <p className="text-xs text-muted">{session.date}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[session.status]}`}>
          {session.status}
        </span>
      </div>

      <div className="text-sm text-muted mb-4">
        {session.recordCount} attendance records
      </div>

      <Link href={`/dashboard/attendance/session/${session.id}`}>
        <Button variant="outline" size="sm" fullWidth>
          View Details
        </Button>
      </Link>
    </div>
  );
}
