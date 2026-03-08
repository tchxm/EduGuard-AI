import Link from 'next/link';

interface StudentTableProps {
  students: any[];
}

export function StudentTable({ students }: StudentTableProps) {
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-background border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Enrollment ID</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Classes</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-background transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {student.firstName} {student.lastName}
                </td>
                <td className="px-6 py-4 text-sm text-muted">{student.enrollmentId}</td>
                <td className="px-6 py-4 text-sm text-muted">{student.email}</td>
                <td className="px-6 py-4 text-sm text-muted">
                  {student.classes?.length || 0} classes
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    student.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {student.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm space-x-2">
                  <Link
                    href={`/dashboard/students/${student.id}`}
                    className="text-primary hover:text-secondary"
                  >
                    View
                  </Link>
                  <button className="text-muted hover:text-foreground">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
