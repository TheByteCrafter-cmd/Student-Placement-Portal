import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      // Redirect based on user role handled after state update
      navigate('/');
    }
  };

  const fillQuickAccount = (accountEmail: string, accountPass: string) => {
    clearError();
    setEmail(accountEmail);
    setPassword(accountPass);
  };

  return (
    <div className="auth-card">
      <div className="badge">Phase 2 — Authentication</div>
      <h2>Account Login</h2>
      <p className="auth-subtitle">Student & Placement Officer Authentication</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { clearError(); setEmail(e.target.value); }}
            placeholder="student@placement.edu"
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { clearError(); setPassword(e.target.value); }}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="dev-accounts-hint">
        <h4>⚡ Quick Development Accounts</h4>
        <div className="hint-buttons">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => fillQuickAccount('admin@placement.edu', 'Admin@Placement2026!')}
          >
            Fill Admin Credentials
          </button>
        </div>
      </div>

      <div className="auth-footer">
        Need a student account? <Link to="/register">Register as Student</Link>
      </div>
    </div>
  );
};
