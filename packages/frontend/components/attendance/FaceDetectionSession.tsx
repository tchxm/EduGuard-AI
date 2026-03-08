'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { attendanceAPI } from '@/lib/api';

interface DetectedFace {
  id: string;
  label: string;
  confidence: number;
  timestamp: Date;
  marked: boolean;
}

interface FaceDetectionSessionProps {
  sessionId: string;
  classId: string;
  students: Array<{ id: string; firstName: string; lastName: string }>;
  onSessionEnd: () => void;
}

export function FaceDetectionSession({
  sessionId,
  classId,
  students,
  onSessionEnd,
}: FaceDetectionSessionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [markedStudents, setMarkedStudents] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState('Camera initializing...');
  const [error, setError] = useState<string | null>(null);

  // Initialize camera
  useEffect(() => {
    if (!isActive) return;

    const initCamera = async () => {
      try {
        setError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStatus('Camera active - detecting faces...');
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Camera access denied';
        setError(errorMsg);
        setStatus('Camera error');
        setIsActive(false);
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  // Face detection loop
  useEffect(() => {
    if (!isActive || !videoRef.current) return;

    const detectionInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      try {
        const context = canvasRef.current.getContext('2d');
        if (!context) return;

        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0);

        // TODO: Integrate face-api.js for actual face detection
        // For now, simulate face detection
        const simulatedFace: DetectedFace = {
          id: `face-${Date.now()}`,
          label: students[Math.floor(Math.random() * students.length)]?.firstName || 'Unknown',
          confidence: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
          timestamp: new Date(),
          marked: false,
        };

        // Only add if confidence is high enough
        if (simulatedFace.confidence > 0.7) {
          setDetectedFaces((prev) => [simulatedFace, ...prev.slice(0, 19)]);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }, 500); // 500ms interval for face detection

    return () => clearInterval(detectionInterval);
  }, [isActive, students]);

  const handleMarkAttendance = async (
    studentId: string,
    confidence: number
  ) => {
    if (markedStudents.has(studentId)) return;

    setIsLoading(true);
    try {
      await attendanceAPI.mark(sessionId, {
        studentId,
        status: 'PRESENT',
        detectionMethod: 'face',
        confidence,
      });

      setMarkedStudents((prev) => new Set([...prev, studentId]));
      setDetectedFaces((prev) =>
        prev.map((f) => (f.id === studentId ? { ...f, marked: true } : f))
      );
    } catch (error) {
      setError('Failed to mark attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    setIsLoading(true);
    try {
      await attendanceAPI.endSession(sessionId);
      onSessionEnd();
    } catch (error) {
      setError('Failed to end session');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-foreground">
              Attendance Session
            </h2>
            <p className="text-sm text-muted">
              {markedStudents.size} / {students.length} marked
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-foreground">{status}</p>
            {isActive && (
              <p className="text-xs text-green-600">● Live</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Feed */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {isActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  <div className="text-center">
                    <p className="mb-2 text-lg">Camera Not Active</p>
                    <p className="text-gray-400 text-sm">
                      Click Start Camera to begin detection
                    </p>
                  </div>
                </div>
              )}

              {/* Hidden canvas for frame processing */}
              <canvas
                ref={canvasRef}
                width={1280}
                height={720}
                className="hidden"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant={isActive ? 'danger' : 'primary'}
                onClick={() => setIsActive(!isActive)}
                fullWidth
              >
                {isActive ? 'Stop Camera' : 'Start Camera'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleEndSession}
                isLoading={isLoading}
                fullWidth
              >
                End Session
              </Button>
            </div>
          </div>
        </div>

        {/* Detected Faces Sidebar */}
        <div className="bg-white rounded-lg border border-border p-4">
          <h3 className="font-semibold text-foreground mb-3">
            Detected Students ({detectedFaces.length})
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {detectedFaces.length === 0 ? (
              <p className="text-sm text-muted text-center py-4">
                No faces detected yet
              </p>
            ) : (
              detectedFaces.map((face) => (
                <div
                  key={face.id}
                  className={`p-3 rounded-lg border transition-colors ${
                    face.marked
                      ? 'bg-green-50 border-green-200'
                      : 'bg-background border-border hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-foreground">
                      {face.label}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {(face.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Confidence bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        face.confidence > 0.8
                          ? 'bg-green-600'
                          : 'bg-yellow-600'
                      }`}
                      style={{ width: `${face.confidence * 100}%` }}
                    />
                  </div>

                  {face.marked ? (
                    <span className="text-xs text-green-700 font-medium">
                      ✓ Marked
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        handleMarkAttendance(face.id, face.confidence)
                      }
                      isLoading={isLoading}
                      fullWidth
                    >
                      Mark Present
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="bg-white rounded-lg border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4">
          Class Roster ({markedStudents.size}/{students.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-foreground">
                  Student
                </th>
                <th className="px-4 py-2 text-left font-semibold text-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {students.map((student) => (
                <tr
                  key={student.id}
                  className={
                    markedStudents.has(student.id) ? 'bg-green-50' : ''
                  }
                >
                  <td className="px-4 py-3 text-foreground">
                    {student.firstName} {student.lastName}
                  </td>
                  <td className="px-4 py-3">
                    {markedStudents.has(student.id) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        ✓ Present
                      </span>
                    ) : (
                      <span className="text-xs text-muted">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-700 mb-2">Tips for Best Results</h4>
        <ul className="text-sm text-blue-600 space-y-1 list-disc list-inside">
          <li>Ensure good lighting and clear visibility</li>
          <li>Position faces directly toward camera</li>
          <li>Faces detected with high confidence (80%+) work best</li>
          <li>Mark manually for low-confidence detections</li>
          <li>Keep camera at least 1-2 feet away from students</li>
        </ul>
      </div>
    </div>
  );
}
