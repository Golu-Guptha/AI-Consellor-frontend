import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const { signUp, handleGoogleCredential, initGoogleButton } = useAuth();
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    // Initialize Google Sign-In button
    useEffect(() => {
        const initButton = () => {
            if (googleBtnRef.current && window.google?.accounts?.id) {
                initGoogleButton(googleBtnRef.current);
            } else {
                setTimeout(initButton, 200);
            }
        };
        initButton();

        // Listen for Google credential
        const handleCredential = async (e) => {
            setError('');
            setLoading(true);
            try {
                await handleGoogleCredential(e.detail);
                navigate('/onboarding');
            } catch (err) {
                setError(err.message || 'Google sign-in failed');
            } finally {
                setLoading(false);
            }
        };

        window.addEventListener('google-credential', handleCredential);
        return () => window.removeEventListener('google-credential', handleCredential);
    }, [initGoogleButton, handleGoogleCredential, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signUp(email, password, name);
            setSuccess(true);
            setTimeout(() => navigate('/onboarding'), 2000);
        } catch (err) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <div className="text-5xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
                    <p className="text-[hsl(var(--color-text-muted))]">
                        Check your email to verify your account. Redirecting to onboarding...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[hsl(var(--color-bg))] via-[hsl(var(--color-bg-secondary))] to-[hsl(var(--color-bg))]">
            <div className="card max-w-md w-full animate-slide-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                    <p className="text-[hsl(var(--color-text-muted))]">
                        Start your study abroad journey today
                    </p>
                </div>

                {error && (
                    <div className="bg-[hsl(var(--color-error))]/10 border border-[hsl(var(--color-error))]/30 text-[hsl(var(--color-error))] p-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="label">Full Name</label>
                        <input
                            type="text"
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="label">Password</label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            disabled={loading}
                        />
                        <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">
                            At least 6 characters
                        </p>
                    </div>

                    <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                        {loading ? <span className="spinner"></span> : 'Create Account'}
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-[hsl(var(--color-border))]"></div>
                    <span className="text-sm text-[hsl(var(--color-text-muted))]">or</span>
                    <div className="flex-1 h-px bg-[hsl(var(--color-border))]"></div>
                </div>

                {/* Native Google Sign-In Button */}
                <div
                    ref={googleBtnRef}
                    className="flex justify-center w-full"
                    style={{ minHeight: '44px' }}
                ></div>

                <p className="text-center text-sm text-[hsl(var(--color-text-muted))] mt-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[hsl(var(--color-primary))] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
