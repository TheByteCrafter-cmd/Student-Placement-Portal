import React, { useState, useEffect } from 'react';

export interface Resume {
  id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  is_primary: boolean;
  uploaded_at: string;
}

const API_BASE = 'http://localhost:5000/api';

export const ResumeManager: React.FC<{ onResumeChange?: () => void }> = ({ onResumeChange }) => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchResumes = async () => {
    try {
      const res = await fetch(`${API_BASE}/students/resumes`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResumes(data.data.resumes || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch resumes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setMessage({ type: 'error', text: 'Only PDF files (.pdf) are allowed.' });
        setSelectedFile(null);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size exceeds maximum limit of 5 MB.' });
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a PDF file first.' });
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/students/resumes`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'PDF resume uploaded successfully.' });
        setSelectedFile(null);
        const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        await fetchResumes();
        if (onResumeChange) onResumeChange();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to upload resume.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network error uploading resume.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/students/resumes/${resumeId}/primary`, {
        method: 'PATCH',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Primary resume updated.' });
        await fetchResumes();
        if (onResumeChange) onResumeChange();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to update primary resume.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network error setting primary resume.' });
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;

    setMessage(null);
    try {
      const res = await fetch(`${API_BASE}/students/resumes/${resumeId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Resume deleted successfully.' });
        await fetchResumes();
        if (onResumeChange) onResumeChange();
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Failed to delete resume.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Network error deleting resume.' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="section-card" style={{ marginTop: '1.5rem' }}>
      <h3>📄 PDF Resume Management</h3>
      <p className="subtitle">Upload and manage your official placement resumes (PDF format, max 5MB)</p>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpload} className="upload-box" style={{ margin: '1rem 0' }}>
        <input
          id="resume-file-input"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploading}
        />
        <button type="submit" className="btn-primary" disabled={!selectedFile || uploading}>
          {uploading ? 'Uploading PDF...' : 'Upload Selected PDF'}
        </button>
      </form>

      {loading ? (
        <p>Loading resumes...</p>
      ) : resumes.length === 0 ? (
        <div className="empty-state">No resumes uploaded yet. Upload a PDF resume to get started.</div>
      ) : (
        <div className="resume-list">
          {resumes.map((r) => (
            <div
              key={r.id}
              className="resume-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1rem',
                background: 'rgba(15, 23, 42, 0.6)',
                border: r.is_primary ? '1px solid #3b82f6' : '1px solid var(--border)',
                borderRadius: '0.6rem',
                marginBottom: '0.75rem',
              }}
            >
              <div>
                <strong>{r.original_filename}</strong>{' '}
                {r.is_primary ? (
                  <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                    Primary ✅
                  </span>
                ) : null}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Size: {formatFileSize(r.file_size)} • Uploaded: {new Date(r.uploaded_at).toLocaleDateString()}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!r.is_primary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(r.id)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Set as Primary
                  </button>
                )}
                <a
                  href={`${API_BASE}/students/resumes/${r.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ textDecoration: 'none', display: 'inline-block', fontSize: '0.8rem' }}
                >
                  View PDF
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="btn-danger"
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
