import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import { friendlyAuthError } from '../utils/authErrors';
import AuthLayout from './AuthLayout';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordInput from './PasswordInput';

export default function Authscreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleSignIn = async () => {
        setError(null);
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/app');
        } catch (err: unknown) {
            setError(friendlyAuthError(err, 'Sign-in failed. Please try again.'));
        }
    };

    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate('/app');
        } catch (err: unknown) {
            setError(friendlyAuthError(err, 'Sign-in failed. Please try again.'));
        }
    };

    return (
        <AuthLayout heroTitle={<>Sign in to <br /> your Null-Secret account</>}>
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-4">Welcome back</h2>

            {error && (
                <div className="text-xs p-2 border" style={{ color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}>
                    {error}
                </div>
            )}

            <GoogleSignInButton onClick={handleGoogleSignIn} />

            <div className="relative flex items-center py-1">
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
                <span className="flex-shrink-0 mx-3 text-xs lowercase" style={{ color: 'var(--text-tertiary)' }}>or</span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
            </div>

            <form className="space-y-3" onSubmit={handleEmailSignIn}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-none px-4 py-3 text-[14px] focus:outline-none transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                    required
                />

                <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />

                <button
                    type="submit"
                    className="w-full font-semibold rounded-none py-3 text-[14px] transition-colors mt-1"
                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                >
                    Sign in
                </button>
            </form>

            <div className="text-center flex flex-col space-y-2 pt-1 text-[13px]">
                <Link to="/forgot-password" className="font-medium underline underline-offset-4" style={{ color: 'var(--text-secondary)' }}>
                    Forgot your password?
                </Link>
                <p style={{ color: 'var(--text-tertiary)' }}>
                    Do not have an account yet?{' '}
                    <Link to="/signup" className="font-medium underline underline-offset-4 ml-1" style={{ color: 'var(--text-secondary)' }}>
                        Create one
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
