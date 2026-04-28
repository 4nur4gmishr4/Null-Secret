import { useNavigate } from 'react-router-dom';

export default function Footer() {
    const navigate = useNavigate();

    return (
        <div className="w-full flex flex-col justify-center relative overflow-hidden font-sans pt-8 md:pt-12 pb-16 md:pb-24 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

            {/* Main Footer Card */}
            <div className="w-full max-w-4xl mx-auto border rounded-3xl p-8 lg:p-12 z-10 relative shadow-2xl" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-default)' }}>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-8 lg:gap-y-0">

                    {/* Column 1: Branding */}
                    <div className="lg:col-span-6 flex flex-col justify-between pb-8 lg:pb-0 lg:pr-12 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-default)' }}>
                        <div>
                            {/* Logo */}
                            <div className="flex items-center gap-3 mb-8">
                                <span className="font-logo tracking-widest text-[20px] uppercase">
                                    Null-Secret
                                </span>
                            </div>
                            {/* Tagline */}
                            <h2 className="text-[28px] leading-[1.15] font-bold tracking-tight mb-6" style={{ color: 'var(--text-primary)' }}>
                                Private messages<br />
                                that disappear after reading
                            </h2>
                        </div>
                        {/* Subtext */}
                        <p className="text-[13px] mt-8 lg:mt-0" style={{ color: 'var(--text-secondary)' }}>
                            Developed by Anurag Mishra
                        </p>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="lg:col-span-3 flex flex-col py-8 lg:py-0 lg:px-12 border-b lg:border-b-0 lg:border-r" style={{ borderColor: 'var(--border-default)' }}>
                        <h3 className="font-semibold text-[15px] mb-6" style={{ color: 'var(--text-primary)' }}>Links</h3>
                        <ul className="space-y-4 flex-1">
                            <li><button onClick={() => navigate('/app')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Create Secret</button></li>
                            <li><button onClick={() => navigate('/')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Home</button></li>
                            <li><button onClick={() => navigate('/privacy')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Privacy</button></li>
                            <li><button onClick={() => navigate('/login')} className="hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>Sign In</button></li>
                        </ul>
                    </div>

                    {/* Column 3: Legal & Social */}
                    <div className="lg:col-span-3 flex flex-col pt-8 lg:pt-0 lg:pl-12">
                        <h3 className="font-semibold text-[15px] mb-6" style={{ color: 'var(--text-primary)' }}>Connect</h3>
                        <ul className="space-y-4 flex-1">
                            <li>
                                <a href="https://github.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <span>GitHub</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://x.com/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <span>Twitter/X</span>
                                </a>
                            </li>
                            <li>
                                <a href="https://linkedin.com/in/4nur4gmishr4" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <span>LinkedIn</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:anuragmishrasnag06082004@gmail.com" className="flex items-center gap-2 hover:opacity-75 transition-opacity text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                                    <span>Email</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                </div>
            </div>

            {/* Massive Background Text */}
            <div className="absolute bottom-0 left-0 w-full flex items-end overflow-hidden opacity-[0.05] md:opacity-[0.12] pointer-events-none select-none z-0 pb-2">
                <span className="text-[15vw] leading-[0.8] tracking-widest uppercase whitespace-nowrap font-logo animate-marquee" style={{ color: 'var(--text-primary)', filter: 'blur(1px)' }}>
                    NULL-SECRET
                </span>
            </div>
        </div>
    );
}