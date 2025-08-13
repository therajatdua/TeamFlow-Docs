import React from 'react';

const InfoModals = ({ 
  showAboutUs, 
  setShowAboutUs, 
  showFeatures, 
  setShowFeatures, 
  showAboutSite, 
  setShowAboutSite 
}) => {

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000,
        padding: '20px'
      }} onClick={onClose}>
        <div style={{
          background: 'var(--tf-surface-elevated)',
          borderRadius: 20,
          maxWidth: '800px',
          maxHeight: '90vh',
          width: '100%',
          overflowY: 'auto',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            position: 'sticky',
            top: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '20px 30px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--tf-text)',
              fontFamily: "'Space Grotesk', sans-serif"
            }}>{title}</h2>
            <button onClick={onClose} style={{
              background: 'none',
              border: 'none',
              fontSize: 24,
              cursor: 'pointer',
              padding: '5px',
              borderRadius: '50%',
              color: '#666',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>×</button>
          </div>
          <div style={{ padding: '30px' }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* About Us Modal */}
      <Modal isOpen={showAboutUs} onClose={() => setShowAboutUs(false)} title="About Us">
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'var(--tf-gradient-primary)',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 32,
            fontWeight: 700,
            color: 'white',
            boxShadow: 'var(--tf-shadow-elevated)'
          }}>
            TF
          </div>
          <h3 style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 16,
            color: 'var(--tf-text)',
            fontFamily: "'Space Grotesk', sans-serif"
          }}>TeamFlow Docs</h3>
          <p style={{
            fontSize: 18,
            color: 'var(--tf-text-secondary)',
            lineHeight: 1.6,
            maxWidth: 500,
            margin: '0 auto'
          }}>
            We're passionate about revolutionizing collaborative document editing. Our team has created a next-generation platform that combines cutting-edge technology with intuitive design to deliver the ultimate collaborative experience.
          </p>
        </div>

        <div className="glass-card" style={{ padding: 30, marginBottom: 20 }}>
          <h4 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: 'var(--tf-text)' }}>Our Mission</h4>
          <p style={{ fontSize: 16, color: 'var(--tf-text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
            To empower teams worldwide with innovative collaboration tools that make document creation and editing seamless, intelligent, and enjoyable.
          </p>
          
          <h4 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: 'var(--tf-text)' }}>Our Vision</h4>
          <p style={{ fontSize: 16, color: 'var(--tf-text-secondary)', lineHeight: 1.6 }}>
            To become the world's leading platform for collaborative document editing, setting new standards for real-time collaboration, AI-powered assistance, and user experience.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
            <h5 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--tf-text)' }}>Innovation</h5>
            <p style={{ fontSize: 14, color: 'var(--tf-text-secondary)' }}>Pushing boundaries with cutting-edge features</p>
          </div>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤝</div>
            <h5 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--tf-text)' }}>Collaboration</h5>
            <p style={{ fontSize: 14, color: 'var(--tf-text-secondary)' }}>Bringing teams together seamlessly</p>
          </div>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
            <h5 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--tf-text)' }}>Performance</h5>
            <p style={{ fontSize: 14, color: 'var(--tf-text-secondary)' }}>Lightning-fast and reliable</p>
          </div>
        </div>
      </Modal>

      {/* Features Modal */}
      <Modal isOpen={showFeatures} onClose={() => setShowFeatures(false)} title="🚀 Innovative Features">
        <div style={{ marginBottom: 30 }}>
          <p style={{
            fontSize: 18,
            color: 'var(--tf-text-secondary)',
            textAlign: 'center',
            lineHeight: 1.6
          }}>
            Experience the next generation of collaborative editing with our proprietary AI-powered features and revolutionary design innovations
          </p>
        </div>

        {/* Advanced Collaboration */}
        <div className="glass-card feature-category" style={{ padding: 30, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              fontSize: 18
            }}>📝</div>
            <h3 style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--tf-text)',
              fontFamily: "'Space Grotesk', sans-serif",
              margin: 0
            }}>Advanced Collaboration</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#4285f4' }}>👤 @ Mentions System</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Tag team members with intelligent dropdown suggestions</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#34a853' }}>🤝 Real-time Collaboration</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Multiple users editing with live cursors</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#ea4335' }}>💡 Smart Suggestions</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Context-aware content recommendations</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#fbbc04' }}>🕰️ Version History</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Complete revision tracking</p>
            </div>
          </div>
        </div>

        {/* Smart Intelligence */}
        <div className="glass-card feature-category" style={{ padding: 30, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              fontSize: 18
            }}>🧠</div>
            <h3 style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--tf-text)',
              fontFamily: "'Space Grotesk', sans-serif",
              margin: 0
            }}>Smart Intelligence</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#007aff' }}>🧮 Math Calculations</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Automatic calculation detection</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#5856d6' }}>📝 Smart Templates</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Pre-built professional templates</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#ff9500' }}>📊 Activity Tracking</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Comprehensive activity feed</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#34c759' }}>🔍 Content Recognition</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Intelligent pattern detection</p>
            </div>
          </div>
        </div>

        {/* Modern Interface */}
        <div className="glass-card feature-category" style={{ padding: 30, borderRadius: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1f8fff 0%, #667eea 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              fontSize: 18
            }}>⚡</div>
            <h3 style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--tf-text)',
              fontFamily: "'Space Grotesk', sans-serif",
              margin: 0
            }}>Modern Interface</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#1f8fff' }}>📚 Template Library</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Professional templates</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#667eea' }}>🎨 Enhanced Toolbar</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Modern button layout</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#764ba2' }}>📊 Activity Sidebar</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Real-time activity tracking</p>
            </div>
            <div className="feature-item" style={{ padding: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#f093fb' }}>🔔 Smart Notifications</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4, margin: 0 }}>Beautiful toast notifications</p>
            </div>
          </div>
        </div>

        {/* Professional Templates */}
        <div className="glass-card" style={{ padding: 30, borderRadius: 16 }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--tf-text)',
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 20,
            textAlign: 'center'
          }}>📝 Professional Templates</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            {[
              { icon: '📝', name: 'Meeting Notes', desc: 'Structured meetings' },
              { icon: '🎯', name: 'Project Brief', desc: 'Project planning' },
              { icon: '💡', name: 'Brainstorming', desc: 'Creative sessions' },
              { icon: '📊', name: 'Standup Notes', desc: 'Team sync' },
              { icon: '🔍', name: 'Code Review', desc: 'Technical review' }
            ].map((template) => (
              <div key={template.name} style={{
                padding: 16,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 12,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{template.icon}</div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--tf-text)' }}>{template.name}</h4>
                <p style={{ fontSize: 12, color: 'var(--tf-text-secondary)', lineHeight: 1.3, margin: 0 }}>{template.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* About Site Modal */}
      <Modal isOpen={showAboutSite} onClose={() => setShowAboutSite(false)} title="About TeamFlow Docs">
        <div style={{ marginBottom: 30 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              background: 'var(--tf-gradient-primary)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: 'white'
            }}>📝</div>
            <p style={{
              fontSize: 18,
              color: 'var(--tf-text-secondary)',
              lineHeight: 1.6
            }}>
              TeamFlow Docs is a revolutionary collaborative document editing platform built with modern web technologies and innovative design principles.
            </p>
          </div>
        </div>

        {/* Technical Excellence */}
        <div className="glass-card" style={{ padding: 30, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--tf-text)',
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 20,
            textAlign: 'center'
          }}>⚡ Technical Excellence</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            <div className="tech-badge" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🚀</div>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text)' }}>Real-time Performance</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4 }}>Socket.io powered live collaboration</p>
            </div>
            <div className="tech-badge" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🎨</div>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text)' }}>Modern Design</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4 }}>Glass morphism with advanced animations</p>
            </div>
            <div className="tech-badge" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🔒</div>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text)' }}>Enterprise Security</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4 }}>JWT authentication and permissions</p>
            </div>
            <div className="tech-badge" style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>📱</div>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, color: 'var(--tf-text)' }}>Responsive Design</h4>
              <p style={{ fontSize: 13, color: 'var(--tf-text-secondary)', lineHeight: 1.4 }}>Optimized for all devices</p>
            </div>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="glass-card" style={{ padding: 30, borderRadius: 16 }}>
          <h3 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--tf-text)',
            fontFamily: "'Space Grotesk', sans-serif",
            marginBottom: 20,
            textAlign: 'center'
          }}>🛠️ Technology Stack</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
            {[
              { name: 'React', icon: '⚛️', desc: 'Frontend framework' },
              { name: 'Node.js', icon: '🟢', desc: 'Backend runtime' },
              { name: 'Socket.io', icon: '🔌', desc: 'Real-time communication' },
              { name: 'MongoDB', icon: '🍃', desc: 'Database' },
              { name: 'JWT', icon: '🔐', desc: 'Authentication' },
              { name: 'Quill.js', icon: '📝', desc: 'Rich text editor' }
            ].map((tech) => (
              <div key={tech.name} style={{
                padding: 12,
                background: 'rgba(255,255,255,0.6)',
                borderRadius: 10,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.3)'
              }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{tech.icon}</div>
                <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--tf-text)' }}>{tech.name}</h5>
                <p style={{ fontSize: 11, color: 'var(--tf-text-secondary)', margin: 0 }}>{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default InfoModals;
