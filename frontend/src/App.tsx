import { useState, useEffect } from 'react';
import './App.css';

interface HealthData {
  status: string;
  service: string;
  phase: string;
  timestamp: string;
  environment: string;
  uptimeSeconds: number;
  database: {
    connected: boolean;
    database: string;
    host: string;
    error?: string;
    serverTime?: string;
  };
}

function App() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend URL defaults to localhost:5000/api/health
      const response = await fetch('http://localhost:5000/api/health');
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const data: HealthData = await response.json();
      setHealth(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to reach backend server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Poll health status every 10 seconds
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <div className="badge">Phase 1 — Project Foundation</div>
        <h1>Student Placement Portal</h1>
        <p className="subtitle">
          Near-Real-Time Student Placement Intelligence Platform
        </p>
      </header>

      <main className="content">
        <section className="card status-card">
          <h2>System Foundation Status</h2>
          
          <div className="status-grid">
            <div className="status-item">
              <span className="label">Frontend Status</span>
              <span className="status-badge status-online">React + Vite Online</span>
            </div>

            <div className="status-item">
              <span className="label">Backend API (`/api/health`)</span>
              {loading && !health ? (
                <span className="status-badge status-pending">Connecting...</span>
              ) : error ? (
                <span className="status-badge status-offline">Backend Unreachable</span>
              ) : (
                <span className="status-badge status-online">
                  {health?.service} ({health?.status})
                </span>
              )}
            </div>

            <div className="status-item">
              <span className="label">PostgreSQL Database</span>
              {loading && !health ? (
                <span className="status-badge status-pending">Checking...</span>
              ) : health?.database?.connected ? (
                <span className="status-badge status-online">
                  Connected ({health.database.database})
                </span>
              ) : (
                <span className="status-badge status-warning">
                  Unreachable ({health?.database?.error || 'Database offline'})
                </span>
              )}
            </div>
          </div>

          <div className="action-row">
            <button className="btn-refresh" onClick={fetchHealth} disabled={loading}>
              {loading ? 'Refreshing Status...' : '🔄 Refresh Health Status'}
            </button>
            <span className="last-checked">
              {health?.timestamp ? `Last checked: ${new Date(health.timestamp).toLocaleTimeString()}` : ''}
            </span>
          </div>
        </section>

        {health && (
          <section className="card details-card">
            <h3>Backend Environment Details</h3>
            <div className="details-grid">
              <div><strong>Environment:</strong> <code>{health.environment}</code></div>
              <div><strong>Uptime:</strong> {health.uptimeSeconds} seconds</div>
              <div><strong>Service Phase:</strong> {health.phase}</div>
              <div><strong>Database Host:</strong> <code>{health.database.host}</code></div>
            </div>
          </section>
        )}

        {error && (
          <div className="alert alert-error">
            <strong>Connection Warning:</strong> Could not reach backend server at <code>http://localhost:5000/api/health</code>. Ensure the backend server is running.
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Student Placement Portal &copy; 2026 — Phase 1 Project Setup & Foundation</p>
      </footer>
    </div>
  );
}

export default App;
