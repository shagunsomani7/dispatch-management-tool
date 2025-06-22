import { SlabMeasurement, ReportFilters } from '../types';

// Simple environment variable access for React
declare const process: {
  env: {
    REACT_APP_API_URL?: string;
  };
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // TEMPORARILY BYPASS TOKEN REQUIREMENT FOR DEVELOPMENT
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      console.log('Making API request to:', `${this.baseUrl}${endpoint}`);
      console.log('Request options:', {
        method: options.method,
        headers,
        body: options.body ? JSON.parse(options.body as string) : undefined
      });

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });
        throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      }

      console.log('API Success Response:', responseData);
      return responseData;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof Error) {
        throw new Error(`API request failed: ${error.message}`);
      }
      throw new Error('API request failed: Unknown error occurred');
    }
  }

  // Slab Measurements API
  async createSlab(slabData: Omit<SlabMeasurement, '_id' | 'timestamp'>): Promise<SlabMeasurement> {
    console.log('Creating slab with data:', JSON.stringify(slabData, null, 2)); // Debug log
    try {
      // Remove any id fields from cornerDeductions
      const cleanedData = {
        ...slabData,
        cornerDeductions: slabData.cornerDeductions.map(({ length, height, area }) => ({
          length,
          height,
          area
        }))
      };
      
      console.log('Sending cleaned data:', JSON.stringify(cleanedData, null, 2));
      
      const response = await this.request<SlabMeasurement>('/slabs', {
        method: 'POST',
        body: JSON.stringify(cleanedData),
      });
      
      console.log('Slab created successfully:', response);
      return response;
    } catch (error) {
      console.error('Error in createSlab:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to create slab: ${error.message}`);
      }
      throw new Error('Failed to create slab: Unknown error occurred');
    }
  }

  async getSlabs(params?: {
    page?: number;
    limit?: number;
    partyName?: string;
    materialName?: string;
    supervisorName?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    slabs: SlabMeasurement[];
    totalPages: number;
    currentPage: number;
    total: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      // Use proper typing for Object.entries
      (Object.keys(params) as Array<keyof typeof params>).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    return this.request<{
      slabs: SlabMeasurement[];
      totalPages: number;
      currentPage: number;
      total: number;
    }>(`/slabs?${queryParams.toString()}`);
  }

  async getSlab(id: string): Promise<SlabMeasurement> {
    return this.request<SlabMeasurement>(`/slabs/${id}`);
  }

  async updateSlab(id: string, slabData: Partial<SlabMeasurement>): Promise<SlabMeasurement> {
    return this.request<SlabMeasurement>(`/slabs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slabData),
    });
  }

  async deleteSlab(id: string): Promise<void> {
    if (!id) {
      throw new Error('Invalid slab ID');
    }
    try {
      await this.request<void>(`/slabs/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error in deleteSlab:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to delete slab: ${error.message}`);
      }
      throw new Error('Failed to delete slab: Unknown error occurred');
    }
  }

  async clearAllSlabs(): Promise<void> {
    return this.request<void>('/slabs/clear-all', {
      method: 'DELETE',
    });
  }

  async getNextSlabNumber(lotNumber: string): Promise<{ nextSlabNumber: number }> {
    return this.request<{ nextSlabNumber: number }>(`/slabs/next-slab-number/${lotNumber}`);
  }

  async getLastSlab(lotNumber: string): Promise<SlabMeasurement> {
    return this.request<SlabMeasurement>(`/slabs/last-slab/${lotNumber}`);
  }

  async getNextDispatchCode(year: number, month: number): Promise<{
    nextDispatchCode: number;
    nextLotNumber: string;
    monthPrefix: string;
  }> {
    return this.request<{
      nextDispatchCode: number;
      nextLotNumber: string;
      monthPrefix: string;
    }>(`/slabs/next-dispatch-code/${year}/${month}`);
  }

  // Reports API
  async getAnalytics(filters?: ReportFilters): Promise<{
    summary: {
      totalSlabs: number;
      totalArea: number;
      averageAreaPerSlab: number;
    };
    partyBreakdown: any[];
    materialBreakdown: any[];
    supervisorPerformance: any[];
  }> {
    const queryParams = new URLSearchParams();
    if (filters) {
      // Use proper typing for Object.entries with ReportFilters
      (Object.keys(filters) as Array<keyof ReportFilters>).forEach((key) => {
        const value = filters[key];
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            queryParams.append(key, value.toISOString().split('T')[0]);
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    return this.request<{
      summary: {
        totalSlabs: number;
        totalArea: number;
        averageAreaPerSlab: number;
      };
      partyBreakdown: any[];
      materialBreakdown: any[];
      supervisorPerformance: any[];
    }>(`/reports/analytics?${queryParams.toString()}`);
  }

  async getDailyReport(date?: string): Promise<{
    summary: {
      date: string;
      totalSlabs: number;
      totalArea: number;
      parties: number;
      supervisors: number;
    };
    slabs: SlabMeasurement[];
  }> {
    const queryParams = date ? `?date=${date}` : '';
    return this.request<{
      summary: {
        date: string;
        totalSlabs: number;
        totalArea: number;
        parties: number;
        supervisors: number;
      };
      slabs: SlabMeasurement[];
    }>(`/reports/daily${queryParams}`);
  }

  // Health Check
  async healthCheck(): Promise<{
    status: string;
    message: string;
    timestamp: string;
    version: string;
    database?: string;
  }> {
    return this.request<{
      status: string;
      message: string;
      timestamp: string;
      version: string;
      database?: string;
    }>('/health');
  }

  // Auth API
  async login(username: string, password: string): Promise<{ token: string; user: { username: string; role: string } }> {
    try {
      console.log('Attempting login with:', { username });
      
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      return data;
    } catch (error) {
      console.error('Login failed:', error);
      if (error instanceof Error) {
        throw new Error(`Login failed: ${error.message}`);
      }
      throw new Error('Login failed: Unknown error occurred');
    }
  }

  async getCurrentUser(): Promise<{ username: string; role: string }> {
    return this.request<{ user: { username: string; role: string } }>('/auth/me')
      .then(response => response.user);
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
  }

  clearToken() {
    localStorage.removeItem('token');
  }

  // Party API
  async getParties(q?: string): Promise<{ _id: string; name: string }[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.request<{ _id: string; name: string }[]>(`/parties${query}`, {
      method: 'GET',
    });
  }

  async createParty(name: string): Promise<{ _id: string; name: string }> {
    return this.request<{ _id: string; name: string }>(`/parties`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  // Materials API
  async getMaterials(q?: string): Promise<{ _id: string; name: string }[]> {
    const queryParams = new URLSearchParams();
    if (q) {
      queryParams.append('q', q);
    }
    return this.request<{ _id: string; name: string }[]>(`/materials?${queryParams.toString()}`);
  }

  async createMaterial(name: string): Promise<{ _id: string; name: string }> {
    return this.request<{ _id: string; name: string }>(`/materials`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }
}

export const apiService = new ApiService();
export default apiService; 