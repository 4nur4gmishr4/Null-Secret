import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebase';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage("Password reset email sent. Check your inbox.");
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] w-full flex p-4 font-sans slide-up" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <div className="hidden lg:flex lg:w-1/2 relative rounded-3xl overflow-hidden p-10 flex-col justify-between" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
                <div className="relative z-10 flex items-center gap-3">
                    <span className="font-logo text-2xl tracking-wide uppercase">Null-Secret</span>
                </div>
                <div className="relative z-10">
                    <h1 className="text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
                        Zero-Knowledge <br /> Account Recovery
                    </h1>
                </div>
            </div>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-[380px] space-y-6">
                    <h2 className="text-[32px] font-bold tracking-tight mb-8">Reset password</h2>

                    {error && <div className="text-sm p-3 border" style={{ color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}>{error}</div>}
                    {message && <div className="text-sm p-3 border" style={{ color: 'var(--text-success)', borderColor: 'var(--text-success)' }}>{message}</div>}

                    <form className="space-y-4" onSubmit={handleResetPassword}>
                        <div>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-none px-4 py-3.5 text-[15px] focus:outline-none transition-all"
                                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full font-semibold rounded-none py-3.5 text-[15px] transition-colors mt-2"
                            style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                        >
                            Send Reset Link
                        </button>
                    </form>

                    <div className="text-center flex flex-col space-y-4 pt-2 text-[14px]">
                        <p style={{ color: 'var(--text-tertiary)' }}>
                            Remember your password? <Link to="/login" className="font-medium underline underline-offset-4 ml-1" style={{ color: 'var(--text-secondary)' }}>Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}