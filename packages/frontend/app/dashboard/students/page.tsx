'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { studentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StudentTable } from '@/components/students/StudentTable';

export default function StudentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { data: students = [], error } = useSWR('/students', async () => {
    const response = await studentsAPI.getAll();
    return response.data;
  });

  useEffect(() => {
    if (students || error) {
      setIsLoading(false);
    }
  }, [students, error]);

  const filteredStudents = students.filter((student: any) =>
    student.firstName.toLowerCase().includes(search.toLowerCase()) ||
    student.lastName.toLowerCase().includes(search.toLowerCase()) ||
    student.email.toLowerCase().includes(search.toLowerCase()) ||
    student.enrollmentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted mt-1">Manage student enrollment and information</p>
        </div>
        <Link href="/dashboard/students/new">
          <Button variant="primary">
            + Add Student
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-border p-4">
        <input
          type="text"
          placeholder="Search by name, email, or enrollment ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Failed to load students. Please try again.
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-border">
          <p className="text-muted mb-4">No students found.</p>
          <Link href="/dashboard/students/new">
            <Button variant="primary">Add First Student</Button>
          </Link>
        </div>
      ) : (
        <StudentTable students={filteredStudents} />
      )}
    </div>
  );
}
