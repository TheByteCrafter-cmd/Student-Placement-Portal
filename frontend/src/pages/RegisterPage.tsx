import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const success = await register(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate('/student');
    }
  };

  return (
    <div className="auth-card">
      <div className="badge">Student Registration</div>
      <h2>Create Student Account</h2>
      <p className="auth-subtitle">Register to discover curated placement drives</p>

      {(localError || error) && <div className="alert alert-error">{localError || error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setLocalError(null); clearError(); setEmail(e.target.value); }}
            placeholder="student@university.edu"
            required
          />
        </div>

        <div className="form-group">
          <label>Password (min 8 characters)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => { setLocalError(null); clearError(); setPassword(e.target.value); }}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => { setLocalError(null); clearError(); setConfirmPassword(e.target.value); }}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating Account...' : 'Register Account'}
        </button>
      </form>

      <div className="auth-footer">
        Already registered? <Link to="/login">Sign In</Link>
      </div>
    </div>
  );
};
