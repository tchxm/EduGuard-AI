# Face Recognition Implementation Guide

## Overview

EduGuard AI uses **face-api.js** (a JavaScript wrapper around TensorFlow.js) for browser-based face detection and recognition. This approach offers several advantages:

- **Privacy**: Face detection happens in the browser, not sent to servers
- **Speed**: Real-time detection with minimal latency
- **Scalability**: No server-side ML infrastructure needed
- **Cost-effective**: Leverages free, open-source models

## Architecture

```
Frontend (Browser)                          Backend (Node.js)
┌─────────────────────────────────┐       ┌──────────────────────────┐
│  Video Stream                    │       │  Database                │
│      ↓                           │       │  ┌────────────────────┐  │
│  face-api.js (TensorFlow.js)    │────→  │  │ Face Embeddings    │  │
│  ├─ Face Detection               │       │  │ Student Records    │  │
│  ├─ Descriptor/Embedding         │       │  │ Attendance Data    │  │
│  └─ Confidence Scoring           │       │  └────────────────────┘  │
│      ↓                           │       │         ↑                │
│  Mark Attendance                 │       │  FaceRecognitionService │
│  (POST /api/attendance/...)      │       │  ├─ Store Embeddings    │
└─────────────────────────────────┘       │  ├─ Match Faces         │
                                          │  └─ Calculate Similarity │
                                          └──────────────────────────┘
```

## Frontend Implementation

### 1. Load Face-API Library

```typescript
// In your Next.js layout or component
import * as faceapi from 'face-api.js';

// Load pre-trained models (done once on app startup)
async function loadModels() {
  const MODEL_URL = '/models/face-api-models/';
  
  await Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceDetectionNet.loadFromUri(MODEL_URL),
  ]);
}
```

### 2. Detect Faces from Video Stream

```typescript
async function detectFaceFromVideo(
  videoElement: HTMLVideoElement
): Promise<faceapi.Face[]> {
  const detections = await faceapi
    .detectAllFaces(videoElement)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
}
```

### 3. Get Face Embeddings

Face embeddings are 128-dimensional arrays representing the face:

```typescript
const detection = detections[0];
if (detection) {
  const embedding = detection.descriptor; // number[]
  const confidence = detection.detection.score; // 0-1
  
  // Send to backend
  await attendanceAPI.mark(sessionId, {
    studentId: matchedStudentId,
    status: 'PRESENT',
    detectionMethod: 'face',
    confidence,
    faceEmbedding: Array.from(embedding), // Convert to array for JSON
  });
}
```

### 4. Real-time Detection Loop

```typescript
async function startFaceDetectionLoop(
  videoElement: HTMLVideoElement,
  onFaceDetected: (face: DetectedFace) => void
) {
  const detectionInterval = setInterval(async () => {
    try {
      const detections = await faceapi
        .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      detections.forEach((detection) => {
        onFaceDetected({
          embedding: detection.descriptor,
          confidence: detection.detection.score,
          box: detection.detection.box,
        });
      });
    } catch (error) {
      console.error('Detection error:', error);
    }
  }, 500); // 500ms detection interval

  return () => clearInterval(detectionInterval);
}
```

## Backend Implementation

### 1. Store Student Face Embedding

When a student registers or uploads a photo:

```typescript
// src/routes/students.ts
fastify.post<{ Body: any }>('/register-face/:id', async (request, reply) => {
  const { id } = request.params;
  const { embedding, confidence } = request.body;

  // Validate embedding
  if (!faceRecognitionService.validateEmbedding(embedding)) {
    throw errors.badRequest('Invalid face embedding');
  }

  // Store in database
  const student = await faceRecognitionService.registerStudentFace(
    id,
    embedding,
    confidence
  );

  return reply.send(student);
});
```

### 2. Match Detected Face to Student

When marking attendance:

```typescript
fastify.post('/attendance/mark-face', async (request, reply) => {
  const { sessionId, detectedEmbedding, confidence } = request.body;

  // Get session details
  const session = await fastify.prisma.attendanceSession.findUnique({
    where: { id: sessionId },
  });

  // Find best matching student
  const match = await faceRecognitionService.findMatchingStudent(
    detectedEmbedding,
    session.classId,
    0.65 // threshold
  );

  if (!match) {
    return reply.status(404).send({
      statusCode: 404,
      code: 'NO_MATCH',
      message: 'No matching student found',
    });
  }

  // Mark attendance
  const attendance = await fastify.prisma.attendance.create({
    data: {
      studentId: match.studentId,
      classId: session.classId,
      sessionId,
      userId: request.user.sub,
      status: 'PRESENT',
      detectionMethod: 'face',
      confidence: match.confidence,
      markedAt: new Date(),
    },
  });

  return reply.send(attendance);
});
```

### 3. Calculate Face Similarity

```typescript
// Cosine Similarity (better for embeddings)
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## Configuration

### Detection Thresholds

```typescript
// Confidence thresholds for marking attendance
const THRESHOLDS = {
  AUTO_MARK: 0.85, // Automatically mark if confidence > 85%
  SUGGEST: 0.65,   // Show suggestion if 65-85%
  IGNORE: 0.5,     // Ignore below 50%
};
```

### Tuning Detection

Adjust face-api detection options:

```typescript
// More strict detection
new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
})

