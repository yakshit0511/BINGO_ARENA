import { API_BASE_URL } from '../constants';
import { ApiResponse } from '../types';

/**
 * Fetch server health status
 */
export async function checkServerHealth(): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to reach server',
    };
  }
}
