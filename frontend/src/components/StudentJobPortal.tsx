import React, { useState, useEffect } from 'react';

export interface PublicJob {
  id: string;
  company_name: string;
  title: string;
  description: string;
  location: string;
  work_mode: string;
  employment_type: string;
  salary_package: string | null;
  experience_requirement: string | null;
  qualification_requirement: string | null;
  required_skills: string[];
  preferred_skills: string[];
  branch_eligibility: string[];
  cgpa_requirement: number | null;
  backlog_requirement: number | null;
  source_name: string;
  source_type: string;
  source_url: string;
  apply_url: string;
  posted_at: string | null;
  closing_at: string | null;
  discovered_at: string;
}

const API_BASE = 'http://localhost:5000/api';

export const StudentJobPortal: React.FC = () => {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [workMode, setWorkMode] = useState<string>('');
  const [employmentType, setEmploymentType] = useState<string>('');
  const [sort, setSort] = useState<string>('latest');

  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [selectedJob, setSelectedJob] = useState<PublicJob | null>(null);

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    try {
      let query = `${API_BASE}/jobs?page=${page}&limit=12&sort=${sort}`;
      if (search) query += `&q=${encodeURIComponent(search.trim())}`;
      if (workMode) query += `&work_mode=${encodeURIComponent(workMode)}`;
      if (employmentType) query += `&employment_type=${encodeURIComponent(employmentType)}`;

      const res = await fetch(query, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.success) {
        setJobs(data.data.jobs || []);
        if (data.data.pagination) {
          setPagination(data.data.pagination);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student job feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(1);
  }, [workMode, employmentType, sort]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs(1);
  };

  return (
    <div className="section-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>💼 Verified Job Openings & Placement Drives</h3>
          <p className="subtitle">Discover admin-approved placement drives and apply on official portals</p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.75rem', margin: '1rem 0' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by job title, company, skills, or location..."
          style={{ padding: '0.65rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
        />

        <select
          value={workMode}
          onChange={(e) => setWorkMode(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
        >
          <option value="">All Work Modes</option>
          <option value="ON_SITE">On-Site</option>
          <option value="REMOTE">Remote</option>
          <option value="HYBRID">Hybrid</option>
        </select>

        <select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
        >
          <option value="">All Employment</option>
          <option value="FULL_TIME">Full Time</option>
          <option value="INTERNSHIP">Internship</option>
          <option value="PART_TIME">Part Time</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '0.5rem', background: 'rgba(15,23,42,0.8)', border: '1px solid var(--border)', color: '#fff' }}
        >
          <option value="latest">Latest Posted</option>
          <option value="oldest">Oldest Posted</option>
          <option value="company">Company Name</option>
        </select>

        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      {/* Jobs Grid */}
      {loading ? (
        <p>Loading verified job feed...</p>
      ) : jobs.length === 0 ? (
        <div className="empty-state">No approved job openings match your search criteria. Check back soon!</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem', marginTop: '1.25rem' }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                padding: '1.25rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid var(--border)',
                borderRadius: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>{job.title}</h4>
                  <span className="badge" style={{ fontSize: '0.75rem' }}>{job.work_mode}</span>
                </div>

                <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  🏢 {job.company_name}
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span>📍 {job.location}</span>
                  <span>💰 {job.salary_package || 'Not specified'}</span>
                </div>

                <p style={{
                  fontSize: '0.85rem',
                  color: '#cbd5e1',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: '0 0 1rem 0',
                }}>
                  {job.description}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
                  {job.required_skills?.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.4rem',
                        color: '#94a3b8',
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Source: {job.source_name}
                  </span>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setSelectedJob(job)}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}
                  >
                    View & Apply 🚀
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          <button
            className="btn-secondary"
            disabled={pagination.page <= 1}
            onClick={() => fetchJobs(pagination.page - 1)}
          >
            ← Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} Total Jobs)
          </span>
          <button
            className="btn-secondary"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchJobs(pagination.page + 1)}
          >
            Next →
          </button>
        </div>
      )}

      {/* Job Detail & Application Modal */}
      {selectedJob && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="badge status-online">{selectedJob.employment_type} • {selectedJob.work_mode}</div>
                <h2>{selectedJob.title}</h2>
                <h3 style={{ color: '#38bdf8', marginTop: '0.25rem' }}>🏢 {selectedJob.company_name}</h3>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setSelectedJob(null)}>✕ Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', background: 'rgba(15,23,42,0.6)', padding: '1rem', borderRadius: '0.75rem', margin: '1rem 0', fontSize: '0.9rem' }}>
              <div><strong>📍 Location:</strong> {selectedJob.location}</div>
              <div><strong>💰 Package / Salary:</strong> {selectedJob.salary_package || 'Not specified'}</div>
              <div><strong>🎓 Qualification:</strong> {selectedJob.qualification_requirement || 'Not specified'}</div>
              <div><strong>⏳ Experience:</strong> {selectedJob.experience_requirement || 'Not specified'}</div>
              <div><strong>📊 Minimum CGPA:</strong> {selectedJob.cgpa_requirement !== null ? `${selectedJob.cgpa_requirement}` : 'No CGPA cutoff'}</div>
              <div><strong>⚠️ Max Backlogs Allowed:</strong> {selectedJob.backlog_requirement !== null ? `${selectedJob.backlog_requirement}` : 'No backlog restriction'}</div>
              <div><strong>📅 Posted Date:</strong> {selectedJob.posted_at ? new Date(selectedJob.posted_at).toLocaleDateString() : 'Recently'}</div>
              <div><strong>⏰ Closing Date:</strong> {selectedJob.closing_at ? new Date(selectedJob.closing_at).toLocaleDateString() : 'Not specified'}</div>
            </div>

            <h4>Description & Responsibilities</h4>
            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#cbd5e1', fontSize: '0.95rem' }}>
              {selectedJob.description}
            </p>

            <h4>Required Skills</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
              {selectedJob.required_skills?.map((skill) => (
                <span key={skill} className="badge">{skill}</span>
              ))}
            </div>

            {selectedJob.branch_eligibility?.length > 0 && (
              <>
                <h4>Eligible Branches</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  {selectedJob.branch_eligibility.map((b) => (
                    <span key={b} className="badge" style={{ background: 'rgba(52, 211, 153, 0.2)', color: '#34d399' }}>{b}</span>
                  ))}
                </div>
              </>
            )}

            <div className="alert alert-info" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              ℹ️ <strong>External Application Notice:</strong> Clicking <em>Apply on Official Website</em> redirects you to the verified company/ATS application URL. This portal does not submit job applications directly.
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <a
                href={selectedJob.source_url}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                View Official Source 🔗
              </a>
              <a
                href={selectedJob.apply_url}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'inline-block', background: '#10b981' }}
              >
                Apply on Official Website 🚀
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
