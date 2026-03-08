'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const data = [
  { name: 'Mon', present: 45, absent: 5, late: 2 },
  { name: 'Tue', present: 48, absent: 3, late: 1 },
  { name: 'Wed', present: 42, absent: 6, late: 4 },
  { name: 'Thu', present: 50, absent: 2, late: 0 },
  { name: 'Fri', present: 46, absent: 4, late: 2 },
];

export function ActivityChart() {
  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Overview</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="present"
            stroke="#2563eb"
            name="Present"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="absent"
            stroke="#dc2626"
            name="Absent"
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="late"
            stroke="#f59e0b"
            name="Late"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
