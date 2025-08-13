import React from 'react';

function AuthLayout({ brand = 'TeamFlow Docs', heroTitle, heroSub, points = [], heroArtSrc, showHeroArt = false, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="auth-brand">{brand}</div>
        {heroTitle && <h1 className="auth-hero-title">{heroTitle}</h1>}
        {heroSub && <p className="auth-hero-sub">{heroSub}</p>}
        {points.length > 0 && (
          <ul className="auth-hero-points">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {showHeroArt && heroArtSrc && (
          <img
            className="auth-hero-art"
            src={heroArtSrc}
            alt="Decorative"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
      </div>

      <div className="auth-panel">{children}</div>
    </div>
  );
}

export default AuthLayout;
