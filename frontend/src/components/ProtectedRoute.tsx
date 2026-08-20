import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRole?: 'STUDENT' | 'ADMIN';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>Verifying authentication credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return (
      <div className="app-container">
        <div className="card alert-error">
          <h2>🚫 403 - Access Forbidden</h2>
          <p>
            Your account role (<code>{user.role}</code>) does not have permission to view this page (Requires: <code>{allowedRole}</code>).
          </p>
          <button className="btn-refresh" onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};
