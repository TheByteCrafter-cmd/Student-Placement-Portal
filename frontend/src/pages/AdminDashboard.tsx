import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5000/api';

type AdminTab = 'overview' | 'students' | 'jobs' | 'sources' | 'audit';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Dashboard Stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Student Management State
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>('');
  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<any>(null);

  // Job Moderation Queue State
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStatusTab, setJobStatusTab] = useState<string>('PENDING_REVIEW');
  const [jobsLoading, setJobsLoading] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejectingJobId, setRejectingJobId] = useState<string | null>(null);

  // Job Sources State
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState<boolean>(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 1. Fetch Dashboard Stats
  const fetchDashboardStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 2. Fetch Students List
  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      let query = `${API_BASE}/admin/students?page=1&limit=50`;
      if (studentSearch) query += `&search=${encodeURIComponent(studentSearch)}`;
      if (studentStatusFilter) query += `&status=${encodeURIComponent(studentStatusFilter)}`;

      const res = await fetch(query, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setStudents(data.data.students || []);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // 3. Fetch Jobs Queue
  const fetchJobs = async () => {
    setJobsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs?status=${jobStatusTab}&limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(data.data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  // 4. Fetch Job Sources
  const fetchSources = async () => {
    setSourcesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/sources`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSources(data.data.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
    } finally {
      setSourcesLoading(false);
    }
  };

  // 5. Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/audit-logs?limit=50`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditLogs(data.data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    setMessage(null);
    if (activeTab === 'overview') fetchDashboardStats();
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'jobs') fetchJobs();
    if (activeTab === 'sources') fetchSources();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, jobStatusTab]);

  // Actions
  const handleToggleStudentStatus = async (userId: string, currentActive: boolean) => {
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/students/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentActive }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Student account ${!currentActive ? 'activated' : 'deactivated'} successfully.` });
        await fetchStudents();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to update student status.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating student status.' });
    }
  };

  const handleApproveJob = async (jobId: string) => {
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${jobId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Job opening approved and published.' });
        await fetchJobs();
        await fetchDashboardStats();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to approve job.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error approving job.' });
    }
  };

  const handleRejectJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingJobId || !rejectionReason.trim()) return;

    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/jobs/${rejectingJobId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Job opening rejected.' });
        setRejectingJobId(null);
        setRejectionReason('');
        await fetchJobs();
        await fetchDashboardStats();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to reject job.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error rejecting job.' });
    }
  };

  const handleToggleSourceStatus = async (sourceId: string, currentEnabled: boolean) => {
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/sources/${sourceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_enabled: !currentEnabled }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Job source ${!currentEnabled ? 'enabled' : 'disabled'}.` });
        await fetchSources();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to toggle source.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error updating source.' });
    }
  };

  const inspectStudentDetail = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/students/${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedStudentDetail(data.data);
      }
    } catch (err) {
      console.error('Error loading student details:', err);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '1100px' }}>
      <div className="card">
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="badge status-warning">Phase 4 — Admin Control Center</div>
            <h2>Placement System Administration</h2>
            <p className="subtitle">Administrator: <code>{user?.email}</code></p>
          </div>
          <button className="btn-refresh" onClick={logout} style={{ background: '#ef4444' }}>
            Sign Out
          </button>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
            {message.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', margin: '1.5rem 0 1rem 0', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          <button className={`btn-secondary ${activeTab === 'overview' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Dashboard
          </button>
          <button className={`btn-secondary ${activeTab === 'students' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('students')}>
            👥 Students ({stats?.students?.total || 0})
          </button>
          <button className={`btn-secondary ${activeTab === 'jobs' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('jobs')}>
            💼 Moderation Queue ({stats?.jobs?.pending || 0})
          </button>
          <button className={`btn-secondary ${activeTab === 'sources' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('sources')}>
            🌐 Sources ({stats?.sources?.total || 0})
          </button>
          <button className={`btn-secondary ${activeTab === 'audit' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('audit')}>
            📜 Audit Trail
          </button>
        </div>

        {/* TAB 1: OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div>
            <h3>Operational Metrics Summary</h3>
            {statsLoading ? (
              <p>Loading stats...</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Registered Students</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>{stats?.students?.total || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#34d399' }}>Active: {stats?.students?.active || 0} • Inactive: {stats?.students?.inactive || 0}</div>
                </div>

                <div style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Pending Moderation Queue</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0', color: '#f59e0b' }}>{stats?.jobs?.pending || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Approved: {stats?.jobs?.approved || 0} • Rejected: {stats?.jobs?.rejected || 0}</div>
                </div>

                <div style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                  <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Job Discovery Channels</h4>
                  <div style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0' }}>{stats?.sources?.total || 0}</div>
                  <div style={{ fontSize: '0.85rem', color: '#60a5fa' }}>Active Channels: {stats?.sources?.enabled || 0}</div>
                </div>
              </div>
            )}

            <h4 style={{ marginTop: '2rem' }}>Recent Administrative Logs</h4>
            {stats?.recent_activity?.length === 0 ? (
              <p>No activity logs recorded yet.</p>
            ) : (
              <div className="code-block" style={{ fontSize: '0.85rem' }}>
                {stats?.recent_activity?.map((log: any) => (
                  <div key={log.id} style={{ marginBottom: '0.35rem' }}>
                    [{new Date(log.created_at).toLocaleTimeString()}] <strong>{log.action}</strong> on {log.entity_type} <code>{log.entity_id}</code>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDENT MANAGEMENT */}
        {activeTab === 'students' && (
          <div>
            <h3>Registered Student Management</h3>
            <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0' }}>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, email, roll number..."
                style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
              />
              <select
                value={studentStatusFilter}
                onChange={(e) => setStudentStatusFilter(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
              >
                <option value="">All Account Statuses</option>
                <option value="active">Active Accounts Only</option>
                <option value="inactive">Inactive Accounts Only</option>
              </select>
              <button className="btn-secondary" onClick={fetchStudents}>Filter</button>
            </div>

            {studentsLoading ? (
              <p>Loading students list...</p>
            ) : students.length === 0 ? (
              <div className="empty-state">No student records found matching filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Student</th>
                      <th style={{ padding: '0.75rem' }}>Roll No</th>
                      <th style={{ padding: '0.75rem' }}>Branch</th>
                      <th style={{ padding: '0.75rem' }}>CGPA</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div><strong>{s.first_name ? `${s.first_name} ${s.last_name}` : 'Profile Unfilled'}</strong></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.email}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}><code>{s.roll_number || 'N/A'}</code></td>
                        <td style={{ padding: '0.75rem' }}>{s.branch || 'N/A'}</td>
                        <td style={{ padding: '0.75rem' }}>{s.cgpa !== null ? s.cgpa : 'N/A'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${s.is_active ? 'status-online' : 'alert-error'}`}>
                            {s.is_active ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => inspectStudentDetail(s.user_id)}
                              style={{ fontSize: '0.8rem' }}
                            >
                              Inspect
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStudentStatus(s.user_id, s.is_active)}
                              style={{
                                background: s.is_active ? '#ef4444' : '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.65rem',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                              }}
                            >
                              {s.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: JOB MODERATION QUEUE */}
        {activeTab === 'jobs' && (
          <div>
            <h3>Job Verification & Moderation Queue</h3>
            <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
              <button className={`btn-secondary ${jobStatusTab === 'PENDING_REVIEW' ? 'btn-primary' : ''}`} onClick={() => setJobStatusTab('PENDING_REVIEW')}>
                ⏳ Pending Review
              </button>
              <button className={`btn-secondary ${jobStatusTab === 'APPROVED' ? 'btn-primary' : ''}`} onClick={() => setJobStatusTab('APPROVED')}>
                ✅ Approved & Published
              </button>
              <button className={`btn-secondary ${jobStatusTab === 'REJECTED' ? 'btn-primary' : ''}`} onClick={() => setJobStatusTab('REJECTED')}>
                🚫 Rejected
              </button>
            </div>

            {/* Rejection Dialog Form */}
            {rejectingJobId && (
              <form onSubmit={handleRejectJob} className="auth-card" style={{ maxWidth: '100%', margin: '1rem 0', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}>
                <h4>Mandatory Rejection Reason</h4>
                <div className="form-group">
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter explicit reason for rejecting this job posting..."
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button type="submit" className="btn-primary" style={{ background: '#ef4444' }}>Confirm Rejection</button>
                  <button type="button" className="btn-secondary" onClick={() => setRejectingJobId(null)}>Cancel</button>
                </div>
              </form>
            )}

            {jobsLoading ? (
              <p>Loading moderation queue...</p>
            ) : jobs.length === 0 ? (
              <div className="empty-state">No job listings in status <code>{jobStatusTab}</code>.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {jobs.map((j) => (
                  <div key={j.id} style={{ padding: '1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{j.title}</h4>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          <strong>{j.company_name}</strong> • 📍 {j.location} • 💼 {j.work_mode}
                        </div>
                      </div>
                      <span className={`badge ${j.verification_status === 'APPROVED' ? 'status-online' : j.verification_status === 'REJECTED' ? 'alert-error' : 'status-warning'}`}>
                        {j.verification_status}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: '0.75rem 0' }}>{j.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <div><strong>Source:</strong> <code>{j.source_name}</code></div>
                      <div><strong>Package:</strong> {j.salary_package || 'N/A'}</div>
                      <div><strong>Required Skills:</strong> {j.required_skills?.join(', ') || 'N/A'}</div>
                    </div>

                    {j.rejection_reason && (
                      <div className="alert alert-error" style={{ fontSize: '0.85rem' }}>
                        <strong>Rejection Reason:</strong> {j.rejection_reason}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      {j.verification_status === 'PENDING_REVIEW' && (
                        <>
                          <button type="button" className="btn-primary" onClick={() => handleApproveJob(j.id)}>
                            Approve & Publish
                          </button>
                          <button type="button" className="btn-secondary" style={{ color: '#fca5a5' }} onClick={() => setRejectingJobId(j.id)}>
                            Reject Job
                          </button>
                        </>
                      )}
                      <a href={j.source_url} target="_blank" rel="noreferrer" className="btn-secondary" style={{ textDecoration: 'none', fontSize: '0.8rem' }}>
                        Source Link 🔗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: JOB SOURCES */}
        {activeTab === 'sources' && (
          <div>
            <h3>Job Aggregation Sources Foundation</h3>
            <p className="subtitle">Configured source channels for future job discovery engine (Phase 6)</p>

            {sourcesLoading ? (
              <p>Loading job sources...</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                {sources.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                    <div>
                      <strong>{s.name}</strong> <span className="badge">{s.source_type}</span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        URL: <code>{s.source_url}</code> • Interval: {s.scan_interval}s
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleToggleSourceStatus(s.id, s.is_enabled)}
                        style={{
                          background: s.is_enabled ? '#10b981' : '#64748b',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '0.4rem',
                          padding: '0.4rem 0.85rem',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                        }}
                      >
                        {s.is_enabled ? 'Enabled ✅' : 'Disabled ⏸️'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: AUDIT LOG TRAIL */}
        {activeTab === 'audit' && (
          <div>
            <h3>Append-Only Administrative Audit Trail</h3>
            <p className="subtitle">Read-only audit log tracking admin operations</p>

            {auditLoading ? (
              <p>Loading audit trail...</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.6rem' }}>Timestamp</th>
                      <th style={{ padding: '0.6rem' }}>Action</th>
                      <th style={{ padding: '0.6rem' }}>Entity</th>
                      <th style={{ padding: '0.6rem' }}>Entity ID</th>
                      <th style={{ padding: '0.6rem' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.6rem' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ padding: '0.6rem' }}><strong>{log.action}</strong></td>
                        <td style={{ padding: '0.6rem' }}><span className="badge">{log.entity_type}</span></td>
                        <td style={{ padding: '0.6rem' }}><code>{log.entity_id}</code></td>
                        <td style={{ padding: '0.6rem', color: 'var(--text-muted)' }}>{JSON.stringify(log.metadata)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ maxWidth: '650px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>Student Profile Inspector</h3>
            <p className="subtitle">Email: {selectedStudentDetail.user?.email}</p>

            {selectedStudentDetail.profile ? (
              <div className="details-grid" style={{ margin: '1rem 0', fontSize: '0.9rem' }}>
                <div><strong>Name:</strong> {selectedStudentDetail.profile.first_name} {selectedStudentDetail.profile.last_name}</div>
                <div><strong>Roll No:</strong> {selectedStudentDetail.profile.roll_number}</div>
                <div><strong>Degree / Branch:</strong> {selectedStudentDetail.profile.degree} - {selectedStudentDetail.profile.branch}</div>
                <div><strong>CGPA:</strong> {selectedStudentDetail.profile.cgpa}</div>
                <div><strong>Backlogs:</strong> {selectedStudentDetail.profile.active_backlogs}</div>
                <div><strong>Phone:</strong> {selectedStudentDetail.profile.phone_number || 'N/A'}</div>
                <div><strong>10th / 12th %:</strong> {selectedStudentDetail.profile.tenth_percentage || 'N/A'}% / {selectedStudentDetail.profile.twelfth_percentage || 'N/A'}%</div>
                <div><strong>Skills:</strong> {selectedStudentDetail.profile.skills?.join(', ') || 'None'}</div>
              </div>
            ) : (
              <p>Student has not filled out profile details yet.</p>
            )}

            <button type="button" className="btn-primary" onClick={() => setSelectedStudentDetail(null)}>Close Inspector</button>
          </div>
        </div>
      )}
    </div>
  );
};
