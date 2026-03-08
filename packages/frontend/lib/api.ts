import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to request headers
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => apiClient.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: () => apiClient.get('/users'),

  getById: (id: string) => apiClient.get(`/users/${id}`),

  update: (id: string, data: Partial<any>) =>
    apiClient.patch(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete(`/users/${id}`),
};

// Classes API
export const classesAPI = {
  getAll: () => apiClient.get('/classes'),

  getById: (id: string) => apiClient.get(`/classes/${id}`),

  create: (data: any) => apiClient.post('/classes', data),

  update: (id: string, data: Partial<any>) =>
    apiClient.patch(`/classes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/classes/${id}`),
};

// Students API
export const studentsAPI = {
  getAll: (classId?: string) =>
    apiClient.get('/students', { params: { classId } }),

  getById: (id: string) => apiClient.get(`/students/${id}`),

  create: (data: any) => apiClient.post('/students', data),

  update: (id: string, data: Partial<any>) =>
    apiClient.patch(`/students/${id}`, data),

  enroll: (id: string, classId: string) =>
    apiClient.post(`/students/${id}/enroll`, { classId }),

  remove: (id: string, classId: string) =>
    apiClient.delete(`/students/${id}/classes/${classId}`),

  delete: (id: string) => apiClient.delete(`/students/${id}`),
};

// Attendance API
export const attendanceAPI = {
  startSession: (classId: string, usesFaceRecognition: boolean) =>
    apiClient.post('/attendance/sessions/start', {
      classId,
      usesFaceRecognition,
    }),

  endSession: (sessionId: string) =>
    apiClient.post(`/attendance/sessions/${sessionId}/end`),

  getSession: (sessionId: string) =>
    apiClient.get(`/attendance/sessions/${sessionId}`),

  mark: (sessionId: string, data: any) =>
    apiClient.post(`/attendance/sessions/${sessionId}/mark`, data),

  update: (attendanceId: string, data: Partial<any>) =>
    apiClient.patch(`/attendance/${attendanceId}`, data),

  getClassReport: (classId: string, startDate?: string, endDate?: string) =>
    apiClient.get(`/attendance/class/${classId}/report`, {
      params: { startDate, endDate },
    }),

  getStudentHistory: (studentId: string) =>
    apiClient.get(`/attendance/student/${studentId}/history`),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => apiClient.get('/notifications'),

  getById: (id: string) => apiClient.get(`/notifications/${id}`),

  create: (data: any) => apiClient.post('/notifications', data),

  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),

  markAllRead: () => apiClient.patch('/notifications/read-all'),

  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
};
