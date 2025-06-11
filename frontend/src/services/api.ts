import { SlabMeasurement, ReportFilters } from '../types';

// Simple environment variable access for React
declare const process: {
  env: {
    REACT_APP_API_URL?: string;
  };
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Slab Measurements API
  async createSlab(slabData: Omit<SlabMeasurement, 'id' | 'timestamp'>): Promise<SlabMeasurement> {
    return this.request<SlabMeasurement>('/slabs', {
      method: 'POST',
      body: JSON.stringify(slabData),
    });
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
    return this.request<void>(`/slabs/${id}`, {
      method: 'DELETE',
    });
  }

  async getNextSlabNumber(lotNumber: string): Promise<{ nextSlabNumber: number }> {
    return this.request<{ nextSlabNumber: number }>(`/slabs/next-slab-number/${lotNumber}`);
  }

  async getLastSlab(lotNumber: string): Promise<SlabMeasurement> {
    return this.request<SlabMeasurement>(`/slabs/last-slab/${lotNumber}`);
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
  }> {
    return this.request<{
      status: string;
      message: string;
      timestamp: string;
      version: string;
    }>('/health');
  }
}

export const apiService = new ApiService();
export default apiService; 