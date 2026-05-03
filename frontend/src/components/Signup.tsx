import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../utils/firebase';
import AuthLayout from './AuthLayout';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordInput from './PasswordInput';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleGoogleSignUp = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/app');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign-up failed');
        }
    };

    const handleEmailSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            navigate('/app');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Sign-up failed');
        }
    };

    return (
        <AuthLayout heroTitle={<>Create your <br /> Null-Secret account</>}>
            <h2 className="text-[28px] sm:text-[32px] font-bold tracking-tight mb-4">Create an account</h2>

            {error && (
                <div className="text-xs p-2 border" style={{ color: 'var(--text-danger)', borderColor: 'var(--text-danger)' }}>
                    {error}
                </div>
            )}

            <GoogleSignInButton onClick={handleGoogleSignUp} />

            <div className="relative flex items-center py-1">
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
                <span className="flex-shrink-0 mx-3 text-xs lowercase" style={{ color: 'var(--text-tertiary)' }}>or</span>
                <div className="flex-grow border-t" style={{ borderColor: 'var(--border-default)' }}></div>
            </div>

            <form className="space-y-3" onSubmit={handleEmailSignUp}>
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

                <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />

                <button
                    type="submit"
                    className="w-full font-semibold rounded-none py-3 text-[14px] transition-colors mt-1"
                    style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                >
                    Sign up
                </button>
            </form>

            <div className="text-center flex flex-col space-y-2 pt-1 text-[13px]">
                <p style={{ color: 'var(--text-tertiary)' }}>
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium underline underline-offset-4 ml-1" style={{ color: 'var(--text-secondary)' }}>
                        Sign in instead
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
