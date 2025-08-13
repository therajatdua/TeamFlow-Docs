import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import 'quill/dist/quill.snow.css';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL;

Quill.register('modules/cursors', QuillCursors);

// Word-inspired Font Families (normalized to lowercase with dashes for Quill whitelist)
const FONT_FAMILIES = [
  'arial', 'calibri', 'times-new-roman', 'georgia', 'helvetica', 'verdana', 'tahoma', 'trebuchet-ms'
];

// Font Sizes (pt) – we add 'pt' when applying format
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

// Register font & size whitelists before editor instantiation
try {
  const Font = Quill.import('formats/font');
  Font.whitelist = FONT_FAMILIES;
  Quill.register(Font, true);
  const SizeStyle = Quill.import('attributors/style/size');
  SizeStyle.whitelist = FONT_SIZES.map(s => s + 'pt');
  Quill.register(SizeStyle, true);
} catch (e) {
  // ignore if already registered
}

// Page Layout Options
const PAGE_LAYOUTS = [
  { id: 'normal', name: 'Normal', width: '8.5in', margins: '1in' },
  { id: 'narrow', name: 'Narrow', width: '8.5in', margins: '0.5in' },
  { id: 'wide', name: 'Wide', width: '8.5in', margins: '2in' },
  { id: 'a4', name: 'A4', width: '210mm', margins: '25mm' }
];

const SAVE_INTERVAL_MS = 5000;

