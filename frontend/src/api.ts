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

  // Syllabus CRUD
  createStage: (data: any) => request('/api/syllabus/stages', { method: 'POST', body: JSON.stringify(data) }),
  deleteStage: (stageId: string) => request(`/api/syllabus/stages/${stageId}`, { method: 'DELETE' }),
  createPaper: (data: any) => request('/api/syllabus/papers', { method: 'POST', body: JSON.stringify(data) }),
  deletePaper: (paperId: string) => request(`/api/syllabus/papers/${paperId}`, { method: 'DELETE' }),
  createTopic: (data: any) => request('/api/syllabus/topics', { method: 'POST', body: JSON.stringify(data) }),
  deleteTopic: (topicId: string) => request(`/api/syllabus/topics/${topicId}`, { method: 'DELETE' }),
  createModule: (data: any) => request('/api/syllabus/modules', { method: 'POST', body: JSON.stringify(data) }),
  deleteModule: (moduleId: string) => request(`/api/syllabus/modules/${moduleId}`, { method: 'DELETE' }),

  // Documents
  getDocuments: () => request('/api/documents'),
  uploadDocument: (data: any) => request('/api/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (docId: string) => request(`/api/documents/${docId}`, { method: 'DELETE' }),
  togglePinDocument: (docId: string) => request(`/api/documents/${docId}/pin`, { method: 'PUT' }),

  // Bulk Import
  bulkImportUsers: (csvData: string) => request('/api/users/bulk-import', { method: 'POST', body: JSON.stringify({ csv_data: csvData }) }),

  // Call Requests
  createCallRequest: (message?: string) => request('/api/call-requests', { method: 'POST', body: JSON.stringify({ message }) }),
  getCallRequests: () => request('/api/call-requests'),
  updateCallRequest: (reqId: string, status: string) => request(`/api/call-requests/${reqId}`, { method: 'PUT', body: JSON.stringify({ status }) }),

  // Feedback
  createFeedback: (data: any) => request('/api/feedback', { method: 'POST', body: JSON.stringify(data) }),
  getFeedback: (studentId: string) => request(`/api/feedback/${studentId}`),

  // Meta
  getBatches: () => request('/api/meta/batches'),
  getOptionalSubjects: () => request('/api/meta/optional-subjects'),
  getCsvTemplate: () => request('/api/meta/csv-template'),
};

export { getToken, AsyncStorage };
