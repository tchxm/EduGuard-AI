import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';

/**
 * Face Recognition Service
 * 
 * Handles face embeddings, comparison, and student face registration.
 * Note: Actual ML inference is done in the browser with face-api.js
 * This service stores and retrieves embeddings from the database.
 */

export interface FaceEmbedding {
  embedding: number[];
  timestamp: Date;
  confidence: number;
}

export class FaceRecognitionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Register a student's face embedding
   * The embedding should come from face-api.js in the frontend
   */
  async registerStudentFace(
    studentId: string,
    embedding: number[],
    confidence: number
  ) {
    try {
      // Store face embedding as JSON string
      const faceData: FaceEmbedding = {
        embedding,
        timestamp: new Date(),
        confidence,
      };

      const student = await this.prisma.student.update({
        where: { id: studentId },
        data: {
          faceEmbedding: JSON.stringify(faceData),
        },
      });

      return student;
    } catch (error) {
      console.error('Failed to register face:', error);
      throw error;
    }
  }

  /**
   * Get stored face embedding for a student
   */
  async getStudentFaceEmbedding(studentId: string) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { faceEmbedding: true },
      });

      if (!student?.faceEmbedding) {
        return null;
      }

      return JSON.parse(student.faceEmbedding) as FaceEmbedding;
    } catch (error) {
      console.error('Failed to get face embedding:', error);
      return null;
    }
  }

  /**
   * Get all student face embeddings for a class
   * Used for batch matching in attendance sessions
   */
  async getClassFaceEmbeddings(classId: string) {
    try {
      const students = await this.prisma.student.findMany({
        where: {
          classes: {
            some: { classId },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          faceEmbedding: true,
        },
      });

      return students
        .filter((s) => s.faceEmbedding !== null)
        .map((s) => ({
          studentId: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          embedding: JSON.parse(s.faceEmbedding!),
        }));
    } catch (error) {
      console.error('Failed to get class face embeddings:', error);
      return [];
    }
  }

  /**
   * Process uploaded student image
   * Resize and optimize for face detection
   */
  async processStudentImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const processedImage = await sharp(imageBuffer)
        .resize(640, 480, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      return processedImage;
    } catch (error) {
      console.error('Failed to process image:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two embeddings
   * Simple Euclidean distance (can be replaced with cosine similarity)
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      return 0;
    }

    let sumSquaredDiff = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sumSquaredDiff += diff * diff;
    }

    const euclideanDistance = Math.sqrt(sumSquaredDiff);
    
    // Convert distance to similarity score (0-1)
    // Normalized for typical embedding dimensions
    const similarity = 1 / (1 + euclideanDistance / 10);
    
    return Math.min(1, Math.max(0, similarity));
  }

  /**
   * Find best matching student for a detected face
   */
  async findMatchingStudent(
    detectedEmbedding: number[],
    classId: string,
    threshold: number = 0.6
  ) {
    try {
      const classEmbeddings = await this.getClassFaceEmbeddings(classId);

      if (classEmbeddings.length === 0) {
        return null;
      }

      let bestMatch = null;
      let bestScore = threshold;

      for (const student of classEmbeddings) {
        const similarity = this.calculateSimilarity(
          detectedEmbedding,
          student.embedding.embedding
        );

        if (similarity > bestScore) {
          bestScore = similarity;
          bestMatch = {
            studentId: student.studentId,
            firstName: student.firstName,
            lastName: student.lastName,
            confidence: similarity,
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.error('Failed to find matching student:', error);
      return null;
    }
  }

  /**
   * Validate face embedding quality
   */
  validateEmbedding(embedding: number[], minLength: number = 128): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length < minLength) {
      return false;
    }

    // Check if all values are numbers in valid range
    return embedding.every((val) => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Get face recognition statistics for a class
   */
  async getClassFaceStats(classId: string) {
    try {
      const students = await this.prisma.studentClass.findMany({
        where: { classId },
        include: {
          student: {
            select: { faceEmbedding: true },
          },
        },
      });

      const totalStudents = students.length;
      const studentsWithFace = students.filter(
        (s) => s.student.faceEmbedding !== null
      ).length;

      return {
        totalStudents,
        studentsWithFace,
        coverage: totalStudents > 0 ? (studentsWithFace / totalStudents) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get face stats:', error);
      return { totalStudents: 0, studentsWithFace: 0, coverage: 0 };
    }
  }
}
