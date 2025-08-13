
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
	const navigate = useNavigate();

	useEffect(() => {
		const handleScroll = () => {
			if (window.scrollY > 100) {
				navigate('/register');
			}
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, [navigate]);

		const handleTryTeamFlow = () => {
			navigate('/register');
		};

		return (
			<div className="landing-root">
				<header className="landing-header">
					<h1 className="landing-title">TeamFlow Docs</h1>
					<p className="landing-subtitle">Collaborate. Create. Organize. All in real time.</p>
					<button className="landing-cta" onClick={handleTryTeamFlow}>Try TeamFlow</button>
				</header>
				<section className="landing-hero">
					<img src="/logo512.png" alt="TeamFlow Docs Logo" className="landing-logo" />
					<div className="landing-features">
						<div className="feature-card">
							<h3>Real-time Collaboration</h3>
							<p>Edit documents with your team, live and instantly.</p>
						</div>
						<div className="feature-card">
							<h3>Secure & Reliable</h3>
							<p>Your docs are safe, encrypted, and always available.</p>
						</div>
						<div className="feature-card">
							<h3>Organize Effortlessly</h3>
							<p>Folders, tags, and search to keep your work tidy.</p>
						</div>
					</div>
				</section>
				<footer className="landing-footer">
					<span>© {new Date().getFullYear()} TeamFlow Docs</span>
				</footer>
			</div>
		);
}

export default Landing;
