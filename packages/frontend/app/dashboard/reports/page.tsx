'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AttendanceReportCard } from '@/components/reports/AttendanceReportCard';
import { StatsSummary } from '@/components/reports/StatsSummary';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting as ${format}...`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted mt-1">View and analyze attendance data</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <StatsSummary dateRange={dateRange} />

      {/* Reports */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Class Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AttendanceReportCard
            className="Math 101"
            attendanceRate={92.5}
            totalSessions={20}
            presentDays={18}
            absentDays={2}
          />
          <AttendanceReportCard
            className="Physics 201"
            attendanceRate={88.0}
            totalSessions={20}
            presentDays={18}
            absentDays={2}
          />
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Class</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...Array(5)].map((_, idx) => (
                <tr key={idx} className="hover:bg-background">
                  <td className="px-4 py-3 text-foreground">John Doe</td>
                  <td className="px-4 py-3 text-muted">Math 101</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                      Present
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">2024-03-09</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
