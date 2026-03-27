import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('session_token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const url = `${BACKEND_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Auth
  exchangeSession: (sessionId: string) =>
    request('/api/auth/session', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) }),
  getMe: () => request('/api/auth/me'),
  demoLogin: (role: string) =>
    request('/api/auth/demo-login', { method: 'POST', body: JSON.stringify({ role }) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Users
  getUsers: (role?: string) => request(`/api/users${role ? `?role=${role}` : ''}`),
  createUser: (data: any) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (userId: string, data: any) => request(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (userId: string) => request(`/api/users/${userId}`, { method: 'DELETE' }),

  // Mappings
  getMappings: () => request('/api/mappings'),
  createMapping: (data: any) => request('/api/mappings', { method: 'POST', body: JSON.stringify(data) }),
  getMentees: (mentorId: string) => request(`/api/mentors/${mentorId}/mentees`),

  // Syllabus
  getSyllabus: () => request('/api/syllabus'),

  // Tracker
  getTracker: (studentId: string) => request(`/api/tracker/${studentId}`),
  getTrackerSummary: (studentId: string) => request(`/api/tracker/${studentId}/summary`),
  updateTracker: (studentId: string, topicId: string, data: any) =>
    request(`/api/tracker/${studentId}/${topicId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Tasks
  getTasks: () => request('/api/tasks'),
  createTask: (data: any) => request('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: string, data: any) => request(`/api/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Sessions
  getSessions: () => request('/api/sessions'),
  createSession: (data: any) => request('/api/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (sessionId: string, data: any) => request(`/api/sessions/${sessionId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Announcements
  getAnnouncements: () => request('/api/announcements'),
  createAnnouncement: (data: any) => request('/api/announcements', { method: 'POST', body: JSON.stringify(data) }),

  // Analytics
  getAnalyticsOverview: () => request('/api/analytics/overview'),
  getStudentAnalytics: (studentId: string) => request(`/api/analytics/student/${studentId}`),
};

export { getToken, AsyncStorage };
