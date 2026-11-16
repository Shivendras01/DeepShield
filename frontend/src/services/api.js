/**
 * DeepShield Screening API Service Client
 * Handles communication with the Django REST Backend
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';
export const BACKEND_URL = 'http://localhost:8000';

export function resolveMediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${BACKEND_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const api = {
  // Health check
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE_URL}/health/`);
      if (!res.ok) throw new Error('Backend offline');
      return await res.json();
    } catch (err) {
      return { status: 'offline', error: err.message };
    }
  },

  // Submit e-KYC video session
  async submitScreening(formData) {
    const res = await fetch(`${API_BASE_URL}/screen/`, {
      method: 'POST',
      body: formData,
    });
    
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Backend server error (${res.status}): Please check backend logs.`);
    }

    if (!res.ok) {
      throw new Error(data.error || data.detail || `Screening request failed with status ${res.status}`);
    }
    return data;
  },

  // Get officer review queue sessions
  async getSessions() {
    const res = await fetch(`${API_BASE_URL}/sessions/`);
    if (!res.ok) throw new Error('Failed to fetch session queue');
    const data = await res.json();
    return Array.isArray(data) ? data : (data.results || data.sessions || []);
  },

  // Get full forensic dossier for a session
  async getSessionDetail(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/`);
    if (!res.ok) throw new Error('Failed to fetch forensic dossier');
    return await res.json();
  },

  // Submit officer decision (Approve / Reject)
  async submitReview(sessionId, { action, decision, notes }) {
    const normalizedDecision = decision || (action === 'APPROVE' || action === 'APPROVED' ? 'APPROVED' : 'REJECTED');
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/review/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        decision: normalizedDecision, 
        action: action || normalizedDecision, 
        notes 
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Review submission failed');
    }
    return data;
  },

  // Judge Demo / Viva Attack Scenario Simulation
  async simulateScenario(scenario) {
    const res = await fetch(`${API_BASE_URL}/simulate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scenario }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Scenario simulation failed');
    }
    return data;
  },

  // Clear all screening sessions and audit logs for clean teacher demo
  async clearAllSessions() {
    const res = await fetch(`${API_BASE_URL}/sessions/clear/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to clear session queue');
    }
    return data;
  },
};
