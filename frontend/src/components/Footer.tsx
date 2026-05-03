import { useNavigate } from 'react-router-dom';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <div className="w-full flex flex-col justify-center font-sans pt-8 md:pt-12 pb-24 md:pb-[18rem] px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Main Footer Card */}
            <div className="w-full max-w-4xl mx-auto border p-8 lg:p-12 z-10 relative shadow-2xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-y-0">

                    {/* Column 1: Branding */}
                    <div className="lg:col-span-4 flex flex-col justify-between pb-8 lg:pb-0 lg:pr-8 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-default)' }}>
                        <div>
                            {/* Logo */}
                            <div className="flex items-center gap-3 mb-6">
                                <span className="font-logo tracking-widest text-[20px] uppercase">
                                    Null-Secret
                                </span>
                            </div>
                            {/* Tagline */}
                            <h2 className="text-[24px] leading-[1.2] font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
                                Private messages<br />
                                that disappear after reading
                            </h2>
                            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                Zero-knowledge, end-to-end encrypted secret sharing. Your messages never leave your device unencrypted.
                            </p>
                        </div>
                        {/* Subtext */}
                        <div className="mt-6">
                            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                                Developed by Anurag Mishra
                            </p>
                            <p className="text-[11px] mt-2" style={{ color: 'var(--text-tertiary)' }}>
                                © 2026 Null-Secret. All rights reserved.
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Product */}
                    <div className="lg:col-span-3 flex flex-col py-8 lg:py-0 lg:px-8 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-default)' }}>
                        <h3 className="font-semibold text-[15px] mb-6" style={{ color: 'var(--text-primary)' }}>Product</h3>
                        <ul className="space-y-3 flex-1">
                            <li><button onClick={() => navigate('/app')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Create Secret</button></li>
                            <li><button onClick={() => navigate('/')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>How It Works</button></li>
                            <li><button onClick={() => navigate('/privacy')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Privacy</button></li>
                            <li><button onClick={() => navigate('/login')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Sign In</button></li>
                            <li><button onClick={() => navigate('/signup')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Create Account</button></li>
                        </ul>
                    </div>

                    {/* Column 3: Resources */}
                    <div className="lg:col-span-2 flex flex-col py-8 lg:py-0 lg:px-8 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-default)' }}>
                        <h3 className="font-semibold text-[15px] mb-6" style={{ color: 'var(--text-primary)' }}>Resources</h3>
                        <ul className="space-y-3 flex-1">
                            <li>
                                <a href="https://github.com/4nur4gmishr4/Null-Secret" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    GitHub
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/4nur4gmishr4/Null-Secret/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/4nur4gmishr4/Null-Secret/issues" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    Support
                                </a>
                            </li>
                            <li>
                                <a href="https://github.com/4nur4gmishr4/Null-Secret/blob/main/USER_GUIDE.md" target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    User Guide
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Connect */}
                    <div className="lg:col-span-3 flex flex-col pt-8 lg:pt-0 lg:pl-8">
                        <h3 className="font-semibold text-[15px] mb-6" style={{ color: 'var(--text-primary)' }}>Connect</h3>
                        <ul className="space-y-3 flex-1">
                            <li>
                                <a href="https://github.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                    <span>GitHub</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://x.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                    <span>Twitter/X</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://linkedin.com/in/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                                    <span>LinkedIn</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:anuragmishrasnag06082004@gmail.com" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    <span>Email</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                </div>

                {/* Bottom bar */}
                <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        Built for privacy
                    </p>
                    <div className="flex gap-6">
                        <button onClick={() => navigate('/privacy')} className="text-[11px] hover:opacity-75 transition-opacity" style={{ color: 'var(--text-tertiary)' }}>Privacy Policy</button>
                        <button onClick={() => navigate('/terms')} className="text-[11px] hover:opacity-75 transition-opacity" style={{ color: 'var(--text-tertiary)' }}>Terms of Service</button>
                    </div>
                </div>
            </div>

            {/* Background Marquee */}
            <div className="absolute bottom-4 md:bottom-8 left-0 w-full overflow-hidden pointer-events-none select-none z-0 opacity-5 dark:opacity-10">
                <div className="animate-marquee-seamless w-max">
                    <span className="font-logo text-[18vw] leading-none uppercase pr-8">
                        NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET
                    </span>
                    <span className="font-logo text-[18vw] leading-none uppercase pr-8" aria-hidden="true">
                        NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET NULL-SECRET
                    </span>
                </div>
            </div>

        </div>
    );
}