import React, { useEffect, useMemo, useRef, useState } from 'react';
import getFirebaseAuth from '../lib/firebase';
import { useLocation, useNavigate } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5001');

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const onEditorPage = useMemo(() => /\/documents\//.test(location.pathname), [location.pathname]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchTimerRef = useRef(null);
  const [showProfile, setShowProfile] = useState(false);
  const [user, setUser] = useState({ username: 'User', userId: '' });
  const [darkMode, setDarkMode] = useState(false);
  const menuRef = useRef(null);

  const handleLogoClick = () => navigate('/dashboard');
  const handleLogout = async () => {
    localStorage.removeItem('token');
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await auth.signOut();
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Firebase sign out failed:', e?.message || e);
    }
    navigate('/register'); 
  };

  const handleNewDoc = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ title: 'Untitled Document' })
      });
      const data = await res.json();
      const id = data?.id || data?.document?._id || data?._id;
      if (id) navigate(`/documents/${id}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to create document', e);
      alert('Failed to create document');
    }
  };

  const handleEditorBrandClick = () => {
    // Ask the editor to save and then navigate to dashboard
    window.dispatchEvent(new CustomEvent('teamflow:save-and-exit'));
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchText(value);
    // Debounce to avoid chattiness
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      // Emit an app-wide search event
      window.dispatchEvent(new CustomEvent('teamflow:search', { detail: { q: value } }));
      // Ensure we are on dashboard, include query param
      const params = new URLSearchParams(window.location.search);
      if (value) params.set('q', value); else params.delete('q');
      const search = params.toString();
      const to = `/dashboard${search ? `?${search}` : ''}`;
      if (location.pathname !== '/dashboard') navigate(to);
      else window.history.replaceState(null, '', to);
    }, 200);
  };

  // Derive user from token
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        // Support local JWT (userId, username) and Firebase ID tokens (user_id/sub, email)
        const userId = payload.userId || payload.user_id || payload.sub || '';
        const username = payload.username || payload.email || 'User';
        setUser({ username, userId });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Initialize dark mode state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDarkMode(saved);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };

  // Close the profile menu on click outside or Escape
  useEffect(() => {
    const onClickOutside = (e) => {
      if (!menuOpen) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <>
    <header className={`tf-header ${onEditorPage ? 'tf-header--editor' : ''}`}>
      <div className="tf-header__left tf-header__col" onClick={onEditorPage ? undefined : handleLogoClick} role="button" tabIndex={0} onKeyDown={(e) => !onEditorPage && e.key === 'Enter' && handleLogoClick()}>
        {!onEditorPage && (
          <>
            <img src="/teamflow-logo.svg" alt="TeamFlow" className="tf-header__logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="tf-header__brand">TeamFlow Docs</span>
          </>
        )}
      </div>

      <div className="tf-header__center tf-header__col">
        {onEditorPage ? (
          <button className="tf-header__brand-center" onClick={handleEditorBrandClick} title="Save and go to dashboard">TeamFlow Docs</button>
        ) : (
          <div className="tf-header__search" title="Search coming soon">
            <span className="tf-header__search-icon">🔎</span>
            <input
              placeholder="Search documents"
              value={searchText}
              onChange={handleSearchChange}
              aria-label="Search documents"
            />
          </div>
        )}
      </div>

      <div className="tf-header__right tf-header__col" style={{ justifyContent: 'flex-end' }}>
        {!onEditorPage && (
          <button className="tf-btn tf-btn--primary" onClick={handleNewDoc}>
            + New
          </button>
        )}
        <div
          className="tf-header__menu"
          ref={menuRef}
        >
          <button className="tf-avatar" onClick={() => setMenuOpen(v => !v)} aria-haspopup="menu" aria-expanded={menuOpen}>
            <span>{(user.username || 'U').charAt(0).toUpperCase()}</span>
          </button>
          {menuOpen && (
            <div className="tf-menu" role="menu" onMouseLeave={() => setMenuOpen(false)}>
              <button role="menuitem" onClick={() => { setShowProfile(true); setMenuOpen(false); }}>Profile</button>
              <button role="menuitem" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button role="menuitem" onClick={handleNewDoc}>New document</button>
              <hr />
              <button role="menuitem" onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </div>
  </header>
  {showProfile && (
      <div className="modal-overlay" onClick={() => setShowProfile(false)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h3>My Profile</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div className="profile-avatar">{(user.username || 'U').charAt(0).toUpperCase()}</div>
            <div className="profile-meta">
              <div style={{ fontWeight: 700 }}>{user.username}</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>ID: {user.userId || '—'}</div>
            </div>
          </div>

          <div className="form-group">
            <label>Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" onClick={toggleDarkMode}>
                {darkMode ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setShowProfile(false)}>Close</button>
            <button className="btn-primary" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Header;
