import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';

export default function Authscreen() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/app');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/app');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign-in failed');
        }
    };

    return (
        <div className="h-[calc(100vh-var(--header-h))] w-full flex p-3 sm:p-4 font-sans fade-in overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="hidden lg:flex lg:w-1/2 relative rounded-3xl overflow-hidden p-8 flex-col justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                <div className="relative z-10 flex items-center gap-3">
                    <span className="font-logo text-2xl tracking-wide uppercase">Null-Secret</span>
                </div>
                <div className="relative z-10">
                    <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight">
                        Sign in to <br /> your Null-Secret account
                    </h1>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
                <div className="w-full max-w-[380px] space-y-4">
                    <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-4">Welcome back</h2>

                    {error && <div className="text-xs p-2 border" style={{ color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}>{error}</div>}

                    <div className="space-y-2">
                        <button onClick={handleGoogleSignIn} type="button" className="w-full flex items-center justify-center gap-2.5 py-2.5 bg-transparent rounded-none transition-colors text-[14px] font-medium hover:opacity-80" style={{ border: '1px solid var(--border-default)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="relative flex items-center py-1">
                        <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
                        <span className="flex-shrink-0 mx-3 text-xs lowercase" style={{ color: 'var(--text-tertiary)' }}>or</span>
                        <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
                    </div>

                    <form className="space-y-3" onSubmit={handleEmailSignIn}>
                        <div>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-none px-4 py-3 text-[14px] focus:outline-none transition-all"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-none px-4 py-3 text-[14px] focus:outline-none transition-all pr-12"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                style={{ color: 'var(--text-tertiary)' }}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="w-full font-semibold rounded-none py-3 text-[14px] transition-colors mt-1"
                            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                        >
                            Sign in
                        </button>
                    </form>

                    <div className="text-center flex flex-col space-y-2 pt-1 text-[13px]">
                        <Link to="/forgot-password" className="font-medium underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>Forgot your password?</Link>
                        <p style={{ color: 'var(--text-tertiary)' }}>
                            Do not have an account yet? <Link to="/signup" className="font-medium underline underline-offset-4 ml-1" style={{ color: 'var(--text-secondary)' }}>Create one</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}