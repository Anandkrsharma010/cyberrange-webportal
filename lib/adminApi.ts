import { apiClient } from './api';

// Admin API service for CMS operations
export class AdminApiService {
  // Dashboard
  async getDashboardStats() {
    return apiClient.get('/admin/dashboard/stats');
  }

  // Lab Management
  async getLabs(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    difficulty?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.difficulty) queryParams.append('difficulty', params.difficulty);

    const endpoint = `/admin/labs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  async getLabById(id: string) {
    return apiClient.get(`/admin/labs/${id}`);
  }

  async createLab(labData: any) {
    const result = await apiClient.post('/admin/labs', labData);
    return result;
  }

  async updateLab(id: string, labData: any) {
    return apiClient.put(`/admin/labs/${id}`, labData);
  }

  async deleteLab(id: string) {
    return apiClient.delete(`/admin/labs/${id}`);
  }

  // Quiz Management
  async getQuizzes(params?: {
    page?: number;
    limit?: number;
    search?: string;
    labId?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.labId) queryParams.append('labId', params.labId);

    const endpoint = `/admin/quizzes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  async getQuizById(id: string) {
    return apiClient.get(`/admin/quizzes/${id}`);
  }

  async createQuiz(quizData: any) {
    return apiClient.post('/admin/quizzes', quizData);
  }

  async updateQuiz(id: string, quizData: any) {
    return apiClient.put(`/admin/quizzes/${id}`, quizData);
  }

  async deleteQuiz(id: string) {
    return apiClient.delete(`/admin/quizzes/${id}`);
  }

  // Challenge Management
  async addChallenge(quizId: string, challengeData: any) {
    return apiClient.post(`/admin/quizzes/${quizId}/challenges`, challengeData);
  }

  async updateChallenge(quizId: string, challengeId: number, challengeData: any) {
    return apiClient.put(`/admin/quizzes/${quizId}/challenges/${challengeId}`, challengeData);
  }

  async deleteChallenge(quizId: string, challengeId: number) {
    return apiClient.delete(`/admin/quizzes/${quizId}/challenges/${challengeId}`);
  }

  // Content Management
  async getContent(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);

    const endpoint = `/admin/content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  async getContentByKey(key: string) {
    return apiClient.get(`/admin/content/${key}`);
  }

  async createContent(contentData: any) {
    return apiClient.post('/admin/content', contentData);
  }

  async updateContent(key: string, contentData: any) {
    return apiClient.put(`/admin/content/${key}`, contentData);
  }

  async deleteContent(key: string) {
    return apiClient.delete(`/admin/content/${key}`);
  }

  // User Management
  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    lab?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.lab) queryParams.append('lab', params.lab);

    const endpoint = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  // Get all users with payment data (no pagination)
  async getAllUsersWithPayments(params?: {
    search?: string;
    role?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);

    const endpoint = `/admin/users/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  // Get all users with comprehensive payment data (checks both Payment and Purchase collections)
  async getComprehensiveUsers(params?: {
    search?: string;
    role?: string;
    lab?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.lab) queryParams.append('lab', params.lab);

    const endpoint = `/admin/users/comprehensive${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(endpoint);
  }

  // Get current user's comprehensive data with expiry information
  async getCurrentUserComprehensiveData() {
    return apiClient.get('/admin/users/me/comprehensive');
  }

  async updateUserRole(userId: string, role: string) {
    return apiClient.put(`/admin/users/${userId}/role`, { role });
  }

  async verifyUser(userId: string) {
    return apiClient.post(`/admin/users/${userId}/verify`);
  }

  async getUserPurchasedLabs(userId: string) {
    return apiClient.get(`/admin/users/${userId}/purchased-labs`);
  }

  async getUserById(userId: string) {
    return apiClient.get(`/admin/users/${userId}`);
  }

  async sendCredentials(userId: string, labId: string, credentials: {
    ipAddress: string;
    username: string;
    key: string;
  }) {
    return apiClient.post(`/admin/users/${userId}/labs/${labId}/send-credentials`, credentials);
  }

  // Send VM credentials using the correct endpoint
  async sendVMCredentials(userId: string, labId: string, credentials: {
    ipAddress: string;
    username: string;
    key: string;
  }) {
    return apiClient.post(`/admin/users/${userId}/labs/${labId}/send-credentials`, credentials);
  }

  async deleteUser(userId: string) {
    return apiClient.delete(`/admin/users/${userId}`);
  }

  async getUserPurchaseDetails(userId: string) {
    return apiClient.get(`/admin/users/${userId}/purchases`);
  }

  async syncUserPurchases(userId: string) {
    return apiClient.post(`/admin/users/${userId}/sync-purchases`);
  }
}

// Create singleton instance
export const adminApi = new AdminApiService();

// Types for admin data
export interface AdminStats {
  totalUsers: number;
  totalLabs: number;
  totalQuizzes: number;
  totalContent: number;
  userStats: Array<{
    _id: string;
    count: number;
  }>;
}

export interface Lab {
  _id: string;
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  price: number;
  duration: string;
  rating: number;
  students: number;
  category: string;
  image: string;
  instructor: string;
  lastUpdated: string;
  learningOutcomes: string[];
  curriculum: Array<{
    module: string;
    duration: string;
    topics: string[];
  }>;
  requirements: string[];
  whatYouGet: string[];
  vmIpAddress?: string;
  resources?: {
    videos: string[];
    pdfs: string[];
    documents: string[];
  };
  certificate?: {
    generated: boolean;
    downloadUrl: string;
    expiresAt: Date;
  };
  isActive?: boolean;
  deletedAt?: Date;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  _id: string;
  labId: string;
  title: string;
  description: string;
  totalChallenges: number;
  totalPoints: number;
  estimatedDuration: number;
  challenges: Array<{
    id: number;
    title: string;
    scenario: string;
    instructions: string;
    flag: string;
    points: number;
    hints: string[];
    difficulty: 'Easy' | 'Medium' | 'Hard';
    estimatedTime: number;
    category: string;
    tags: string[];
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Content {
  _id: string;
  key: string;
  title: string;
  content: string;
  type: 'text' | 'html' | 'markdown';
  category: 'homepage' | 'about' | 'contact' | 'footer' | 'navigation' | 'general';
  isActive: boolean;
  metadata?: {
    description?: string;
    keywords?: string[];
    author?: string;
    lastModifiedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  labsBought: number;
  totalPurchases: number;
  totalAmount: number;
  completedPurchases: number;
  pendingPurchases: number;
  latestPurchaseDate: string | null;
  latestPaymentStatus: string;
  latestLabTitle: string | null;
  latestLabId: string | null;
  latestRazorpayPaymentId: string | null;
  credentialsSent: boolean;
  allPurchases: Array<{
    _id: string;
    labId: string;
    labTitle: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    razorpayPaymentId: string;
    createdAt: string;
    updatedAt: string;
    lab: any;
  }>;
  createdAt: string;
  updatedAt: string;
}
