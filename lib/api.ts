// API service layer for backend communication
import { logger } from './logger'

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    // Client-side: use the same host as the frontend
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    } else {
      // Mobile/network access: use the same IP as frontend, FastAPI default port
      return `http://${hostname}:8000`;
    }
  }
  // Server-side: default to localhost
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    logger.log('🔧 API Client initialized with baseURL:', baseURL);
    this.loadToken();
  }

  private loadToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('cystar_token');
      logger.log('🔑 Token loaded:', this.token ? 'Found' : 'Not found');
    }
  }

  // Method to refresh token from localStorage
  public refreshToken() {
    this.loadToken();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
      logger.log('🔑 Adding Authorization header');
    } else {
      logger.log('⚠️ No token available for API request');
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    logger.log('🌐 Making API request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!this.token,
      endpoint,
      headers: config.headers
    });

    try {
      // Add a timeout using AbortController. Default 30s unless overridden by options.timeout
      const controller = new AbortController();
      const timeoutMs = (options as any).timeout || 30000;
      // If caller passed a signal, prefer it but still set a timeout
      const userSignal = (options as any).signal as AbortSignal | undefined;
      const signal = userSignal || controller.signal;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { ...config, signal });

      clearTimeout(timeoutId);

      logger.log('📡 API response received:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle network errors (backend not running)
      if (!response.ok && response.status === 0) {
        logger.warn('Backend server appears to be offline');
        return {
          success: false,
          message: 'Backend service is currently unavailable',
          data: null as any,
          error: 'Backend offline'
        } as ApiResponse<T>;
      }

      // If not OK, try to parse server error and return it without throwing
      if (!response.ok) {
        let errorPayload: any = null;
        let responseText: string | undefined = undefined;
        try {
          const text = await response.text();
          responseText = text;
          console.log('🔍 [API ERROR] Raw response text:', text);
          console.log('🔍 [API ERROR] Response status:', response.status);
          console.log('🔍 [API ERROR] Response headers:', Object.fromEntries(response.headers.entries()));
          
          if (text && text.trim() && text.trim() !== '{}') {
            try {
              errorPayload = JSON.parse(text);
              console.log('🔍 [API ERROR] Parsed error payload:', errorPayload);
            } catch (parseError) {
              console.log('🔍 [API ERROR] Failed to parse as JSON, using as text');
              // Not JSON, use as text
            }
          } else {
            console.log('🔍 [API ERROR] Response text is empty or just {}');
          }
        } catch (readError) {
          console.error('🔍 [API ERROR] Failed to read response:', readError);
          // ignore
        }

        // Extract message from error payload - handle validation errors too
        let message = '';
        if (errorPayload) {
          if (typeof errorPayload === 'object' && errorPayload !== null) {
            // Check if it's an empty object
            const keys = Object.keys(errorPayload);
            if (keys.length === 0) {
              // Empty object - ignore it
              errorPayload = null;
            } else {
              const ep = errorPayload as Record<string, unknown>;
              const detail = ep.detail;
              let detailStr = '';
              if (typeof detail === 'string') {
                detailStr = detail;
              } else if (Array.isArray(detail)) {
                detailStr = detail
                  .map((d: unknown) =>
                    typeof d === 'object' && d !== null && 'msg' in d
                      ? String((d as { msg?: string }).msg)
                      : JSON.stringify(d),
                  )
                  .join('; ');
              }
              message =
                (typeof ep.message === 'string' ? ep.message : '') ||
                (typeof ep.error === 'string' ? ep.error : '') ||
                detailStr ||
                (errorPayload.errors &&
                Array.isArray(errorPayload.errors) &&
                errorPayload.errors.length > 0
                  ? `Validation failed: ${errorPayload.errors.map((e: any) => e.message || e.field).join(', ')}`
                  : '') ||
                '';
            }
          } else if (typeof errorPayload === 'string') {
            message = errorPayload;
          }
        }
        
        // Fallback to response text or status
        if (!message) {
          message = (responseText && responseText.trim() && responseText.trim() !== '{}') 
            ? responseText.trim() 
            : `${response.status} ${response.statusText || 'Unknown Error'}`;
        }
        
        // Final fallback
        if (!message || message === '{}') {
          message = `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
        }

        // Only log detailed errors for critical endpoints, not for notifications or non-essential features
        const isNonCriticalEndpoint = url.includes('/notifications') ||
          url.includes('/credentials') ||
          url.includes('/user/notifications') ||
          url.includes('/vpn/') ||
          url.includes('/aws-labs/'); // AWS Labs endpoints handle errors gracefully
        const isUnauthorized401 = response.status === 401;
        const hasAuthExpiryMessage =
          message.toLowerCase().includes('token expired') ||
          message.toLowerCase().includes('token') ||
          message.toLowerCase().includes('unauthorized');
        const isExpectedAuthExpiry = isUnauthorized401 && hasAuthExpiryMessage;
        const isKnownDeployConflict =
          response.status === 409 &&
          url.includes('/labs/admin/deploy-for-user') &&
          message.toLowerCase().includes('active deployment already exists');
        const isExpectedMissingPublishedPage =
          response.status === 404 &&
          url.includes('/catalog/pages/') &&
          message.toLowerCase().includes('published page not found');
        const isExpectedCohortRunNoLearners =
          response.status === 400 &&
          url.includes('/course/workshops/') &&
          url.includes('/request-run') &&
          message.toLowerCase().includes('no active learners');

        if (isExpectedAuthExpiry) {
          // Expected during app boot when an old JWT exists in localStorage.
          // AuthProvider handles cleanup via clearToken(); avoid noisy console errors.
          logger.warn('Auth probe failed with expired/invalid token; clearing session on client.');
        } else if (isKnownDeployConflict) {
          // Business-rule conflict: user already has active deployment for this lab.
          // This is an expected operational state and should not be logged as console error noise.
          logger.warn(`Deploy request skipped: ${message}`);
        } else if (isExpectedMissingPublishedPage) {
          // Expected while a CMS page is still in draft/unpublished.
          // Public routes will intentionally fallback to static content.
          logger.warn(`CMS page is not published yet: ${url}`);
        } else if (isExpectedCohortRunNoLearners) {
          // Normal operator mistake / empty cohort: UI should toast; avoid console error noise.
          logger.warn(`Cohort lab session not started: ${message}`);
        } else if (!isNonCriticalEndpoint) {
          // Ensure we always have a meaningful error message
          const errorMessage = message || responseText || `${response.status} ${response.statusText}` || 'Unknown error';
          
          // Build error object - never log empty objects
          const errorLogData: any = {
            status: response.status,
            statusText: response.statusText,
            url,
            error: errorMessage
          };
          
          // Only add these if they have meaningful content
          if (errorPayload && typeof errorPayload === 'object' && Object.keys(errorPayload).length > 0) {
            errorLogData.errorPayload = JSON.stringify(errorPayload, null, 2);
          }
          if (responseText && responseText.trim() && responseText.trim() !== '{}') {
            errorLogData.responseText = responseText;
          }
          
          // NEVER log empty objects - always ensure we have a valid error message
          // Guarantee errorMessage is never empty or {}
          const safeError = (errorMessage && errorMessage.trim() && errorMessage.trim() !== '{}') 
            ? errorMessage 
            : `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
          
          // Always log with message as first parameter (logger expects string first)
          logger.error(`API request failed: ${safeError}`, {
            status: response.status,
            statusText: response.statusText || 'Unknown',
            url,
            error: safeError,
            ...(errorPayload && typeof errorPayload === 'object' && Object.keys(errorPayload).length > 0 
              ? { errorPayload: JSON.stringify(errorPayload, null, 2) } 
              : {}),
            ...(responseText && responseText.trim() && responseText.trim() !== '{}' 
              ? { responseText } 
              : {})
          });
        } else {
          // For non-critical endpoints, just log a simple warning
          logger.warn(`API request failed for non-critical endpoint: ${url} (${response.status})`);
        }

        // Ensure message is never empty
        const finalMessage = message || responseText || `${response.status} ${response.statusText}` || 'Request failed';
        
        return {
          success: false,
          message: finalMessage,
          data: null as any,
          error: finalMessage,
        } as ApiResponse<T>;
      }

      let data;
      try {
        const responseText = await response.text();
        logger.log('📄 Raw response text length:', responseText.length);

        if (!responseText.trim()) {
          logger.warn('⚠️ Empty response body');
          return {
            success: false,
            message: 'Empty response from server',
            data: null as any,
            error: 'Empty response'
          } as ApiResponse<T>;
        }

        data = JSON.parse(responseText);
        logger.log('✅ JSON parsed successfully:', {
          url,
          status: response.status,
          dataKeys: data ? Object.keys(data) : [],
          success: data?.success,
          hasData: !!data?.data,
          responseSize: responseText.length
        });
      } catch (parseError) {
        logger.error('❌ JSON parse error:', {
          error: parseError,
          url,
          status: response.status,
          statusText: response.statusText
        });
        return {
          success: false,
          message: 'Invalid JSON response from server',
          data: null as any,
          error: 'JSON parse error'
        } as ApiResponse<T>;
      }

      return data;
    } catch (error: any) {
      if (error && error.name === 'AbortError') {
        logger.warn('API request aborted due to timeout:', { url, timeout: (options as any).timeout || 30000 });
        return {
          success: false,
          message: 'Request timeout',
          data: null as any,
          error: 'Request aborted due to timeout'
        } as ApiResponse<T>;
      }

      logger.warn('API request failed (network/exception):', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        url,
        method: config.method || 'GET',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        message: 'Network error',
        data: null as any,
        error: (error as Error)?.message || 'Network error'
      } as ApiResponse<T>;
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    // Backend auth is SSO-based now. Keep method for backward compatibility with existing UI.
    return {
      success: false,
      message: 'Email/password login is disabled. Use Google SSO.',
      data: null as any,
      error: 'SSO required',
    };
  }

  async register(name: string, email: string, password: string): Promise<ApiResponse<{ user: any; token: string }>> {
    return {
      success: false,
      message: 'Registration is handled via Google SSO.',
      data: null as any,
      error: 'SSO required',
    };
  }

  async ssoLogin(idToken: string, provider = 'google'): Promise<ApiResponse<{ user: any; token: string }>> {
    const tokenResponse = await this.request<{ access_token: string }>('/auth/sso/callback', {
      method: 'POST',
      body: JSON.stringify({ provider, id_token: idToken }),
    });

    if (!tokenResponse.success || !tokenResponse.data?.access_token) {
      return {
        success: false,
        message: tokenResponse.message || 'SSO login failed',
        data: null as any,
        error: tokenResponse.error || tokenResponse.message,
      };
    }

    const token = tokenResponse.data.access_token;
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cystar_token', token);
      logger.log('🔑 SSO token stored in localStorage');
    }

    const meResponse = await this.request<any>('/auth/me', { method: 'GET' });
    if (!meResponse.success || !meResponse.data) {
      return {
        success: false,
        message: meResponse.message || 'SSO login failed (profile fetch)',
        data: null as any,
        error: meResponse.error || meResponse.message,
      };
    }

    return {
      success: true,
      message: 'SSO login successful',
      data: {
        user: meResponse.data,
        token,
      },
    };
  }

  async getProfile(): Promise<ApiResponse<any>> {
    return this.request('/auth/me');
  }

  logout() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cystar_token');
      localStorage.removeItem('cystar_user');
      localStorage.removeItem('cystar_session_start');
      localStorage.removeItem('cystar_last_browser_session');
      sessionStorage.removeItem('cystar_browser_session');

      // Clear Razorpay cached data to prevent mobile number persistence
      this.clearRazorpayCache();
    }
  }

  clearRazorpayCache() {
    try {
      // Clear ALL localStorage items that might contain user data
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('razorpay') ||
          key.includes('rzp') ||
          key.includes('phone') ||
          key.includes('mobile') ||
          key.includes('contact') ||
          key.includes('checkout') ||
          key.includes('payment')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear ALL cookies that might contain user data
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('razorpay') ||
          name.includes('rzp') ||
          name.includes('phone') ||
          name.includes('mobile') ||
          name.includes('contact') ||
          name.includes('checkout') ||
          name.includes('payment')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        }
      });

      // Clear sessionStorage as well
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('razorpay') ||
          key.includes('rzp') ||
          key.includes('phone') ||
          key.includes('mobile') ||
          key.includes('contact') ||
          key.includes('checkout') ||
          key.includes('payment')
        )) {
          sessionKeysToRemove.push(key);
        }
      }

      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      logger.log('🔧 Comprehensive Razorpay cache cleared on logout');
    } catch (error) {
      logger.error('Error clearing Razorpay cache:', error);
    }
  }

  // Lab catalog is served from a static fallback list in lib/labs.ts — the
  // backend does not expose a public GET /labs or GET /labs/{id} route. The
  // /labs router handles deploy/status/join/admin only, which have their own
  // dedicated client methods. Do not add getLabs()/getLabById() here.

  // Payment methods
  async createCheckout(labId: string): Promise<ApiResponse<any>> {
    return this.request('/billing/orders', {
      method: 'POST',
      body: JSON.stringify({ content_id: labId }),
    });
  }

  /**
   * Client-side verify fallback. The webhook is the source of truth, but after
   * Razorpay checkout returns success we also POST the order+payment ids to
   * /billing/verify-capture so the server fetches the payment and fulfills
   * payments/purchases/entitlements immediately — useful when the webhook is
   * delayed or unreachable in dev. Signature is ignored (backend re-fetches
   * the payment authoritatively from Razorpay).
   */
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    _razorpaySignature?: string,
  ): Promise<ApiResponse<{ status: string; message?: string | null }>> {
    return this.request('/billing/verify-capture', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
      }),
    });
  }

  // Lab metadata (title, price, description, difficulty) comes from
  // api.catalogLabs() (GET /catalog/labs). Entitlements come from
  // api.entitlements() (GET /billing/entitlements). Deployments come from
  // GET /labs/status. Do not add /progress/* or /purchased-labs client methods
  // — no such endpoints exist on the backend.

  // Generic HTTP methods for quiz API
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    if (endpoint === '/auth/validate') {
      return this.request<T>('/auth/me', { method: 'GET' });
    }
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Notification methods
  async getUserNotifications(userId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/user/notifications/${userId}`);
  }

  async getUserCredentials(userId: string): Promise<ApiResponse<any[]>> {
    return this.request(`/user/credentials/${userId}`);
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.request(`/user/notifications/${notificationId}/read`, {
      method: 'PUT'
    });
  }

  // VPN methods
  async getCurrentVpnKey(): Promise<ApiResponse<any>> {
    const response = await this.request<any>('/tailnet/join-token', { method: 'POST' });
    if (!response.success || !response.data) return response;
    return {
      ...response,
      data: {
        key: response.data.authkey,
        expiresAt: response.data.expires_at,
        loginLink: response.data.command,
      },
    };
  }

  async generateVpnKey(): Promise<ApiResponse<any>> {
    const response = await this.request<any>('/tailnet/join-token', { method: 'POST' });
    if (!response.success || !response.data) return response;
    return {
      ...response,
      data: {
        key: response.data.authkey,
        expiresAt: response.data.expires_at,
        loginLink: response.data.command,
      },
    };
  }

  async markKeyAsUsed(keyId: string): Promise<ApiResponse<any>> {
    return this.request(`/vpn/mark-used/${keyId}`, {
      method: 'POST'
    });
  }

  // AWS Labs - Code verification and access
  async getAwsLabStatus(): Promise<ApiResponse<any>> {
    return this.request('/aws-labs/status');
  }

  async verifyAwsAccessCode(code: string): Promise<ApiResponse<any>> {
    return this.request('/aws-labs/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  async resendAwsAccessCode(): Promise<ApiResponse<any>> {
    return this.request('/aws-labs/resend-code', {
      method: 'POST'
    });
  }
}
// Create singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export types
export type { ApiResponse };

// Compatibility exports used across app
export interface User {
  id: string
  email: string
  role: string
  name?: string | null
  is_active?: boolean
  created_at?: string
}

export interface Entitlement {
  content_id: string
  status: string
  valid_from?: string | null
  valid_until?: string | null
}

// ── Catalog (GET /catalog/labs) ─────────────────────────────────────────
// Backend-authoritative lab catalog sourced from content_items + product_prices.
// The frontend must NOT hardcode ids, titles or prices — always consume this.
export interface CatalogPrice {
  amount_minor: number
  currency: string
}

export interface CatalogLab {
  id: string                 // content_items.id (UUID) — use for all API calls
  slug: string | null        // optional metadata.slug — use for URLs when present
  title: string
  description: string | null
  difficulty: string | null
  duration_minutes: number | null
  lab_type: string | null    // metadata.lab_type (e.g. 'windows')
  feature_chips?: string[]   // metadata.feature_chips — public catalog tags
  is_purchasable: boolean
  price: CatalogPrice | null
}

export interface AdminUser {
  user_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export interface AdminUserOverviewRow {
  user_id: string
  purchase_count: number
  pending_payment_count: number
  entitlement_active: number
  entitlement_expired: number
  entitlement_revoked: number
}

export interface AdminUserOpsSummaryRow {
  user_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
  purchase_count: number
  pending_payment_count: number
  entitlement_active: number
  entitlement_expired: number
  entitlement_revoked: number
  attempts30d: number
  failed30d: number
  live_now: number
  has_failed_any: boolean
}

export interface AdminDeployment {
  deployment_id: string
  content_id?: string
  user_id: string
  user_email?: string
  lab_title: string
  lab_type: string
  status: string
  public_ip?: string | null
  private_ip?: string | null
  error?: string | null
  terraform_outputs?: Record<string, any> | null
  created_at?: string
  updated_at?: string
  expires_at?: string
  participant_count?: number
}

export interface AdminDeploymentListResponse {
  deployments: AdminDeployment[]
  count: number
  total?: number
  limit?: number
  offset?: number
  has_more?: boolean
}

export type LabVisibility = "public" | "unlisted" | "private"

export interface Course {
  content_id: string
  title: string
  description: string | null
  difficulty: string | null
  duration_minutes: number | null
  is_active: boolean
  visibility: LabVisibility
  created_at: string
  lab_type?: string | null
}

export interface CoursePrice {
  amount_minor: number
  currency: string
  is_active: boolean
  created_at?: string
}

export interface CourseAdminRow {
  user_id: string
  email: string
  assigned_by: string
  assigned_at: string
  max_concurrent_deployments: number
  max_duration_hours: number
  guardrail_source?: "default" | "custom"
  guardrail_updated_at?: string
  guardrail_set_by?: string
  guardrail_set_by_email?: string | null
  active_deployments_count?: number
}

export interface DeploymentMember {
  user_id: string
  email: string
  added_by: string
  added_at: string
}

export interface AdminParticipantMembershipRow {
  user_id: string
  deployment_id: string
  lab_title: string
  status: string
}

export interface AdminBillingPaymentRow {
  payment_id: string
  user_id: string
  email: string
  gateway: string
  gateway_order_id: string
  gateway_payment_id?: string | null
  amount: number
  currency: string
  status: string
  created_at: string
  content_id?: string | null
  content_title?: string | null
  purchase_exists: boolean
  entitlement_status?: "active" | "expired" | "revoked" | null
  webhook_seen: boolean
}

export type DeploymentCoverageState =
  | "all_users_added"
  | "users_missing"
  | "no_users_added"
  | "not_running"

export interface AdminDeploymentCoverageRow {
  deployment_id: string
  content_id: string
  lab_title: string
  owner_email: string
  status: string
  created_at: string
  attached_count: number
  enrolled_count: number
  gap_count: number
  coverage_state: DeploymentCoverageState
}

export interface CreateCourseRequest {
  title: string
  description?: string
  difficulty?: string
  duration_minutes?: number
  lab_type: string
  slug?: string
  feature_chips?: string[]
  visibility?: LabVisibility
}

export interface CourseDetail {
  content_id: string
  title: string
  description: string | null
  difficulty: string | null
  duration_minutes: number | null
  is_active: boolean
  visibility: LabVisibility
  lab_type: string | null
  slug: string | null
  feature_chips: string[]
  created_at: string
}

export interface PatchCourseContentRequest {
  title?: string
  description?: string
  difficulty?: string
  duration_minutes?: number
  lab_type?: string
  slug?: string
  feature_chips?: string[]
}

export type WorkshopMode = "sponsored" | "open_organizer"
export type WorkshopPaymentStatus = "pending" | "paid" | "waived" | "refunded"
export type WorkshopStatus = "draft" | "active" | "archived"
export type WorkshopAccessPolicy = "requires_payment" | "demo"

export interface WorkshopRow {
  id: string
  internal_code?: string | null
  title: string
  description?: string | null
  content_id: string
  content_title?: string | null
  lead_admin_email?: string | null
  /** Present on `GET /course/my-operator-cohorts` and `GET /course/my-workshops`: your row in workshop_course_admins. */
  operator_is_lead?: boolean
  start_at?: string | null
  end_at?: string | null
  mode: WorkshopMode
  seat_cap: number
  used_seats: number
  payment_status: WorkshopPaymentStatus
  payment_id?: string | null
  payer_ref?: string | null
  access_policy: WorkshopAccessPolicy
  status: WorkshopStatus
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface WorkshopAdminRow {
  user_id: string
  email: string
  name?: string | null
  is_lead: boolean
}

export interface WorkshopPaymentSummary {
  payment_id: string
  amount: number
  currency: string
  gateway_status: string
  gateway_order_id: string
  gateway_payment_id?: string | null
}

export interface WorkshopDetail extends WorkshopRow {
  admins: WorkshopAdminRow[]
  payment?: WorkshopPaymentSummary | null
  content_lab_type?: string | null
}

export interface WorkshopActivityRow {
  id: string
  actor_user_id?: string | null
  actor_email?: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

export type OpsFeedSeverity = "info" | "warning" | "critical"

export type OpsFeedEscalation = "none" | "watch" | "urgent"

export interface OpsFeedRow {
  id: string
  event_key: string
  event_type: string
  severity: OpsFeedSeverity
  title: string
  message: string
  actor_user_id?: string | null
  actor_email?: string | null
  subject_type?: string | null
  subject_id?: string | null
  workshop_id?: string | null
  deployment_id?: string | null
  target_user_id?: string | null
  deep_link?: string | null
  metadata: Record<string, unknown>
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  assigned_to_user_id?: string | null
  escalation?: OpsFeedEscalation | null
  is_read: boolean
  read_at?: string | null
  read_by?: string | null
  created_at: string
  updated_at: string
}

export interface CreateWorkshopRequest {
  title: string
  description?: string | null
  content_id: string
  internal_code?: string | null
  start_at?: string | null
  end_at?: string | null
  mode?: WorkshopMode
  seat_cap: number
  payment_status?: WorkshopPaymentStatus
  payment_id?: string | null
  payer_ref?: string | null
  access_policy?: WorkshopAccessPolicy
  status?: WorkshopStatus
}

/** Razorpay cohort package order — same shape as single-lab checkout order response */
export interface RazorpayOrderResponse {
  razorpay_order_id: string
  amount_minor: number
  currency: string
  razorpay_key_id: string
  internal_payment_id: string
}

export interface GuardrailRequest {
  max_concurrent_deployments: number
  max_duration_hours: number
}

export type CourseResourceType = "text" | "link" | "pdf" | "file" | "manual"

export interface CourseResource {
  resource_id: string
  title: string
  description?: string | null
  resource_type: CourseResourceType
  url?: string | null
  file_key?: string | null
  mime_type?: string | null
  position: number
  is_visible: boolean
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export type ContentPageStatus = "draft" | "published" | "archived"
export type ContentSectionType = "hero" | "rich_text" | "cta" | "links" | "faq" | "media" | "custom"

export interface ContentPage {
  page_id: string
  slug: string
  title: string
  description?: string | null
  status: ContentPageStatus
  seo_title?: string | null
  seo_description?: string | null
  published_at?: string | null
  archived_at?: string | null
  created_at: string
  updated_at: string
}

export interface ContentSection {
  section_id: string
  section_key: string
  section_type: ContentSectionType
  position: number
  is_visible: boolean
  payload: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ContentActivityRow {
  id: string
  actor_user_id?: string | null
  entity_type: string
  entity_id: string
  action: string
  metadata: Record<string, any>
  created_at: string
}

export interface ContentPageRevision {
  revision_id: string
  reason?: string | null
  created_by?: string | null
  created_at: string
}

export interface PublicContentSection {
  section_key: string
  section_type: string
  position: number
  payload: Record<string, any>
}

export interface PublicContentPage {
  slug: string
  title: string
  description?: string | null
  seo_title?: string | null
  seo_description?: string | null
  sections: PublicContentSection[]
}

export interface MyCourse {
  content_id: string
  title: string
  description: string | null
  difficulty: string | null
  duration_minutes: number | null
  is_active: boolean
  assigned_at: string
  max_concurrent_deployments: number
  max_duration_hours: number
}

export interface CourseParticipant {
  user_id: string
  email: string
  enrolled_by: string
  enrolled_at: string
}

/** Lab runs you queued as course admin for a managed lab course, with attached members. */
export interface CourseManagedDeploymentMember {
  user_id: string
  email: string
}

export interface CourseManagedDeployment {
  deployment_id: string
  status: string
  lab_type: string
  created_at: string
  expires_at: string
  error_message?: string | null
  members: CourseManagedDeploymentMember[]
}

/** sessionStorage key — invite token survives login redirect (dev / SSO). */
export const WORKSHOP_INVITE_SESSION_KEY = "workshop_invite_token"

export interface WorkshopInvitePreview {
  valid: boolean
  reason?: string
  workshop_id?: string
  workshop_title?: string
  email_mask?: string
}

export interface WorkshopInviteRow {
  id: string
  email: string
  status: string
  invited_by: string | null
  accepted_user_id: string | null
  accepted_at: string | null
  expires_at: string
  email_sent_at: string | null
  last_email_error: string | null
  created_at: string
  updated_at: string
}

export interface WorkshopInviteCreateResult {
  invite_id: string
  email: string
  expires_at: string
  invite_url: string
  email_dispatched: boolean
  email_error?: string | null
}

export interface CohortRosterRuntimeRow {
  learner_key: string
  user_id: string | null
  email: string
  name?: string | null
  onboarding_method: "invitation" | "admin_enrollment"
  access_status: "not_activated" | "active" | "revoked" | "expired"
  seat_consuming: boolean
  invite?: {
    id?: string | null
    status?: string | null
    created_at?: string | null
    accepted_at?: string | null
    expires_at?: string | null
    email_sent_at?: string | null
    last_email_error?: string | null
  } | null
  entitlement?: {
    created_at?: string | null
    valid_until?: string | null
  } | null
  runtime: {
    state: "not_requested" | "queued" | "provisioning" | "ready" | "failed" | "ended"
    last_updated_at?: string | null
    failure_reason?: string | null
    deployment_id?: string | null
    deployment_status?: string | null
    expires_at?: string | null
  }
}

export interface CohortRosterRuntimeResponse {
  count: number
  seat_cap: number
  used_seats: number
  runtime_counts: {
    ready: number
    in_progress: number
    failed: number
  }
  rows: CohortRosterRuntimeRow[]
}

export interface CohortRunRow {
  deployment_id: string
  status: string
  lab_type: string
  error_message?: string | null
  created_at?: string | null
  updated_at?: string | null
  expires_at?: string | null
  members: Array<{ user_id: string; email: string }>
}

export interface DeployResult {
  deployment_id: string
  status: string
  expires_at: string
  participants_added?: number
  target_user_id?: string
}

export interface LabJoinResponse {
  deployment_id: string
  login_server: string
  authkey: string
  expires_at: string
  command: string
  ttl_minutes: number
}

export interface DeploymentAccessMachine {
  role: string
  label: string
  protocol: string
  port?: number | null
  host?: string | null
  private_ip?: string | null
  public_ip?: string | null
  username?: string | null
  password?: string | null
  credential_label?: string | null
}

export interface DeploymentAccessDetails {
  deployment_id: string
  lab_type?: string | null
  status: string
  is_owner: boolean
  access_model: string
  expires_at?: string | null
  instructions: string[]
  machines: DeploymentAccessMachine[]
}

function unwrap<T>(res: ApiResponse<T>, fallback: string): T {
  // Backend endpoints in this project often return plain JSON (not { success, data } envelopes).
  // Treat non-envelope responses as successful payloads.
  const maybeEnvelope = res as unknown as { success?: boolean; data?: T; error?: string; message?: string }
  if (typeof maybeEnvelope.success === "boolean") {
    if (maybeEnvelope.success) {
      return (typeof maybeEnvelope.data !== "undefined"
        ? maybeEnvelope.data
        : (res as unknown)) as T
    }
    throw new Error(maybeEnvelope.error || maybeEnvelope.message || fallback)
  }
  return res as unknown as T
}

function ensureOk(res: unknown, fallback: string): void {
  const maybeEnvelope = res as { success?: boolean; error?: string; message?: string }
  if (typeof maybeEnvelope?.success === "boolean" && !maybeEnvelope.success) {
    throw new Error(maybeEnvelope.error || maybeEnvelope.message || fallback)
  }
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("cystar_token", token)
  }
  apiClient.refreshToken()
}

export function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("cystar_token")
  }
  apiClient.logout()
}

export const api = {
  async me(): Promise<User> {
    const res = await apiClient.get<User>("/auth/me")
    return unwrap(res, "Failed to fetch profile")
  },

  async entitlements(): Promise<Entitlement[]> {
    const res = await apiClient.get<Entitlement[]>("/billing/entitlements")
    return unwrap(res, "Failed to fetch entitlements")
  },

  async catalogLabs(): Promise<CatalogLab[]> {
    const res = await apiClient.get<CatalogLab[]>("/catalog/labs")
    return unwrap(res, "Failed to fetch lab catalog")
  },

  async ssoCallback(provider: string, idToken: string): Promise<{ access_token: string }> {
    const res = await apiClient.post<{ access_token: string }>("/auth/sso/callback", {
      provider,
      id_token: idToken,
    })
    return unwrap(res, "SSO login failed")
  },

  async devLogin(): Promise<{ access_token: string }> {
    const res = await apiClient.post<{ access_token: string }>("/auth/dev-login")
    return unwrap(res, "Dev admin login failed")
  },

  async devLoginParticipant(email?: string): Promise<{ access_token: string }> {
    const res = await apiClient.post<{ access_token: string }>("/auth/dev-login-participant", email ? { email } : undefined)
    return unwrap(res, "Dev participant login failed")
  },

  async logout(): Promise<void> {
    const res = await apiClient.post("/auth/logout")
    ensureOk(res, "Failed to logout")
  },

  async listUsers(): Promise<{ users: AdminUser[] }> {
    const res = await apiClient.get<{ users: AdminUser[] }>("/auth/admin/users")
    return unwrap(res, "Failed to list users")
  },

  async allDeployments(params?: {
    limit?: number
    offset?: number
  }): Promise<AdminDeploymentListResponse> {
    const q = new URLSearchParams()
    if (typeof params?.limit === "number") q.set("limit", String(params.limit))
    if (typeof params?.offset === "number") q.set("offset", String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ""
    const res = await apiClient.get<AdminDeploymentListResponse>(`/labs/admin/all${suffix}`)
    return unwrap(res, "Failed to list deployments")
  },

  async adminDeploymentById(deploymentId: string): Promise<{ deployment: AdminDeployment }> {
    const res = await apiClient.get<{ deployment: AdminDeployment }>(
      `/labs/admin/deployments/${encodeURIComponent(deploymentId)}`,
    )
    return unwrap(res, "Failed to load deployment")
  },

  async adminUsersOverview(): Promise<{ rows: AdminUserOverviewRow[] }> {
    const res = await apiClient.get<{ rows: AdminUserOverviewRow[] }>("/auth/admin/users/overview")
    return unwrap(res, "Failed to fetch users overview")
  },

  async adminUsersOpsSummary(): Promise<{ rows: AdminUserOpsSummaryRow[] }> {
    const res = await apiClient.get<{ rows: AdminUserOpsSummaryRow[] }>("/auth/admin/users/ops-summary")
    return unwrap(res, "Failed to fetch users ops summary")
  },

  async listMembers(deploymentId: string): Promise<{ participants: DeploymentMember[] }> {
    const res = await apiClient.get<{ participants: DeploymentMember[] }>(
      `/labs/admin/deployments/${deploymentId}/members`,
    )
    return unwrap(res, "Failed to list deployment members")
  },

  async adminParticipantMembershipsByUser(): Promise<{ rows: AdminParticipantMembershipRow[] }> {
    const res = await apiClient.get<{ rows: AdminParticipantMembershipRow[] }>(
      "/labs/admin/memberships/by-user",
    )
    return unwrap(res, "Failed to load participant memberships")
  },

  async adminDeploymentCoverage(): Promise<{ rows: AdminDeploymentCoverageRow[] }> {
    const res = await apiClient.get<{ rows: AdminDeploymentCoverageRow[] }>(
      "/labs/admin/coverage",
    )
    return unwrap(res, "Failed to load deployment coverage")
  },

  async adminBillingPayments(params?: {
    status?: string
    user_id?: string
    limit?: number
  }): Promise<{ rows: AdminBillingPaymentRow[] }> {
    const q = new URLSearchParams()
    if (params?.status) q.set("status", params.status)
    if (params?.user_id) q.set("user_id", params.user_id)
    if (typeof params?.limit === "number") q.set("limit", String(params.limit))
    const suffix = q.toString() ? `?${q.toString()}` : ""
    const res = await apiClient.get<{ rows: AdminBillingPaymentRow[] }>(
      `/billing/admin/payments${suffix}`,
    )
    return unwrap(res, "Failed to load admin payments")
  },

  async listOpsFeed(params?: {
    severity?: OpsFeedSeverity
    is_read?: boolean
    q?: string
    limit?: number
    offset?: number
  }): Promise<{ count: number; rows: OpsFeedRow[] }> {
    const q = new URLSearchParams()
    if (params?.severity) q.set("severity", params.severity)
    if (typeof params?.is_read === "boolean") q.set("is_read", String(params.is_read))
    if (params?.q?.trim()) q.set("q", params.q.trim())
    if (typeof params?.limit === "number") q.set("limit", String(params.limit))
    if (typeof params?.offset === "number") q.set("offset", String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ""
    const res = await apiClient.get<{ count: number; rows: OpsFeedRow[] }>(`/admin/ops-feed${suffix}`)
    return unwrap(res, "Failed to load operations feed")
  },

  async opsFeedUnreadCount(): Promise<{ count: number }> {
    const res = await apiClient.get<{ count: number }>("/admin/ops-feed/unread-count")
    return unwrap(res, "Failed to load unread ops count")
  },

  async markOpsFeedRead(id: string): Promise<void> {
    const res = await apiClient.post(`/admin/ops-feed/${encodeURIComponent(id)}/read`)
    ensureOk(res, "Failed to mark feed item read")
  },

  async markAllOpsFeedRead(): Promise<{ ok: boolean; updated: number }> {
    const res = await apiClient.post<{ ok: boolean; updated: number }>("/admin/ops-feed/read-all")
    return unwrap(res, "Failed to mark all feed items read")
  },

  async repairOpsFeedReadState(): Promise<{
    ok: boolean
    reset_incomplete_read_rows: number
    cleared_stale_read_metadata_rows: number
  }> {
    const res = await apiClient.post<{
      ok: boolean
      reset_incomplete_read_rows: number
      cleared_stale_read_metadata_rows: number
    }>("/admin/ops-feed/repair-read-state")
    return unwrap(res, "Failed to repair operations feed read state")
  },

  async acknowledgeOpsFeedItem(id: string): Promise<{ ok: boolean; id: string }> {
    const res = await apiClient.post<{ ok: boolean; id: string }>(
      `/admin/ops-feed/${encodeURIComponent(id)}/acknowledge`,
    )
    return unwrap(res, "Failed to acknowledge feed item")
  },

  async patchOpsFeedWorkflow(
    id: string,
    body: { assigned_to_user_id?: string | null; escalation?: OpsFeedEscalation },
  ): Promise<{ ok: boolean; id: string }> {
    const res = await apiClient.patch<{ ok: boolean; id: string }>(
      `/admin/ops-feed/${encodeURIComponent(id)}/workflow`,
      body,
    )
    return unwrap(res, "Failed to update feed workflow")
  },

  async setRole(userId: string, role: string): Promise<void> {
    const res = await apiClient.post(`/admin/users/${userId}/role`, { role })
    ensureOk(res, "Failed to update role")
  },

  async disableUser(userId: string): Promise<void> {
    const res = await apiClient.post(`/auth/admin/users/${userId}/disable`)
    ensureOk(res, "Failed to disable user")
  },

  async enableUser(userId: string): Promise<void> {
    const res = await apiClient.post(`/auth/admin/users/${userId}/enable`)
    ensureOk(res, "Failed to enable user")
  },

  // ── Course management (sys_admin) ───────────────────────────────────────────
  async listCourses(): Promise<{ count: number; courses: Course[] }> {
    const res = await apiClient.get<{ count: number; courses: Course[] }>("/admin/courses")
    return unwrap(res, "Failed to list courses")
  },

  async createCourse(body: CreateCourseRequest): Promise<{ content_id: string; title: string }> {
    const res = await apiClient.post<{ content_id: string; title: string }>("/admin/courses", body)
    return unwrap(res, "Failed to create course")
  },

  async getCourse(contentId: string): Promise<CourseDetail> {
    const res = await apiClient.get<CourseDetail>(
      `/admin/courses/${encodeURIComponent(contentId)}`,
    )
    return unwrap(res, "Failed to load course")
  },

  async patchCourseContent(
    contentId: string,
    body: PatchCourseContentRequest,
  ): Promise<{ content_id: string; ok: boolean }> {
    const res = await apiClient.patch<{ content_id: string; ok: boolean }>(
      `/admin/courses/${encodeURIComponent(contentId)}/content`,
      body,
    )
    return unwrap(res, "Failed to update course")
  },

  async listWorkshops(params?: {
    q?: string
    segment?: "all" | "draft" | "live" | "closed" | "payment_pending"
  }): Promise<{ workshops: WorkshopRow[] }> {
    const q = new URLSearchParams()
    if (params?.q?.trim()) q.set("q", params.q.trim())
    if (params?.segment && params.segment !== "all") q.set("segment", params.segment)
    const suffix = q.toString() ? `?${q.toString()}` : ""
    const res = await apiClient.get<{ workshops: WorkshopRow[] }>(`/admin/workshops${suffix}`)
    return unwrap(res, "Failed to list workshops")
  },

  async getWorkshopActivity(workshopId: string): Promise<{ rows: WorkshopActivityRow[] }> {
    const res = await apiClient.get<{ rows: WorkshopActivityRow[] }>(
      `/admin/workshops/${encodeURIComponent(workshopId)}/activity`,
    )
    return unwrap(res, "Failed to load workshop activity")
  },

  async getWorkshop(workshopId: string): Promise<WorkshopDetail> {
    const res = await apiClient.get<WorkshopDetail>(
      `/admin/workshops/${encodeURIComponent(workshopId)}`,
    )
    return unwrap(res, "Failed to load workshop")
  },

  async createWorkshop(
    body: CreateWorkshopRequest,
  ): Promise<{ workshop: WorkshopRow }> {
    const res = await apiClient.post<{ workshop: WorkshopRow }>("/admin/workshops", body)
    return unwrap(res, "Failed to create workshop")
  },

  async patchWorkshop(
    workshopId: string,
    body: Partial<CreateWorkshopRequest> & { payment_id?: string | null },
  ): Promise<{ workshop: WorkshopRow }> {
    const res = await apiClient.patch<{ workshop: WorkshopRow }>(
      `/admin/workshops/${encodeURIComponent(workshopId)}`,
      body,
    )
    return unwrap(res, "Failed to update workshop")
  },

  /**
   * Corporate cohort: one Razorpay order for seat_cap × unit catalog price.
   * Fulfillment updates workshops.payment_id / payment_status (webhook or verify-capture).
   */
  async createWorkshopPackageOrder(workshopId: string): Promise<RazorpayOrderResponse> {
    const res = await apiClient.post<RazorpayOrderResponse>("/billing/workshop-orders", {
      workshop_id: workshopId,
    })
    return unwrap(res, "Failed to create workshop package order")
  },

  /** Server-side capture verification fallback for workshop checkout. */
  async verifyWorkshopCapture(
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): Promise<{ status: string; message?: string | null }> {
    const res = await apiClient.post<{ status: string; message?: string | null }>("/billing/verify-capture", {
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
    })
    return unwrap(res, "Failed to verify workshop payment capture")
  },

  /** Grant one learner a cohort seat (course_admin on workshop or sys_admin). */
  async grantWorkshopSeat(
    workshopId: string,
    userId: string,
  ): Promise<{ ok: boolean; user_id: string; valid_until: string | null }> {
    const res = await apiClient.post<{ ok: boolean; user_id: string; valid_until: string | null }>(
      `/admin/workshops/${encodeURIComponent(workshopId)}/grant-seat`,
      { user_id: userId },
    )
    return unwrap(res, "Failed to grant workshop seat")
  },

  async assignWorkshopAdmin(
    workshopId: string,
    userId: string,
    opts: { is_lead?: boolean } = {},
  ): Promise<{ workshop_id: string; user_id: string; is_lead: boolean }> {
    const res = await apiClient.post<{
      workshop_id: string
      user_id: string
      is_lead: boolean
    }>(
      `/admin/workshops/${encodeURIComponent(workshopId)}/admins/${encodeURIComponent(userId)}`,
      opts,
    )
    return unwrap(res, "Failed to assign workshop admin")
  },

  async removeWorkshopAdmin(workshopId: string, userId: string): Promise<void> {
    const res = await apiClient.delete(
      `/admin/workshops/${encodeURIComponent(workshopId)}/admins/${encodeURIComponent(userId)}`,
    )
    unwrap(res, "Failed to remove workshop admin")
  },

  async patchCourseVisibility(
    contentId: string,
    visibility: LabVisibility,
  ): Promise<{ content_id: string; visibility: LabVisibility }> {
    const res = await apiClient.patch<{ content_id: string; visibility: LabVisibility }>(
      `/admin/courses/${contentId}`,
      { visibility },
    )
    return unwrap(res, "Failed to update course visibility")
  },

  async listCourseAdmins(contentId: string): Promise<{ content_id: string; count: number; admins: CourseAdminRow[] }> {
    const res = await apiClient.get<{ content_id: string; count: number; admins: CourseAdminRow[] }>(
      `/admin/courses/${contentId}/admins`,
    )
    return unwrap(res, "Failed to list course admins")
  },

  async assignCourseAdmin(contentId: string, userId: string): Promise<void> {
    const res = await apiClient.post(`/admin/courses/${contentId}/admins/${userId}`)
    ensureOk(res, "Failed to assign course admin")
  },

  async removeCourseAdmin(contentId: string, userId: string): Promise<void> {
    const res = await apiClient.delete(`/admin/courses/${contentId}/admins/${userId}`)
    ensureOk(res, "Failed to remove course admin")
  },

  async setGuardrails(contentId: string, userId: string, body: GuardrailRequest): Promise<void> {
    const res = await apiClient.post(
      `/admin/courses/${contentId}/guardrails/${userId}`,
      body,
    )
    ensureOk(res, "Failed to update guardrails")
  },

  async getCoursePrice(
    contentId: string,
  ): Promise<{ content_id: string; price: CoursePrice | null }> {
    const res = await apiClient.get<{ content_id: string; price: CoursePrice | null }>(
      `/admin/courses/${encodeURIComponent(contentId)}/price`,
    )
    return unwrap(res, "Failed to load course price")
  },

  async upsertCoursePrice(
    contentId: string,
    body: { amount_minor: number; currency: string; is_active: boolean },
  ): Promise<{ content_id: string; amount_minor: number; currency: string; is_active: boolean }> {
    const res = await apiClient.put<{
      content_id: string
      amount_minor: number
      currency: string
      is_active: boolean
    }>(`/admin/courses/${encodeURIComponent(contentId)}/price`, body)
    return unwrap(res, "Failed to update course price")
  },

  async listCourseResources(
    contentId: string,
  ): Promise<{ content_id: string; count: number; resources: CourseResource[] }> {
    const res = await apiClient.get<{ content_id: string; count: number; resources: CourseResource[] }>(
      `/admin/courses/${encodeURIComponent(contentId)}/resources`,
    )
    return unwrap(res, "Failed to load course resources")
  },

  async createCourseResource(
    contentId: string,
    body: {
      title: string
      description?: string
      resource_type: CourseResourceType
      url?: string
      file_key?: string
      mime_type?: string
      position?: number
      is_visible?: boolean
      metadata?: Record<string, any>
    },
  ): Promise<{ resource_id: string; content_id: string }> {
    const res = await apiClient.post<{ resource_id: string; content_id: string }>(
      `/admin/courses/${encodeURIComponent(contentId)}/resources`,
      body,
    )
    return unwrap(res, "Failed to create course resource")
  },

  async patchCourseResource(
    contentId: string,
    resourceId: string,
    body: {
      title?: string
      description?: string
      resource_type?: CourseResourceType
      url?: string
      file_key?: string
      mime_type?: string
      position?: number
      is_visible?: boolean
      metadata?: Record<string, any>
    },
  ): Promise<{ resource_id: string; content_id: string }> {
    const res = await apiClient.patch<{ resource_id: string; content_id: string }>(
      `/admin/courses/${encodeURIComponent(contentId)}/resources/${encodeURIComponent(resourceId)}`,
      body,
    )
    return unwrap(res, "Failed to update course resource")
  },

  async deleteCourseResource(
    contentId: string,
    resourceId: string,
  ): Promise<{ resource_id: string; content_id: string; deleted: boolean }> {
    const res = await apiClient.delete<{ resource_id: string; content_id: string; deleted: boolean }>(
      `/admin/courses/${encodeURIComponent(contentId)}/resources/${encodeURIComponent(resourceId)}`,
    )
    return unwrap(res, "Failed to delete course resource")
  },

  async myVisibleCourseResources(
    contentId: string,
  ): Promise<{ content_id: string; count: number; resources: CourseResource[] }> {
    const res = await apiClient.get<{ content_id: string; count: number; resources: CourseResource[] }>(
      `/labs/resources/${encodeURIComponent(contentId)}`,
    )
    return unwrap(res, "Failed to load course resources")
  },

  // ── Content Studio (sys_admin) ──────────────────────────────────────────────
  async listContentPages(): Promise<{ count: number; pages: ContentPage[] }> {
    const res = await apiClient.get<{ count: number; pages: ContentPage[] }>("/admin/content/pages")
    return unwrap(res, "Failed to load content pages")
  },

  async createContentPage(body: {
    slug: string
    title: string
    description?: string
    seo_title?: string
    seo_description?: string
  }): Promise<{ page_id: string; slug: string }> {
    const res = await apiClient.post<{ page_id: string; slug: string }>("/admin/content/pages", body)
    return unwrap(res, "Failed to create content page")
  },

  async getContentPage(pageId: string): Promise<{ page: ContentPage; sections: ContentSection[] }> {
    const res = await apiClient.get<{ page: ContentPage; sections: ContentSection[] }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}`,
    )
    return unwrap(res, "Failed to load content page")
  },

  async patchContentPage(
    pageId: string,
    body: { title?: string; description?: string; seo_title?: string; seo_description?: string },
  ): Promise<{ page_id: string }> {
    const res = await apiClient.patch<{ page_id: string }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}`,
      body,
    )
    return unwrap(res, "Failed to update content page")
  },

  async patchContentPageStatus(
    pageId: string,
    status: ContentPageStatus,
  ): Promise<{ page_id: string; status: ContentPageStatus }> {
    const res = await apiClient.patch<{ page_id: string; status: ContentPageStatus }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}/status`,
      { status },
    )
    return unwrap(res, "Failed to update content page status")
  },

  async listContentPageRevisions(
    pageId: string,
  ): Promise<{ page_id: string; count: number; revisions: ContentPageRevision[] }> {
    const res = await apiClient.get<{ page_id: string; count: number; revisions: ContentPageRevision[] }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}/revisions`,
    )
    return unwrap(res, "Failed to load page revisions")
  },

  async rollbackContentPageRevision(
    pageId: string,
    revisionId: string,
  ): Promise<{ page_id: string; revision_id: string; rolled_back: boolean }> {
    const res = await apiClient.post<{ page_id: string; revision_id: string; rolled_back: boolean }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}/rollback/${encodeURIComponent(revisionId)}`,
    )
    return unwrap(res, "Failed to rollback page revision")
  },

  async createContentSection(
    pageId: string,
    body: {
      section_key: string
      section_type: ContentSectionType
      position?: number
      is_visible?: boolean
      payload?: Record<string, any>
    },
  ): Promise<{ section_id: string; page_id: string }> {
    const res = await apiClient.post<{ section_id: string; page_id: string }>(
      `/admin/content/pages/${encodeURIComponent(pageId)}/sections`,
      body,
    )
    return unwrap(res, "Failed to create content section")
  },

  async patchContentSection(
    sectionId: string,
    body: {
      section_key?: string
      section_type?: ContentSectionType
      position?: number
      is_visible?: boolean
      payload?: Record<string, any>
    },
  ): Promise<{ section_id: string }> {
    const res = await apiClient.patch<{ section_id: string }>(
      `/admin/content/sections/${encodeURIComponent(sectionId)}`,
      body,
    )
    return unwrap(res, "Failed to update content section")
  },

  async deleteContentSection(sectionId: string): Promise<{ section_id: string; deleted: boolean }> {
    const res = await apiClient.delete<{ section_id: string; deleted: boolean }>(
      `/admin/content/sections/${encodeURIComponent(sectionId)}`,
    )
    return unwrap(res, "Failed to delete content section")
  },

  async publicContentPageBySlug(slug: string): Promise<PublicContentPage> {
    const res = await apiClient.get<PublicContentPage>(`/catalog/pages/${encodeURIComponent(slug)}`)
    return unwrap(res, "Failed to load public content page")
  },

  async contentActivity(limit = 50): Promise<{ count: number; rows: ContentActivityRow[] }> {
    const res = await apiClient.get<{ count: number; rows: ContentActivityRow[] }>(
      `/admin/content/activity?limit=${encodeURIComponent(String(limit))}`,
    )
    return unwrap(res, "Failed to load content activity")
  },

  // ── course_admin workspace (/course) ────────────────────────────────────────
  async myCourses(): Promise<{ count: number; courses: MyCourse[] }> {
    const res = await apiClient.get<{ count: number; courses: MyCourse[] }>(
      "/course/my-courses",
    )
    return unwrap(res, "Failed to load your courses")
  },

  async myWorkshops(): Promise<{ count: number; workshops: WorkshopRow[] }> {
    const res = await apiClient.get<{ count: number; workshops: WorkshopRow[] }>(
      "/course/my-workshops",
    )
    return unwrap(res, "Failed to load your workshops")
  },

  /** Cohorts you operate — single backend source (`workshop_course_admins` + `workshops`). */
  async myOperatorCohorts(): Promise<{ count: number; cohorts: WorkshopRow[] }> {
    const res = await apiClient.get<{ count: number; cohorts: WorkshopRow[] }>(
      "/course/my-operator-cohorts",
    )
    return unwrap(res, "Failed to load cohorts")
  },

  async getCourseWorkshop(workshopId: string): Promise<WorkshopDetail> {
    const res = await apiClient.get<WorkshopDetail>(
      `/course/workshops/${encodeURIComponent(workshopId)}`,
    )
    return unwrap(res, "Failed to load workshop")
  },

  async previewWorkshopInvite(token: string): Promise<WorkshopInvitePreview> {
    const q = new URLSearchParams({ token })
    const res = await apiClient.get<WorkshopInvitePreview>(
      `/public/workshop-invites/preview?${q.toString()}`,
    )
    return unwrap(res, "Failed to load invite")
  },

  async listWorkshopInvites(
    workshopId: string,
  ): Promise<{ count: number; invites: WorkshopInviteRow[] }> {
    const res = await apiClient.get<{ count: number; invites: WorkshopInviteRow[] }>(
      `/course/workshops/${encodeURIComponent(workshopId)}/invites`,
    )
    return unwrap(res, "Failed to list invites")
  },

  async getCohortRosterRuntime(workshopId: string): Promise<CohortRosterRuntimeResponse> {
    const res = await apiClient.get<CohortRosterRuntimeResponse>(
      `/course/workshops/${encodeURIComponent(workshopId)}/roster-runtime`,
    )
    return unwrap(res, "Failed to load cohort roster")
  },

  async getCohortRuns(workshopId: string): Promise<{ count: number; runs: CohortRunRow[] }> {
    const res = await apiClient.get<{ count: number; runs: CohortRunRow[] }>(
      `/course/workshops/${encodeURIComponent(workshopId)}/runs`,
    )
    return unwrap(res, "Failed to load cohort runs")
  },

  async requestCohortRun(
    workshopId: string,
    body: { duration_hours: number },
  ): Promise<{ deployment_id: string; status: string; expires_at: string; members_attached: number }> {
    const res = await apiClient.post<{
      deployment_id: string
      status: string
      expires_at: string
      members_attached: number
    }>(`/course/workshops/${encodeURIComponent(workshopId)}/request-run`, body)
    return unwrap(res, "Failed to request delivery run")
  },

  async createWorkshopInvite(
    workshopId: string,
    body: { email: string },
  ): Promise<WorkshopInviteCreateResult> {
    const res = await apiClient.post<WorkshopInviteCreateResult>(
      `/course/workshops/${encodeURIComponent(workshopId)}/invites`,
      body,
    )
    return unwrap(res, "Failed to create invite")
  },

  async resendWorkshopInvite(
    workshopId: string,
    inviteId: string,
  ): Promise<WorkshopInviteCreateResult> {
    const res = await apiClient.post<WorkshopInviteCreateResult>(
      `/course/workshops/${encodeURIComponent(workshopId)}/invites/${encodeURIComponent(inviteId)}/resend`,
      {},
    )
    return unwrap(res, "Failed to resend invite")
  },

  async revokeWorkshopInvite(workshopId: string, inviteId: string): Promise<void> {
    const res = await apiClient.delete(
      `/course/workshops/${encodeURIComponent(workshopId)}/invites/${encodeURIComponent(inviteId)}`,
    )
    ensureOk(res, "Failed to revoke invite")
  },

  async redeemWorkshopInvite(token: string): Promise<{
    ok: boolean
    workshop_id: string
    workshop_title?: string | null
    valid_until?: string | null
  }> {
    const res = await apiClient.post<{
      ok: boolean
      workshop_id: string
      workshop_title?: string | null
      valid_until?: string | null
    }>("/auth/workshop-invite/redeem", { token })
    return unwrap(res, "Failed to accept invite")
  },

  async listCourseManagedDeployments(
    contentId: string,
  ): Promise<{ count: number; deployments: CourseManagedDeployment[] }> {
    const res = await apiClient.get<{ count: number; deployments: CourseManagedDeployment[] }>(
      `/course/${encodeURIComponent(contentId)}/deployments`,
    )
    return unwrap(res, "Failed to list managed deployments")
  },

  async listCourseParticipants(
    contentId: string,
  ): Promise<{ content_id: string; count: number; participants: CourseParticipant[] }> {
    const res = await apiClient.get<{
      content_id: string
      count: number
      participants: CourseParticipant[]
    }>(`/course/${contentId}/participants`)
    return unwrap(res, "Failed to list course participants")
  },

  async enrollCourseParticipant(contentId: string, userId: string): Promise<void> {
    const res = await apiClient.post(`/course/${contentId}/participants/${userId}`)
    ensureOk(res, "Failed to enroll participant")
  },

  async unenrollCourseParticipant(contentId: string, userId: string): Promise<void> {
    const res = await apiClient.delete(`/course/${contentId}/participants/${userId}`)
    ensureOk(res, "Failed to unenroll participant")
  },

  async deployCourseLab(
    contentId: string,
    body: { content_id: string; expires_at: string },
  ): Promise<DeployResult> {
    const res = await apiClient.post<DeployResult>(`/course/${contentId}/deploy`, body)
    return unwrap(res, "Failed to deploy lab")
  },

  // ── sys_admin emergency deploy (no guardrails) ──────────────────────────────
  async sysDeployLab(body: {
    content_id: string
    expires_at: string
  }): Promise<DeployResult> {
    const res = await apiClient.post<DeployResult>(`/labs/deploy`, body)
    return unwrap(res, "Failed to deploy lab")
  },

  async sysDeployLabForUser(body: {
    target_user_id: string
    content_id: string
    expires_at: string
  }): Promise<DeployResult> {
    const res = await apiClient.post<DeployResult>(`/labs/admin/deploy-for-user`, body)
    return unwrap(res, "Failed to deploy lab for user")
  },

  // ── Participant / any authenticated user ────────────────────────────────────
  async joinLab(deploymentId: string): Promise<LabJoinResponse> {
    const res = await apiClient.post<LabJoinResponse>(`/labs/join/${deploymentId}`)
    return unwrap(res, "Failed to mint join key")
  },

  async deploymentAccessDetails(deploymentId: string): Promise<DeploymentAccessDetails> {
    const res = await apiClient.get<DeploymentAccessDetails>(
      `/labs/access-details/${encodeURIComponent(deploymentId)}`,
    )
    return unwrap(res, "Failed to load deployment access details")
  },
}

