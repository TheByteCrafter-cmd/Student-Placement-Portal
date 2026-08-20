import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [testResult, setTestResult] = useState<string | null>(null);

  const testStudentEndpoint = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/student/test', {
        credentials: 'include',
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  };

  const testAdminEndpointAsStudent = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/admin/test', {
        credentials: 'include',
      });
      const data = await res.json();
      setTestResult(`HTTP ${res.status}: ${JSON.stringify(data, null, 2)}`);
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <div className="badge status-online">Student Authentication Active</div>
        <h2>Student Auth Dashboard Placeholder</h2>
        <p className="subtitle">Role-Based Access Control Verified for STUDENT</p>

        <div className="details-grid" style={{ margin: '1.5rem 0' }}>
          <div><strong>User ID:</strong> <code>{user?.id}</code></div>
          <div><strong>Email:</strong> <code>{user?.email}</code></div>
          <div><strong>Role:</strong> <code>{user?.role}</code></div>
          <div><strong>Account Status:</strong> {user?.is_active ? 'Active' : 'Disabled'}</div>
        </div>

        <div className="action-row" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={testStudentEndpoint}>
            Test /api/student/test (Allowed)
          </button>

          <button className="btn-secondary" onClick={testAdminEndpointAsStudent}>
            Test /api/admin/test (Expect 403 Forbidden)
          </button>

          <button className="btn-refresh" onClick={logout} style={{ background: '#ef4444' }}>
            Sign Out
          </button>
        </div>

        {testResult && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4>RBAC Endpoint Test Response:</h4>
            <pre className="code-block">{testResult}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
