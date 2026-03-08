import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface ClassCardProps {
  classData: {
    id: string;
    name: string;
    code: string;
    description?: string;
    room?: string;
    schedule?: string;
    _count?: {
      students: number;
    };
  };
}

export function ClassCard({ classData }: ClassCardProps) {
  return (
    <div className="bg-white rounded-lg border border-border p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-foreground">{classData.name}</h3>
          <p className="text-sm text-muted">{classData.code}</p>
        </div>
        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
          {classData._count?.students || 0} students
        </span>
      </div>

      {classData.description && (
        <p className="text-sm text-muted mb-3 line-clamp-2">{classData.description}</p>
      )}

      <div className="space-y-2 mb-4 text-sm text-muted">
        {classData.room && (
          <p>📍 {classData.room}</p>
        )}
        {classData.schedule && (
          <p>🕐 {classData.schedule}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/dashboard/classes/${classData.id}`} className="flex-1">
          <Button variant="outline" fullWidth>View Details</Button>
        </Link>
        <Button variant="ghost">Edit</Button>
      </div>
    </div>
  );
}
