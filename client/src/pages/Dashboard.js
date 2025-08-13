import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode toggle
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
      localStorage.setItem('darkMode', newMode.toString());
      return newMode;
    });
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.documentElement.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/register');
          return;
        }
        
  const response = await axios.get(`${API_BASE_URL}/api/documents`, {
          headers: { 'x-auth-token': token },
        });
        setDocuments(response.data || []);
      } catch (error) {
        console.error('Failed to fetch documents', error);
        setError('Failed to load documents. Please try again.');
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/register');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [navigate]);

  // Sync query state from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, [location.search]);

  // Live search via header event
  useEffect(() => {
    const handler = (e) => setQuery((e.detail?.q || '').toString());
    window.addEventListener('teamflow:search', handler);
    return () => window.removeEventListener('teamflow:search', handler);
  }, []);

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(d =>
      (d.title || 'Untitled Document').toLowerCase().includes(q) ||
      (d._id || '').toLowerCase().includes(q)
    );
  }, [documents, query]);

  // Toggle selection of a document in selection mode
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setDeleteFeedback(null);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmMsg = `Delete ${selectedIds.size} document(s) permanently? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;
    setDeleting(true);
    setDeleteFeedback(null);
    const token = localStorage.getItem('token');
    const results = { success: [], failed: [] };
    for (const id of selectedIds) {
      try {
        await axios.delete(`${API_BASE_URL}/api/documents/${id}`, { headers: { 'x-auth-token': token } });
        results.success.push(id);
      } catch (e) {
        results.failed.push({ id, status: e.response?.status });
      }
    }
    // Update local state
    setDocuments(prev => prev.filter(d => !results.success.includes(d._id)));
    setDeleting(false);
    setDeleteFeedback(results);
    // If all succeeded, exit selection mode automatically
    if (results.failed.length === 0) {
      setTimeout(() => exitSelectionMode(), 800);
    }
  }, [selectedIds, exitSelectionMode]);

  // Header and create actions removed per request

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-title">Loading Documents...</div>
          <div className="centered"><div className="loader" aria-label="Loading" /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-title">Error</div>
          <div className="error-text centered">{error}</div>
          <button className="btn-primary btn-retry" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" data-theme={darkMode ? 'dark' : 'light'}>
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h2 className="dashboard-title">Document Dashboard</h2>
        </div>
        <div className="header-right">
          <button 
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button 
            className="logout-button"
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/register');
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="documents-grid">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 className="documents-title" style={{ margin: 0 }}>Your Documents</h3>
          {!selectionMode && (
            <button
              className="btn-secondary"
              onClick={() => { setSelectionMode(true); setSelectedIds(new Set()); setDeleteFeedback(null); }}
              disabled={documents.length === 0}
            >
              Delete Documents
            </button>
          )}
          {selectionMode && (
            <>
              <button
                className="btn-primary"
                disabled={selectedIds.size === 0 || deleting}
                onClick={handleDeleteSelected}
              >
                {deleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}
              </button>
              <button
                className="btn-secondary"
                onClick={exitSelectionMode}
                disabled={deleting}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        {selectionMode && deleteFeedback && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {deleteFeedback.success.length > 0 && (
              <span style={{ color: 'var(--success-color, green)' }}>
                Deleted {deleteFeedback.success.length} ✔
              </span>
            )}
            {deleteFeedback.failed.length > 0 && (
              <span style={{ color: 'var(--error-color, #c00)', marginLeft: '1rem' }}>
                Failed {deleteFeedback.failed.length} (likely not owner)
              </span>
            )}
          </div>
        )}
        {filteredDocs.length === 0 ? (
          <div className="empty-state">
            No matching documents.
          </div>
        ) : (
          <div className="documents-list">
            {filteredDocs.map((doc) => (
              <div key={doc._id} className={`document-card ${selectionMode ? 'selectable' : ''}`} style={{ position: 'relative' }}>
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc._id)}
                    onChange={() => toggleSelect(doc._id)}
                    style={{ position: 'absolute', top: 8, left: 8 }}
                    aria-label={`Select ${doc.title || 'Untitled Document'}`}
                  />
                )}
                <Link
                  to={selectionMode ? '#' : `/documents/${doc._id}`}
                  className="document-link"
                  onClick={(e) => {
                    if (selectionMode) {
                      e.preventDefault();
                      toggleSelect(doc._id);
                    }
                  }}
                >
                  <div style={{ opacity: deleting && selectedIds.has(doc._id) ? 0.4 : 1 }}>
                    <h4>{doc.title || 'Untitled Document'}</h4>
                    <p className="doc-meta">ID: {doc._id.substring(0, 8)}...</p>
                    <p className="doc-submeta">Modified: {new Date(doc.lastModified || doc.createdAt).toLocaleDateString()}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
