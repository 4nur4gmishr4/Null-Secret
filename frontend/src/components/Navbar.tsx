import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../utils/firebase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api/v1';

const HeaderWifiIcon: React.FC<{ alive: boolean | null }> = ({ alive }) => {
    return (
        <div className="relative flex items-center justify-center w-6 h-6">
            {!alive ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">       
                <line x1="2" y1="2" x2="22" y2="22" />
                <path d="M8.5 16.5a5 5 0 0 1 7 0" />
                <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
                <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.82" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={alive === true ? "text-green-500" : "text-zinc-500"}>      
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            )}
        </div>
    );
    };

    export default function NavigationBar() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMobileDropdown, setOpenMobileDropdown] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [backendAlive, setBackendAlive] = useState<boolean | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const resp = await fetch(`${API_BASE}/healthz`);
                setBackendAlive(resp.ok);
            } catch {
                setBackendAlive(false);
            }
        };
        checkHealth();
    }, []);

    const toggleMobileDropdown = (menu: string) => {
        setOpenMobileDropdown(openMobileDropdown === menu ? null : menu);
    };

    return (
        <>
            <header className="w-full bg-[#0a0a0a] text-white font-sans border-b border-zinc-900">
                <nav className="flex items-center justify-between px-6 py-4 max-w-full mx-auto">

                    {/* Desktop Left Navigation */}
                    <div className="hidden md:flex items-center gap-8">

                        {/* Products Dropdown */}
                        <div className="relative group py-1">
                            <button className="flex items-center gap-1.5 font-medium text-[15px] hover:text-zinc-300 transition-colors">
                                Products
                                <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            <div className="absolute top-full left-0 pt-2 w-56 opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-200 z-50">
                                <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl py-2 shadow-2xl">
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">Analytics Dashboard</a>
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">Marketing Suite</a>
                                </div>
                            </div>
                        </div>

                        {/* Solutions Dropdown */}
                        <div className="relative group py-1">
                            <button className="flex items-center gap-1.5 font-medium text-[15px] hover:text-zinc-300 transition-colors">
                                Solutions
                                <svg className="w-4 h-4 transition-transform duration-200 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>

                            <div className="absolute top-full left-0 pt-2 w-56 opacity-0 translate-y-1 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-all duration-200 z-50">
                                <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl py-2 shadow-2xl">
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">For Startups</a>
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">For Enterprise</a>
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">For Agencies</a>
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">For Freelancers</a>
                                    <a href="#" className="block px-4 py-2.5 text-[14px] text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors">For E-commerce</a>
                                </div>
                            </div>
                        </div>

                        {/* Pricing Link */}
                        <a href="#" className="font-medium text-[15px] hover:text-zinc-300 transition-colors py-1">
                            Pricing
                        </a>

                    </div>

                    {/* Desktop Right Navigation */}
                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center justify-center mr-1">
                            <HeaderWifiIcon alive={backendAlive} />
                        </div>
                        {user && (
                            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                                {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-xs font-bold uppercase">{(user.displayName || user.email || 'U').charAt(0)}</span>}
                            </div>
                        )}
                        <button onClick={() => navigate('/login')} className="px-5 py-2 text-[14px] font-medium border border-zinc-600 rounded-lg hover:bg-white hover:text-black hover:border-white transition-all">
                            {user ? 'Vault' : 'Sign In'}
                        </button>
                    </div>

                    {/* Mobile Menu Toggle Button */}
                    <div className="md:hidden flex items-center w-full">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="bg-white text-black p-2 rounded-lg hover:bg-zinc-200 transition-colors ml-auto"
                            aria-label="Open Menu"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" x2="20" y1="12" y2="12" />
                                <line x1="4" x2="20" y1="6" y2="6" />
                                <line x1="4" x2="20" y1="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-[#0a0a0a] text-white flex flex-col md:hidden">

                    {/* Mobile Header */}
                    <div className="flex items-center px-6 py-4 border-b border-zinc-900">
                        <button
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="bg-white text-black p-2 rounded-lg hover:bg-zinc-200 transition-colors"
                            aria-label="Close Menu"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Mobile Links */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">

                        {/* Mobile Products Accordion */}
                        <div className="border-b border-zinc-900">
                            <button
                                onClick={() => toggleMobileDropdown('products')}
                                className="flex items-center justify-between w-full py-4 text-left font-medium text-[16px]"
                            >
                                Products
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openMobileDropdown === 'products' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openMobileDropdown === 'products' ? 'max-h-40 pb-4' : 'max-h-0'}`}>
                                <div className="flex flex-col space-y-3 pl-4">
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">Analytics Dashboard</a>
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">Marketing Suite</a>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Solutions Accordion */}
                        <div className="border-b border-zinc-900">
                            <button
                                onClick={() => toggleMobileDropdown('solutions')}
                                className="flex items-center justify-between w-full py-4 text-left font-medium text-[16px]"
                            >
                                Solutions
                                <svg className={`w-5 h-5 transition-transform duration-200 ${openMobileDropdown === 'solutions' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ${openMobileDropdown === 'solutions' ? 'max-h-64 pb-4' : 'max-h-0'}`}>
                                <div className="flex flex-col space-y-3 pl-4">
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">For Startups</a>
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">For Enterprise</a>
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">For Agencies</a>
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">For Freelancers</a>
                                    <a href="#" className="text-zinc-400 hover:text-white text-[15px]">For E-commerce</a>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Pricing Link */}
                        <div className="border-b border-zinc-900">
                            <a href="#" className="block w-full py-4 text-left font-medium text-[16px]">
                                Pricing
                            </a>
                        </div>

                        {/* System status in mobile */}
                        <div className="py-4 flex items-center justify-between border-b border-zinc-900">
                             <span className="text-[16px] font-medium">System Connection</span>
                             <HeaderWifiIcon alive={backendAlive} />
                        </div>

                    </div>

                    {/* Mobile Footer Actions */}
                    <div className="p-6 space-y-3 mt-auto">
                        <button onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }} className="w-full py-3.5 rounded-lg border border-zinc-600 text-white font-medium text-[15px] hover:bg-zinc-900 transition-colors">
                            {user ? 'Open Vault' : 'Sign In'}
                        </button>
                        {!user && (
                            <button onClick={() => { setIsMobileMenuOpen(false); navigate('/signup'); }} className="w-full py-3.5 rounded-lg bg-white text-black font-medium text-[15px] hover:bg-zinc-200 transition-colors">
                                Create Account
                            </button>
                        )}
                    </div>

                </div>
            )}
        </>
    );
    }