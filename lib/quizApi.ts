import { apiClient } from './api';
import logger from './logger';

export interface QuizChallenge {
  id: number;
  title: string;
  scenario: string;
  instructions: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: number;
  category: string;
  tags: string[];
  hints: string[];
}

export interface QuizData {
  id: string;
  labId: string;
  title: string;
  description: string;
  totalChallenges: number;
  totalPoints: number;
  estimatedDuration: number;
  challenges: QuizChallenge[];
}

export interface QuizProgress {
  currentChallenge: number;
  completedChallenges: number[];
  wrongAttempts: {[challengeId: number]: number};
  hintsUsed: {[challengeId: number]: boolean};
  submittedAnswers: {[challengeId: number]: string};
  totalTimeSpent: number;
  totalPoints: number;
  isCompleted: boolean;
  completionDate?: string;
  lastAccessed: string;
}

export interface FlagSubmissionResponse {
  isCorrect: boolean;
  points?: number;
  totalPoints?: number;
  completedChallenges?: number[];
  isQuizCompleted?: boolean;
  nextChallenge?: number;
  wrongAttempts?: number;
  maxAttemptsReached?: boolean;
  challengeFailed?: boolean;
  hintsUnlocked?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  totalPoints: number;
  totalTimeSpent: number;
  completedChallenges: number;
  completionDate: string;
}

export class QuizAPI {
  // Get quiz data for a lab
  static async getQuizData(labId: string): Promise<QuizData> {
    try {
      const response = await apiClient.get(`/quiz/${labId}/data`);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    } catch (error) {
      logger.error('Error fetching quiz data:', error);
      throw error;
    }
  }

  // Get user's quiz progress
  static async getProgress(labId: string): Promise<QuizProgress> {
    try {
      const response = await apiClient.get(`/quiz/${labId}/progress`);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    } catch (error) {
      logger.error('Error fetching quiz progress:', error);
      throw error;
    }
  }

  // Submit flag for a challenge
  static async submitFlag(labId: string, challengeId: number, flag: string, timeSpent: number): Promise<FlagSubmissionResponse> {
    try {
      const response = await apiClient.post(`/quiz/${labId}/submit-flag`, {
        challengeId,
        flag,
        timeSpent
      });
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    } catch (error) {
      logger.error('Error submitting flag:', error);
      throw error;
    }
  }

  // Update quiz progress (for time tracking, hints, etc.)
  static async updateProgress(labId: string, progress: Partial<QuizProgress>): Promise<void> {
    try {
      const response = await apiClient.put(`/quiz/${labId}/progress`, {
        labId,
        ...progress
      });
      if (!response.success) {
        // Only log if it's not a permission error (403/404)
        if (response.message && !response.message.includes('not found') && !response.message.includes('access')) {
    logger.warn('Quiz progress update failed:', response.message);
        }
        // Don't throw error to prevent breaking the quiz experience
        return;
      }
    } catch (error: any) {
      // Only log if it's not a permission error
      if (error?.status !== 403 && error?.status !== 404) {
        logger.warn('Error updating quiz progress (non-critical):', error);
      }
      // Don't throw error to prevent breaking the quiz experience
    }
  }

  // Get quiz leaderboard
  static async getLeaderboard(labId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      const response = await apiClient.get(`/quiz/${labId}/leaderboard?limit=${limit}`);
      if (!response.success) {
        throw new Error(response.message);
      }
      return response.data;
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
      throw error;
    }
  }
}
