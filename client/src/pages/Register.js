
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth, getGoogleProvider } from '../lib/firebase';
import './Register.css';

function Register() {
		const [error, setError] = useState('');
		const [loading, setLoading] = useState(false);
		const navigate = useNavigate();

	const handleGoogleRegister = async () => {
		setError('');
		setLoading(true);
		try {
			const auth = getFirebaseAuth();
			const provider = getGoogleProvider();
			if (auth && provider) {
				const result = await auth.signInWithPopup(provider);
				const idToken = await result.user.getIdToken();
				localStorage.setItem('token', idToken);
				localStorage.setItem('authProvider', 'google');
				navigate('/dashboard');
			} else {
				setError('Google login not available.');
			}
		} catch (err) {
			setError('Google registration failed.');
		} finally {
			setLoading(false);
		}
	};

			return (
				<div className="register-root">
					<div className="register-card">
						<div className="register-branding">
							<img src="/logo512.png" alt="TeamFlow Docs Logo" className="register-logo" />
							<span className="register-brand">TeamFlow Docs</span>
						</div>
						<h2 className="register-title">Create your TeamFlow account</h2>
						<button className="google-btn" onClick={handleGoogleRegister} disabled={loading}>
							<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="google-icon" />
							Sign up with Google
						</button>
						{error && <div className="register-error">{error}</div>}
					</div>
					<footer className="register-footer-promo">
						<span>Made with ❤️ by <a href="https://github.com/therajatdua" target="_blank" rel="noopener noreferrer">Rajat Dua</a></span>
					</footer>
				</div>
			);
}

export default Register;
