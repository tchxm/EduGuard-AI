'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface FaceDetectionProps {
  sessionId: string;
  onMarkAttendance: (studentId: string, confidence: number) => Promise<void>;
  isLoading?: boolean;
}

export function FaceDetection({
  sessionId,
  onMarkAttendance,
  isLoading = false,
}: FaceDetectionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing...');
  const [detectedCount, setDetectedCount] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setDetectionStatus('Camera active - detecting faces...');
        }
      } catch (error) {
        console.error('Camera access error:', error);
        setDetectionStatus('Camera access denied');
        setIsActive(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isActive]);

  const toggleCamera = () => {
    setIsActive(!isActive);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0);
    // TODO: Send to face-api.js for detection
  };

  return (
    <div className="bg-white rounded-lg border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Face Recognition</h2>

      <div className="space-y-4">
        {/* Video Container */}
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
                <p className="mb-2">Camera not active</p>
                <p className="text-sm text-gray-400">Start camera to begin face detection</p>
              </div>
            </div>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="hidden"
          />
        </div>

        {/* Status Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Status:</strong> {detectionStatus}
          </p>
          <p className="text-sm text-blue-700 mt-1">
            <strong>Detected:</strong> {detectedCount} faces
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            variant={isActive ? 'danger' : 'primary'}
            onClick={toggleCamera}
            fullWidth
          >
            {isActive ? 'Stop Camera' : 'Start Camera'}
          </Button>
          <Button
            variant="secondary"
            onClick={captureFrame}
            disabled={!isActive || isLoading}
            fullWidth
          >
            Capture Frame
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium mb-2">Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Position your face in the center of the camera</li>
            <li>Ensure adequate lighting</li>
            <li>Faces will be detected and marked automatically</li>
            <li>You can manually mark absent students</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
