import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResumeManager } from '../components/ResumeManager';

interface StudentProfile {
  first_name: string;
  last_name: string;
  roll_number: string;
  degree: string;
  branch: string;
  graduation_year: number;
  cgpa: number;
  active_backlogs: number;
  skills: string[];
  phone_number: string;
  tenth_percentage: string;
  twelfth_percentage: string;
  diploma_percentage: string;
  github_url: string;
  linkedin_url: string;
  portfolio_url: string;
}

const API_BASE = 'http://localhost:5000/api';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [completionScore, setCompletionScore] = useState<number>(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<StudentProfile>({
    first_name: '',
    last_name: '',
    roll_number: '',
    degree: 'B.Tech',
    branch: 'Computer Science & Engineering',
    graduation_year: new Date().getFullYear(),
    cgpa: 0.0,
    active_backlogs: 0,
    skills: [],
    phone_number: '',
    tenth_percentage: '',
    twelfth_percentage: '',
    diploma_percentage: '',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
  });

  const [skillInput, setSkillInput] = useState<string>('');

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/profile`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompletionScore(data.data.profile_completion || 0);
        if (data.data.profile) {
          const p = data.data.profile;
          setFormData({
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            roll_number: p.roll_number || '',
            degree: p.degree || 'B.Tech',
            branch: p.branch || 'Computer Science & Engineering',
            graduation_year: p.graduation_year || new Date().getFullYear(),
            cgpa: p.cgpa !== null && p.cgpa !== undefined ? p.cgpa : 0.0,
            active_backlogs: p.active_backlogs || 0,
            skills: p.skills || [],
            phone_number: p.phone_number || '',
            tenth_percentage: p.tenth_percentage !== null && p.tenth_percentage !== undefined ? String(p.tenth_percentage) : '',
            twelfth_percentage: p.twelfth_percentage !== null && p.twelfth_percentage !== undefined ? String(p.twelfth_percentage) : '',
            diploma_percentage: p.diploma_percentage !== null && p.diploma_percentage !== undefined ? String(p.diploma_percentage) : '',
            github_url: p.github_url || '',
            linkedin_url: p.linkedin_url || '',
            portfolio_url: p.portfolio_url || '',
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMessage(null);
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'graduation_year' || name === 'active_backlogs' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleAddSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    // Validation
    if (formData.cgpa < 0 || formData.cgpa > 10) {
      setMessage({ type: 'error', text: 'CGPA must be a number between 0.00 and 10.00.' });
      setSaving(false);
      return;
    }

    if (formData.active_backlogs < 0) {
      setMessage({ type: 'error', text: 'Active backlogs cannot be negative.' });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/students/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Student profile saved successfully!' });
        if (data.data.profile_completion !== undefined) {
          setCompletionScore(data.data.profile_completion);
        }
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to save profile.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network error saving profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="badge status-online">Student Placement Profile</div>
            <h2>Student Profile Portal</h2>
            <p className="subtitle">Account: <code>{user?.email}</code></p>
          </div>
          <button className="btn-refresh" onClick={logout} style={{ background: '#ef4444' }}>
            Sign Out
          </button>
        </div>

        {/* Profile Completion Score Banner */}
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <strong>Profile Completion Score:</strong>
            <strong style={{ color: completionScore >= 80 ? '#34d399' : '#f59e0b' }}>{completionScore}%</strong>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${completionScore}%`,
              height: '100%',
              background: completionScore >= 80 ? '#10b981' : '#f59e0b',
              transition: 'width 0.3s ease',
            }}></div>
          </div>
        </div>

        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
            {message.text}
          </div>
        )}

        {profileLoading ? (
          <p>Loading profile details...</p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: '1.5rem' }}>
            {/* Personal Details */}
            <h3>👤 Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  required
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Roll Number / Student ID</label>
                <input
                  type="text"
                  name="roll_number"
                  value={formData.roll_number}
                  onChange={handleChange}
                  placeholder="2026-CSE-001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contact Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            {/* Academic Details */}
            <h3 style={{ marginTop: '1.5rem' }}>🎓 Academic Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Degree Program</label>
                <input
                  type="text"
                  name="degree"
                  value={formData.degree}
                  onChange={handleChange}
                  placeholder="B.Tech / M.Tech / BCA"
                  required
                />
              </div>
              <div className="form-group">
                <label>Branch / Major</label>
                <input
                  type="text"
                  name="branch"
                  value={formData.branch}
                  onChange={handleChange}
                  placeholder="Computer Science & Engineering"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Graduation Year</label>
                <input
                  type="number"
                  name="graduation_year"
                  value={formData.graduation_year}
                  onChange={handleChange}
                  min="1990"
                  max="2100"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cumulative CGPA (0.00 - 10.00)</label>
                <input
                  type="number"
                  step="0.01"
                  name="cgpa"
                  value={formData.cgpa}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cgpa: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  max="10"
                  required
                />
              </div>

              <div className="form-group">
                <label>Active Backlogs</label>
                <input
                  type="number"
                  name="active_backlogs"
                  value={formData.active_backlogs}
                  onChange={handleChange}
                  min="0"
                  required
                />
              </div>
            </div>

            {/* Placement Academic Percentages */}
            <h4 style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Placement Academic Percentages</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>10th Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="tenth_percentage"
                  value={formData.tenth_percentage}
                  onChange={handleChange}
                  placeholder="e.g. 92.50"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label>12th Percentage (%)</label>
                <input
                  type="number"
                  step="0.01"
                  name="twelfth_percentage"
                  value={formData.twelfth_percentage}
                  onChange={handleChange}
                  placeholder="e.g. 88.00"
                  min="0"
                  max="100"
                />
              </div>

              <div className="form-group">
                <label>Diploma Percentage (%) [Optional]</label>
                <input
                  type="number"
                  step="0.01"
                  name="diploma_percentage"
                  value={formData.diploma_percentage}
                  onChange={handleChange}
                  placeholder="e.g. 85.00"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Skills Tag Input */}
            <h3 style={{ marginTop: '1.5rem' }}>🛠️ Skills & Technologies</h3>
            <div className="form-group">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add skill (e.g. React, Node.js, Python)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <button type="button" onClick={handleAddSkill} className="btn-secondary">
                  Add Tag
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      background: 'rgba(37, 99, 235, 0.25)',
                      border: '1px solid rgba(96, 165, 250, 0.4)',
                      color: '#93c5fd',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.85rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#fca5a5',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Professional Links */}
            <h3 style={{ marginTop: '1.5rem' }}>🌐 Professional Links</h3>
            <div className="form-group">
              <label>GitHub Profile URL</label>
              <input
                type="url"
                name="github_url"
                value={formData.github_url}
                onChange={handleChange}
                placeholder="https://github.com/username"
              />
            </div>

            <div className="form-group">
              <label>LinkedIn Profile URL</label>
              <input
                type="url"
                name="linkedin_url"
                value={formData.linkedin_url}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="form-group">
              <label>Portfolio / Personal Website URL</label>
              <input
                type="url"
                name="portfolio_url"
                value={formData.portfolio_url}
                onChange={handleChange}
                placeholder="https://myportfolio.dev"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '1rem' }}>
              {saving ? 'Saving Profile...' : 'Save Profile Changes'}
            </button>
          </form>
        )}
      </div>

      {/* Resume Management Section */}
      <ResumeManager onResumeChange={fetchProfile} />
    </div>
  );
};