// More lenient detection (faster)
new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.3,
})
```

## Database Schema

Faces are stored as embeddings in the `Student` table:

```sql
ALTER TABLE "Student" ADD COLUMN "faceEmbedding" TEXT;

-- Example structure stored as JSON
{
  "embedding": [0.123, 0.456, ..., 0.789],  // 128 numbers
  "timestamp": "2024-03-09T10:00:00Z",
  "confidence": 0.92
}
```

## Setup Instructions

### 1. Download Face-API Models

Face-API requires pre-trained TensorFlow.js models. Download them:

```bash
# Create models directory in frontend
mkdir -p packages/frontend/public/models/face-api-models

# Download models from face-api repository
# https://github.com/vladmandic/face-api/tree/master/model

# Or use CDN:
<script async defer src="https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js"></script>
```

### 2. Initialize Models in App

```typescript
// app/layout.tsx or _app.tsx
useEffect(() => {
  loadFaceApiModels();
}, []);

async function loadFaceApiModels() {
  const MODEL_URL = '/models/face-api-models/';
  
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceDetectionNet.loadFromUri(MODEL_URL);
  // or
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
}
```

### 3. Request Camera Permissions

Browsers require explicit permission:

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: false,
});
```

## API Endpoints

### Register Student Face

```http
POST /api/students/:id/register-face
Content-Type: application/json

{
  "embedding": [0.123, 0.456, ...],
  "confidence": 0.92,
  "imageData": "data:image/jpeg;base64,..."
}

Response:
{
  "id": "student-123",
  "enrollmentId": "E001",
  "firstName": "John",
  "lastName": "Doe",
  "faceEmbedding": "..."
}
```

### Mark Attendance with Face

```http
POST /api/attendance/sessions/:sessionId/mark-face
Content-Type: application/json

{
  "detectedEmbedding": [0.123, 0.456, ...],
  "confidence": 0.92
}

Response:
{
  "id": "attendance-123",
  "studentId": "student-123",
  "status": "PRESENT",
  "detectionMethod": "face",
  "confidence": 0.92
}
```

### Get Face Registration Status

```http
GET /api/students/:classId/face-coverage

Response:
{
  "totalStudents": 45,
  "studentsWithFace": 42,
  "coverage": 93.33
}
```

## Performance Optimization

### 1. Frame Skipping

```typescript
let frameCount = 0;
const DETECTION_INTERVAL = 5; // Detect every 5 frames

if (frameCount++ % DETECTION_INTERVAL === 0) {
  // Run detection
}
```

### 2. Canvas Resolution

```typescript
// Lower resolution for faster detection
const canvas = document.createElement('canvas');
canvas.width = 320;   // Instead of 1280
canvas.height = 240;  // Instead of 720
```

### 3. Model Selection

```typescript
// Fast but less accurate
new faceapi.TinyFaceDetectorOptions();

// Slower but more accurate  
new faceapi.SsdMobilenetv1Options();
```

## Troubleshooting

### Face Detection Not Working

1. **Check camera permissions**: Browser console should show camera access
2. **Verify lighting**: Ensure adequate light on face
3. **Model loading**: Check Network tab for 404s on model files
4. **Clear cache**: Models may be cached incorrectly

### Low Confidence Scores

1. **Distance**: Move closer to camera (1-2 feet optimal)
2. **Angle**: Face should be directly toward camera
3. **Lighting**: Avoid backlighting or shadows
4. **Quality**: Original registration image may be poor

### Mismatched Students

1. Increase threshold from 0.65 to 0.75
2. Re-register student with better photo
3. Check if embeddings are actually stored in database

## Security & Privacy

### Storage Security

- Face embeddings are 128-dimensional vectors, NOT images
- Cannot reconstruct face from embedding
- Store in encrypted database column in production

### Privacy Considerations

- Embeddings are generated in browser (not on server)
- Video stream never uploaded to server
- Only attendance records stored server-side
- Compliance with GDPR, FERPA, and other regulations

## Future Improvements

1. **Liveness Detection**: Detect spoofing with selfies/photos
2. **Multi-face Handling**: Track multiple faces simultaneously
3. **Mask Detection**: Work with masked faces (post-COVID)
4. **Mobile Support**: Optimize for mobile cameras
5. **Fallback Recognition**: Additional ID/QR code backup
6. **Analytics**: Track detection accuracy per student

## Resources

- [face-api.js Documentation](https://github.com/vladmandic/face-api)
- [TensorFlow.js Models](https://github.com/tensorflow/tfjs-models)
- [Face Detection Benchmark](https://github.com/ageitgey/face_recognition)
- [Privacy-Preserving Face Recognition](https://arxiv.org/abs/1903.02852)

---

**Note**: Face recognition accuracy depends on image quality, lighting, and student cooperation. Always have manual entry as fallback.
