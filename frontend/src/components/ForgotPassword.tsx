import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../utils/firebase';
import AuthLayout from './AuthLayout';

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
            setMessage(
                'We just sent you a password reset email. Check your inbox in a minute or two, including the spam folder.'
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to send reset email');
        }
    };

    return (
        <AuthLayout heroTitle={<>Reset your <br /> Null-Secret password</>}>
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-4">Forgot your password?</h2>

            {error && (
                <div className="text-xs p-2 border" style={{ color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}>
                    {error}
                </div>
            )}
            {message && (
                <div className="text-xs p-2 border" style={{ color: 'var(--text-success)', borderColor: 'var(--text-success)' }}>
                    {message}
                </div>
            )}

            <form className="space-y-3" onSubmit={handleResetPassword}>
                <input
                    type="email"
                    placeholder="The email on your account"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-none px-4 py-3 text-[14px] focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    required
                />

                <button
                    type="submit"
                    className="w-full font-semibold rounded-none py-3 text-[14px] transition-colors mt-1"
                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                >
                    Send reset link
                </button>
            </form>

            <div className="text-center flex flex-col space-y-2 pt-1 text-[13px]">
                <p style={{ color: 'var(--text-tertiary)' }}>
                    Remember it now?{' '}
                    <Link to="/login" className="font-medium underline underline-offset-4 ml-1" style={{ color: 'var(--text-secondary)' }}>
                        Back to sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
