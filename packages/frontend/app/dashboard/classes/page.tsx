'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { classesAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { ClassCard } from '@/components/classes/ClassCard';

export default function ClassesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { data: classes = [], error } = useSWR('/classes', async () => {
    const response = await classesAPI.getAll();
    return response.data;
  });

  useEffect(() => {
    if (classes || error) {
      setIsLoading(false);
    }
  }, [classes, error]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted mt-1">Manage your classes and students</p>
        </div>
        <Link href="/dashboard/classes/new">
          <Button variant="primary">
            + New Class
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Failed to load classes. Please try again.
        </div>
      ) : classes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">No classes yet. Create your first class to get started.</p>
          <Link href="/dashboard/classes/new">
            <Button variant="primary">Create First Class</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls: any) => (
            <ClassCard key={cls.id} classData={cls} />
          ))}
        </div>
      )}
    </div>
  );
}