function TextEditor() {
  const { id: documentId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();
  const [saveStatus, setSaveStatus] = useState('saved');
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [collabMeta, setCollabMeta] = useState({}); // { [userId]: { joinedAt: number, inserts: number, deletes: number } }
  const [popoverUserId, setPopoverUserId] = useState(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareUsername, setShareUsername] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState('editor');
  const [canEdit, setCanEdit] = useState(true);
  const [shareRole, setShareRole] = useState('editor');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  
  // Word-inspired features
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [currentFont, setCurrentFont] = useState('calibri');
  const [currentFontSize, setCurrentFontSize] = useState('12pt');
  const [currentLayout, setCurrentLayout] = useState(PAGE_LAYOUTS[0]);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [showWordCountDialog, setShowWordCountDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [layoutPos, setLayoutPos] = useState({ top: 0, left: 0, minWidth: 180 });
  const [showGuides, setShowGuides] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  const wrapperRef = useRef();
  const pageRef = useRef(null);
  const stageRef = useRef(null);
  const layoutBtnRef = useRef(null);
  const titleDebounceRef = useRef(null);

  // Dark mode toggle
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => {
      const newMode = !prev;
      document.documentElement.setAttribute('data-theme', newMode ? 'dark' : 'light');
      localStorage.setItem('darkMode', newMode.toString());
      return newMode;
    });
  }, []);

  // Zoom utilities
  const clampZoom = useCallback((z) => Math.min(2, Math.max(0.5, Number(z))), []);

  const fitToWidth = useCallback(() => {
    const pageEl = pageRef.current;
    const stageEl = stageRef.current;
    if (!pageEl || !stageEl) return;
    const stageWidth = stageEl.clientWidth - 32; // padding allowance
    const rect = pageEl.getBoundingClientRect();
    const baseWidth = rect.width / (zoom || 1);
    if (baseWidth > 0) {
      const next = clampZoom(stageWidth / baseWidth);
      setZoom(+next.toFixed(2));
    }
  }, [zoom, clampZoom]);

  const fitToPage = useCallback(() => {
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const rect = pageEl.getBoundingClientRect();
    const baseHeight = rect.height / (zoom || 1);
    const viewport = window.innerHeight;
    const allowance = 260; // header + toolbar + padding
    if (baseHeight > 0) {
      const next = clampZoom((viewport - allowance) / baseHeight);
      setZoom(+next.toFixed(2));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [zoom, clampZoom]);

  const positionLayoutMenu = useCallback(() => {
    const btn = layoutBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const viewportPadding = 12;
    const desiredLeft = Math.min(
      rect.left,
      window.innerWidth - 260 - viewportPadding
    );
    setLayoutPos({
      top: rect.bottom + 8,
      left: Math.max(viewportPadding, desiredLeft),
      minWidth: Math.max(180, rect.width)
    });
  }, []);

  // Page break visualization
  const calcPageHeightPx = useCallback(() => {
    // Supports inches/mm for the three presets; fall back to element height
    const id = currentLayout.id;
    if (id === 'wide') return 8.5 * 96; // 8.5in landscape height
    if (id === 'a4') return 11.7 * 96; // approx height in inches
    return 11 * 96; // normal/narrow height
  }, [currentLayout.id]);

  const [pageCuts, setPageCuts] = useState([]);

  const computePageBreaks = useCallback(() => {
    const pageEl = pageRef.current;
    if (!pageEl) {
      setPageCount(1);
      setPageCuts([]);
      return;
    }
    const height = pageEl.scrollHeight / (zoom || 1);
    const pageH = calcPageHeightPx();
    const count = Math.max(1, Math.ceil(height / pageH));
    const cuts = [];
    for (let i = 1; i < count; i++) cuts.push({ top: i * pageH });
    setPageCount(count);
    setPageCuts(cuts);
  }, [zoom, calcPageHeightPx]);

  useEffect(() => {
    const onRecalc = () => computePageBreaks();
    const ro = new ResizeObserver(onRecalc);
    if (pageRef.current) ro.observe(pageRef.current);
    window.addEventListener('resize', onRecalc);
    onRecalc();
    return () => {
      window.removeEventListener('resize', onRecalc);
      ro.disconnect();
    };
  }, [computePageBreaks]);

  useEffect(() => {
    if (!showLayoutPanel) return;
    const onKey = (e) => { if (e.key === 'Escape') setShowLayoutPanel(false); };
    const onRecalc = () => positionLayoutMenu();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onRecalc);
    window.addEventListener('scroll', onRecalc, true);
    positionLayoutMenu();
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onRecalc);
      window.removeEventListener('scroll', onRecalc, true);
    };
  }, [showLayoutPanel, positionLayoutMenu]);

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => clampZoom(+(z + 0.1).toFixed(2)));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom((z) => clampZoom(+(z - 0.1).toFixed(2)));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clampZoom]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
    document.documentElement.setAttribute('data-theme', savedDarkMode ? 'dark' : 'light');
  }, []);

  // Notification system
  const showNotification = useCallback((message, type = 'info') => {
    // You can replace this with a proper toast notification library
    // For now, we'll use a simple alert for critical errors
    if (type === 'error') {
      alert(message);
    }
  }, []);

  // Word count functionality
  const updateWordCount = useCallback((text) => {
    const plainText = text.replace(/<[^>]*>/g, '').trim();
    const words = plainText ? plainText.split(/\s+/).length : 0;
    const characters = plainText.length;
    const pages = Math.max(1, Math.ceil(characters / 2000));
    
    setWordCount(words);
    setCharacterCount(characters);
    setPageCount(pages);
  }, []);

  // Document access check
  const checkDocumentAccess = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/access`, {
        headers: { 'x-auth-token': token }
      });

      if (response.ok) {
        const data = await response.json();
        setIsOwner(!!data.isOwner);
        setDocumentTitle(data.title || 'Untitled Document');
        const incomingRole = data.role || (data.isOwner ? 'owner' : 'editor');
        setRole(incomingRole);
        const editable = data.isOwner || incomingRole === 'editor';
        setCanEdit(editable);
        if (quill) {
          if (editable) {
            quill.enable();
          } else {
            quill.disable();
            showNotification('View-only mode', 'info');
          }
        }
      } else {
        alert('Access denied.');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error checking document access:', error);
      alert('Failed to verify access.');
      navigate('/dashboard');
    }
  }, [documentId, quill, navigate, showNotification]);

  // Socket connection and document management
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
  navigate('/register');
      return;
    }

    const s = io(SOCKET_URL);
    setSocket(s);

    s.emit('authenticate', token);
    
    s.on('authentication-success', () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentUser({ id: payload.userId, username: payload.username || 'User' });
        } catch (error) {
          console.error('Error parsing token:', error);
        }
      }
    });
    
    s.on('authentication-failed', () => {
      localStorage.removeItem('token');
  navigate('/register');
    });

    s.on('users-update', (users) => {
      setActiveUsers(users);
      // Ensure meta exists for each collaborator
      setCollabMeta((prev) => {
        const next = { ...prev };
        users.forEach((u) => {
          if (!next[u.id]) next[u.id] = { joinedAt: Date.now(), inserts: 0, deletes: 0, username: u.username };
          else if (!next[u.id].username) next[u.id].username = u.username;
        });
        return next;
      });
    });

    s.on('user-joined', (user) => {
      if (user.id !== currentUser?.id) {
        showNotification(`${user.username} joined the document`, 'info');
      }
      // Track joined time
      setCollabMeta((prev) => ({
        ...prev,
        [user.id]: { joinedAt: Date.now(), inserts: 0, deletes: 0, username: user.username },
      }));
    });

    s.on('user-left', (user) => {
      if (user.id !== currentUser?.id) {
        showNotification(`${user.username} left the document`, 'info');
      }
      // Keep their stats but could remove if desired
    });

    return () => {
      s.disconnect();
    };
  }, [navigate, currentUser?.id, showNotification]);

  // Document loading

  useEffect(() => {
    if (socket == null || quill == null) return;
    setLoading(true);
    setLoadError(null);
    let didLoad = false;
  // removed unused variable 'authenticated'

    const handleLoad = (document) => {
      didLoad = true;
      quill.setContents(document || {});
      setSaveStatus('saved');
      setLoading(false);
      checkDocumentAccess();
    };
    const handleLoadError = (err) => {
      setLoading(false);
      setLoadError(err?.message || 'Failed to load document.');
    };
    const handleAccessDenied = (err) => {
      setLoading(false);
      setLoadError(err?.message || 'Access denied.');
    };
    const handleAuthSuccess = () => {
      socket.emit('get-document', documentId);
    };

    const handleTimeout = setTimeout(() => {
      if (!didLoad) {
        setLoading(false);
        setLoadError('Failed to load document. Please check your connection and try again.');
      }
    }, 7000); // 7 seconds

    socket.once('load-document', handleLoad);
    socket.once('load-error', handleLoadError);
    socket.once('access-denied', handleAccessDenied);
    socket.once('authentication-success', handleAuthSuccess);

    // If already authenticated (e.g. hot reload), try to get document
    if (socket.authenticated) {
      handleAuthSuccess();
    }

    return () => {
      clearTimeout(handleTimeout);
      socket.off('load-document', handleLoad);
      socket.off('load-error', handleLoadError);
      socket.off('access-denied', handleAccessDenied);
      socket.off('authentication-success', handleAuthSuccess);
    };
  }, [socket, quill, documentId, checkDocumentAccess]);

  // (moved checkDocumentAccess above for eslint)

  // Initialize Quill editor
  useEffect(() => {
    if (!wrapperRef.current) return;

    const q = new Quill(wrapperRef.current, {
      theme: 'snow',
      modules: {
        cursors: true,
        toolbar: false // We use our custom toolbar; hide Quill's default
      }
    });

    q.disable();
    q.setText('Loading...');
    setQuill(q);

    // Track content changes for word count
    q.on('text-change', (delta, oldDelta, source) => {
      if (source === 'user') {
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
        const html = q.root.innerHTML;
        updateWordCount(html);
      }
    });

    return () => {
      if (q) {
        q.off('text-change');
      }
    };
  }, [updateWordCount]);

  // Text change handlers for collaboration
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== 'user') return;
      setHasUnsavedChanges(true);
      setSaveStatus('unsaved');
      socket.emit('send-changes', delta);
    };

    quill.on('text-change', handler);

    return () => {
      quill.off('text-change', handler);
    };
  }, [socket, quill]);

  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta) => {
      quill.updateContents(delta);
      // Attribute contributions when exactly one collaborator is active
      const others = (activeUsers || []).filter(u => u.id !== currentUser?.id);
      if (others.length === 1) {
        const only = others[0];
        let ins = 0; let del = 0;
        if (delta && Array.isArray(delta.ops)) {
          delta.ops.forEach(op => {
            if (typeof op.insert === 'string') ins += op.insert.length;
            if (typeof op.delete === 'number') del += op.delete;
          });
        }
        if (ins || del) {
          setCollabMeta(prev => ({
            ...prev,
            [only.id]: {
              ...(prev[only.id] || { joinedAt: Date.now(), inserts: 0, deletes: 0, username: only.username }),
              inserts: (prev[only.id]?.inserts || 0) + ins,
              deletes: (prev[only.id]?.deletes || 0) + del,
              username: only.username,
            }
          }));
        }
      }
    };

    socket.on('receive-changes', handler);

    return () => {
      socket.off('receive-changes', handler);
    };
  }, [socket, quill, activeUsers, currentUser?.id]);

  // Auto-save functionality
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      if (hasUnsavedChanges && saveStatus !== 'saving') {
        setSaveStatus('saving');
        socket.emit('save-document', quill.getContents());
        setHasUnsavedChanges(false);
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill, hasUnsavedChanges, saveStatus]);

  // Handle save responses
  useEffect(() => {
    if (socket == null) return;

    const handleSaveSuccess = () => {
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    };

    const handleSaveError = (error) => {
      setSaveStatus('error');
      setHasUnsavedChanges(true);
      console.error('Save error:', error);
    };

    socket.on('save-success', handleSaveSuccess);
    socket.on('save-error', handleSaveError);

    return () => {
      socket.off('save-success', handleSaveSuccess);
      socket.off('save-error', handleSaveError);
    };
  }, [socket]);

  // Listen for external title updates
  useEffect(() => {
    if (!socket) return;
    const handler = (newTitle) => {
      if (typeof newTitle === 'string' && newTitle.trim()) setDocumentTitle(newTitle);
    };
    socket.on('title-updated', handler);
    return () => socket.off('title-updated', handler);
  }, [socket]);

  // Title change handler
  const handleTitleChange = useCallback((newTitle) => {
    setDocumentTitle(newTitle);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      if (socket && (isOwner || role === 'editor')) {
        socket.emit('update-title', newTitle);
      }
    }, 700);
  }, [socket, isOwner, role]);

  // Manual save
  const handleManualSave = useCallback(() => {
    if (socket && quill && hasUnsavedChanges) {
      setSaveStatus('saving');
      socket.emit('save-document', quill.getContents());
      setHasUnsavedChanges(false);
    }
  }, [socket, quill, hasUnsavedChanges]);

  // Presence helpers
  const collaborators = activeUsers.filter(u => u.id !== currentUser?.id);
  const formatTimeAgo = (ts) => {
    if (!ts) return '—';
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const openUserPopover = (userId, el) => {
    const rect = el.getBoundingClientRect();
    setPopoverPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 260) });
    setPopoverUserId(userId);
  };

  // Format functions
  const applyFormat = useCallback((format, value = true) => {
    if (!quill || !canEdit) return;
    quill.format(format, value);
  }, [quill, canEdit]);

  const applyAlignment = useCallback((alignment) => {
    if (!quill || !canEdit) return;
    quill.format('align', alignment);
  }, [quill, canEdit]);

  // Document sharing
  const shareDocument = async () => {
    if (!shareUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-auth-token': token 
        },
        body: JSON.stringify({ 
          username: shareUsername.trim(),
          role: shareRole 
        }),
      });

      if (response.ok) {
        alert(`Document shared with ${shareUsername} as ${shareRole}`);
        setShowShareDialog(false);
        setShareUsername('');
        setShareRole('editor');
      } else {
        const errorData = await response.text();
        alert(`Failed to share document: ${errorData}`);
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      alert('An error occurred while sharing the document');
    }
  };

  const getSaveStatusColor = () => {
    switch (saveStatus) {
      case 'saving': return '#ffc107';
      case 'saved': return '#28a745';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving…';
      case 'saved': return 'All changes saved';
      case 'error': return 'Error saving';
      case 'unsaved': return 'Unsaved changes';
      default: return '';
    }
  };

  return (
    <div className={`text-editor-container ${focusMode ? 'focus-mode' : ''}`} data-theme={darkMode ? 'dark' : 'light'}>
      {/* Loading/Error Overlay */}
      {loading && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(255,255,255,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <div className="spinner" style={{marginBottom:16}}></div>
          <div style={{fontSize:20}}>Loading document…</div>
        </div>
      )}
      {loadError && !loading && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(255,255,255,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <div style={{color:'#c00',fontSize:20,marginBottom:12}}>{loadError}</div>
          <button onClick={()=>window.location.reload()} style={{padding:'8px 24px',fontSize:16}}>Retry</button>
        </div>
      )}
      {/* Header Section */}
      <div className="editor-header">
        <div className="header-left">
          <button 
            className="back-button"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            ← Back
          </button>
          
          <input
            type="text"
            className="document-title-input"
            value={documentTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={!canEdit}
            placeholder="Untitled Document"
            title={canEdit ? 'Rename document' : 'Read-only'}
          />
        </div>

        <div className="header-center">
          <div className="save-status" style={{ color: getSaveStatusColor() }}>
            {getSaveStatusText()}
          </div>
        </div>

        <div className="header-right">
          {!!collaborators.length && (
            <div className="active-users" title="Active collaborators">
              {collaborators.map(user => (
                <button
                  key={user.id}
                  className="user-avatar"
                  title={user.username}
                  onClick={(e) => openUserPopover(user.id, e.currentTarget)}
                >
                  {user.username?.charAt(0).toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <button 
            className="theme-toggle"
            onClick={toggleDarkMode}
            title={darkMode ? 'Light Mode' : 'Dark Mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button 
            className="share-button"
            onClick={() => setShowShareDialog(true)}
            disabled={!isOwner}
          >
            Share
          </button>

          <button 
            className="save-button"
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges || !canEdit}
          >
            Save
          </button>
        </div>
      </div>

      {/* Simplified Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <label className="toolbar-label">Font</label>
          <div className="toolbar-controls">
            <select 
              className="font-family-select"
              value={currentFont}
              onChange={(e) => {
                const value = e.target.value;
                setCurrentFont(value);
                applyFormat('font', value);
              }}
              disabled={!canEdit}
            >
              {FONT_FAMILIES.map(font => {
                const label = font.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                return <option key={font} value={font}>{label}</option>;
              })}
            </select>

            <select 
              className="font-size-select"
              value={currentFontSize}
              onChange={(e) => {
                const val = e.target.value.endsWith('pt') ? e.target.value : e.target.value + 'pt';
                setCurrentFontSize(val);
                applyFormat('size', val);
              }}
              disabled={!canEdit}
            >
              {FONT_SIZES.map(size => (
                <option key={size} value={size + 'pt'}>{size}pt</option>
              ))}
            </select>
          </div>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <label className="toolbar-label">Format</label>
          <div className="toolbar-controls">
            <button 
              className="format-btn bold-btn"
              onClick={() => applyFormat('bold')} 
              disabled={!canEdit}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button 
              className="format-btn italic-btn"
              onClick={() => applyFormat('italic')} 
              disabled={!canEdit}
              title="Italic"
            >
              <em>I</em>
            </button>
            <button 
              className="format-btn underline-btn"
              onClick={() => applyFormat('underline')} 
              disabled={!canEdit}
              title="Underline"
            >
              <span style={{textDecoration: 'underline'}}>U</span>
            </button>
          </div>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <label className="toolbar-label">Align</label>
          <div className="toolbar-controls">
            <button 
              className="format-btn align-btn"
              onClick={() => applyAlignment('')} 
              disabled={!canEdit}
              title="Align Left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm0 6h12v2H3V9zm0 6h18v2H3v-2zm0 6h12v2H3v-2z"/>
              </svg>
            </button>
            <button 
              className="format-btn align-btn"
              onClick={() => applyAlignment('center')} 
              disabled={!canEdit}
              title="Center"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm3 6h12v2H6V9zm-3 6h18v2H3v-2zm3 6h12v2H6v-2z"/>
              </svg>
            </button>
            <button 
              className="format-btn align-btn"
              onClick={() => applyAlignment('right')} 
              disabled={!canEdit}
              title="Align Right"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm6 6h12v2H9V9zm-6 6h18v2H3v-2zm6 6h12v2H9v-2z"/>
              </svg>
            </button>
            <button 
              className="format-btn align-btn"
              onClick={() => applyAlignment('justify')} 
              disabled={!canEdit}
              title="Justify"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18v2H3V3zm0 6h18v2H3V9zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <label className="toolbar-label">Lists</label>
          <div className="toolbar-controls">
            <button 
              className="format-btn list-btn"
              onClick={() => applyFormat('list', 'bullet')} 
              disabled={!canEdit}
              title="Bullet List"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="4" cy="6" r="2"/>
                <circle cx="4" cy="12" r="2"/>
                <circle cx="4" cy="18" r="2"/>
                <path d="M9 5h12v2H9V5zm0 6h12v2H9v-2zm0 6h12v2H9v-2z"/>
              </svg>
            </button>
            <button 
              className="format-btn list-btn"
              onClick={() => applyFormat('list', 'ordered')} 
              disabled={!canEdit}
              title="Numbered List"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 4h2v1H3v1h1v1H2V6h1V5H2V4zm0 4h1.5L2 9.5V10h2V9H3l1.5-1.5V7H2v1zm0 4h1v1H2v1h2v-1H3v-1h1v-1H2v1zm7-7h12v2H9V5zm0 6h12v2H9v-2zm0 6h12v2H9v-2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="toolbar-separator"></div>

        <div className="toolbar-group">
          <label className="toolbar-label">Tools</label>
          <div className="toolbar-controls">
            <div className="layout-dropdown">
              <button 
                className="format-btn layout-btn"
                ref={layoutBtnRef}
                onClick={() => {
                  if (showLayoutPanel) setShowLayoutPanel(false);
                  else { positionLayoutMenu(); setShowLayoutPanel(true); }
                }}
                title="Page Layout"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                  <path d="M7 7h10v2H7zm0 4h10v2H7zm0 4h10v2H7z"/>
                </svg>
                Layout
              </button>
              {/* Layout menu is now portaled to body; see below */}
            </div>
            <button 
              className="format-btn stats-btn"
              onClick={() => setShowWordCountDialog(true)}
              title="Document Statistics"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3v18h18V3H3zm16 16H5V5h14v14z"/>
                <path d="M7 12h2v5H7zm4-6h2v11h-2zm4 3h2v8h-2z"/>
              </svg>
              Stats
            </button>
            {/* Zoom Controls */}
            <div className="zoom-controls" title="Zoom">
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                aria-label="Zoom out"
              >−</button>
              <span className="zoom-level">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                className="zoom-btn"
                onClick={() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2)))}
                aria-label="Zoom in"
              >+</button>
              <button
                type="button"
                className="zoom-btn fit-btn"
                onClick={fitToWidth}
                aria-label="Fit to width"
              >Fit</button>
              <button
                type="button"
                className="zoom-btn page-btn"
                onClick={fitToPage}
                aria-label="Fit to page"
              >Page</button>
            </div>

            {/* Tools: Guides & Focus */}
            <div className="tools-inline">
              <button
                type="button"
                className={`format-btn ${showGuides ? 'active' : ''}`}
                onClick={() => setShowGuides(v => !v)}
                title="Toggle rulers and margin guides"
              >Guides</button>
              <button
                type="button"
                className={`format-btn ${focusMode ? 'active' : ''}`}
                onClick={() => setFocusMode(v => !v)}
                title="Toggle focus mode"
              >Focus</button>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <div className="editor-wrapper">
        <div className="editor-content">
          <div className="page-stage" ref={stageRef}>
      <div
              className={`page-layout ${currentLayout.id}`}
              style={{
                // Provide page sizing, content margins, and zoom via CSS custom properties
        '--page-width': currentLayout.width,
        '--page-margin': currentLayout.margins,
        '--page-zoom': zoom,
              }}
              ref={pageRef}
            >
              {showGuides && (
                <>
                  <div className="ruler-horizontal" aria-hidden="true" />
                  <div className="ruler-vertical" aria-hidden="true" />
                  <div className="margin-guide top" aria-hidden="true" />
                  <div className="margin-guide right" aria-hidden="true" />
                  <div className="margin-guide bottom" aria-hidden="true" />
                  <div className="margin-guide left" aria-hidden="true" />
                </>
              )}
              {/* Page breaks */}
              {pageCuts.map((cut, idx) => (
                <div key={idx} className="page-break" style={{ top: cut.top }} aria-hidden="true" />
              ))}
              <div ref={wrapperRef} className="quill-editor"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-left">
          <span>Page {pageCount}</span>
          <span>{wordCount} words</span>
          <span>{characterCount} characters</span>
        </div>
        
        <div className="status-right">
          <span>{role === 'viewer' ? 'View Only' : 'Editing'}</span>
          <span>Layout: {currentLayout.name}</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <div className="modal-overlay" onClick={() => setShowShareDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share Document</h3>
            <div className="form-group">
              <label>Username:</label>
              <input
                type="text"
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
                placeholder="Enter username"
                onKeyPress={(e) => e.key === 'Enter' && shareDocument()}
              />
            </div>
            <div className="form-group">
              <label>Role:</label>
              <select value={shareRole} onChange={(e) => setShareRole(e.target.value)}>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={shareDocument} className="btn-primary">Share</button>
              <button onClick={() => setShowShareDialog(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Portaled Layout Menu */}
      {showLayoutPanel && ReactDOM.createPortal(
        <div className="dropdown-overlay" onClick={() => setShowLayoutPanel(false)}>
          <div
            className="layout-dropdown-menu"
            style={{ position: 'fixed', top: layoutPos.top, left: layoutPos.left, minWidth: layoutPos.minWidth, zIndex: 1001 }}
            onClick={(e) => e.stopPropagation()}
          >
            {PAGE_LAYOUTS.map(layout => (
              <button
                key={layout.id}
                className={`layout-option ${currentLayout.id === layout.id ? 'active' : ''}`}
                onClick={() => { setCurrentLayout(layout); setShowLayoutPanel(false); }}
              >
                <div className="layout-preview"><div className="layout-icon"></div></div>
                <span>{layout.name}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Word Count Dialog */}
      {showWordCountDialog && (
        <div className="modal-overlay" onClick={() => setShowWordCountDialog(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Document Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <label>Words:</label>
                <span>{wordCount.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <label>Characters (with spaces):</label>
                <span>{characterCount.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <label>Characters (no spaces):</label>
                <span>{(characterCount - Math.max(0, wordCount - 1)).toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <label>Estimated Pages:</label>
                <span>{pageCount}</span>
              </div>
              <div className="stat-item">
                <label>Reading Time:</label>
                <span>{Math.ceil(wordCount / 200)} min</span>
              </div>
              <div className="stat-item">
                <label>Current Layout:</label>
                <span>{currentLayout.name}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowWordCountDialog(false)} className="btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Collaborator Popover */}
      {popoverUserId && ReactDOM.createPortal(
        <div className="collab-overlay" onClick={() => setPopoverUserId(null)}>
          <div
            className="collab-popover"
            style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, zIndex: 10001 }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const meta = collabMeta[popoverUserId] || {};
              const name = meta.username || collaborators.find(c => c.id === popoverUserId)?.username || 'User';
              return (
                <>
                  <div className="collab-popover__title">{name}</div>
                  <div className="collab-popover__row"><span>Joined:</span><strong>{formatTimeAgo(meta.joinedAt)}</strong></div>
                  <div className="collab-popover__row"><span>Added:</span><strong>{(meta.inserts || 0).toLocaleString()} chars</strong></div>
                  <div className="collab-popover__row"><span>Deleted:</span><strong>{(meta.deletes || 0).toLocaleString()} chars</strong></div>
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default TextEditor;
