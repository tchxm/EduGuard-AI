'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { attendanceAPI, classesAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { FaceDetectionSession } from '@/components/attendance/FaceDetectionSession';

export default function AttendanceSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [showFaceDetection, setShowFaceDetection] = useState(false);

  const { data: session, isLoading: sessionLoading, error: sessionError } = useSWR(
    `/attendance/sessions/${sessionId}`,
    async () => {
      const response = await attendanceAPI.getSession(sessionId);
      return response.data;
    }
  );

  const { data: classData } = useSWR(
    session ? `/classes/${session.classId}` : null,
    async () => {
      if (!session) return null;
      const response = await classesAPI.getById(session.classId);
      return response.data;
    }
  );

  const { data: students = [] } = useSWR(
    classData ? `/classes/${classData.id}/students` : null,
    async () => {
      if (!classData) return [];
      const response = await classesAPI.getStudents(classData.id);
      return response.data;
    }
  );

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        Failed to load attendance session. Please try again.
      </div>
    );
  }

  const markedCount = session.records?.length || 0;
  const totalStudents = students.length;
  const progressPercentage = totalStudents > 0 ? (markedCount / totalStudents) * 100 : 0;

  if (showFaceDetection && session.status === 'ONGOING') {
    return (
      <FaceDetectionSession
        sessionId={sessionId}
        classId={session.classId}
        students={students}
        onSessionEnd={() => setShowFaceDetection(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance Session</h1>
        <p className="text-muted mt-1">{session.class?.name} ({session.class?.code})</p>
      </div>

      {/* Status and Progress */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted mb-1">Session Status</p>
          <p className="text-lg font-bold text-foreground">{session.status}</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted mb-1">Marked</p>
          <p className="text-lg font-bold text-primary">{markedCount}</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted mb-1">Total Students</p>
          <p className="text-lg font-bold text-foreground">{totalStudents}</p>
        </div>

        <div className="bg-white rounded-lg border border-border p-4">
          <p className="text-sm text-muted mb-1">Progress</p>
          <p className="text-lg font-bold text-green-600">{progressPercentage.toFixed(0)}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-foreground">Attendance Progress</h3>
          <span className="text-sm text-muted">
            {markedCount} of {totalStudents} marked
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 bg-green-600 rounded-full transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      {session.status === 'ONGOING' && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => setShowFaceDetection(true)}
            fullWidth
          >
            Launch Face Recognition
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await attendanceAPI.endSession(sessionId);
              window.location.reload();
            }}
            fullWidth
          >
            End Session
          </Button>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Marked Students</h2>

        {session.records && session.records.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Enrollment ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Method</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Confidence</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {session.records.map((record: any) => (
                  <tr key={record.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {record.student.firstName} {record.student.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted">{record.student.enrollmentId}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          record.status === 'PRESENT'
                            ? 'bg-green-100 text-green-700'
                            : record.status === 'ABSENT'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted capitalize">{record.detectionMethod}</td>
                    <td className="px-4 py-3 text-muted">
                      {record.confidence ? `${(record.confidence * 100).toFixed(0)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {new Date(record.markedAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-muted py-6">No students marked yet</p>
        )}
      </div>

      {/* Unmarked Students */}
      {session.status === 'ONGOING' && markedCount < totalStudents && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">Unmarked Students</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {students
              .filter(
                (student: any) =>
                  !session.records.some((r: any) => r.studentId === student.id)
              )
              .map((student: any) => (
                <div
                  key={student.id}
                  className="bg-white p-3 rounded border border-blue-200 flex justify-between items-center"
                >
                  <span className="text-sm font-medium text-foreground">
                    {student.firstName} {student.lastName}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await attendanceAPI.mark(sessionId, {
                        studentId: student.id,
                        status: 'ABSENT',
                        detectionMethod: 'manual',
                      });
                      window.location.reload();
                    }}
                  >
                    Mark Absent
                  </Button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
