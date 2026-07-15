'use client';

import { useState } from 'react';
import { Clock, CheckCircle, AlertCircle, Delete } from 'lucide-react';

export default function Kiosk() {
    const [pin, setPin] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [firefighterName, setFirefighterName] = useState('');

    const handleNumberClick = (num: string) => {
        if (pin.length < 8) {
            setPin((prev) => prev + num);
        }
    };

    const handleDelete = () => {
        setPin((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        setPin('');
    };

    const handleAction = async (action: 'clock-in' | 'clock-out') => {
        if (!pin) return;
        setStatus('loading');
        setMessage('');
        setFirefighterName('');

        try {
            const res = await fetch(`/api/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || `Failed to ${action.replace('-', ' ')}`);
            }

            setStatus('success');
            setFirefighterName(data.firefighter.name);
            const actionText = action === 'clock-in' ? 'clocked in' : 'clocked out';
            setMessage(`Successfully ${actionText}.`);
            setPin('');

            setTimeout(() => {
                setStatus('idle');
                setMessage('');
                setFirefighterName('');
            }, 3000);
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message);
            setPin('');
            setTimeout(() => {
                setStatus('idle');
                setMessage('');
            }, 3000);
        }
    };

    // Login State
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginPin, setLoginPin] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginStep, setLoginStep] = useState<'pin' | 'checking' | 'password' | 'admin-select'>('pin');
    const [loginError, setLoginError] = useState('');
    const [loginName, setLoginName] = useState('');

    const handleLoginSubmit = async (pinOverride?: string) => {
        setLoginError('');
        const effectivePin = pinOverride ?? loginPin;
        const effectivePassword = pinOverride ? '' : loginPassword;

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pin: effectivePin,
                    password: effectivePassword
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401 && data.error === 'Password required') {
                    setLoginName(data.name || '');
                    setLoginStep('password');
                    return;
                }
                throw new Error(data.error || 'Login failed');
            }

            // Success
            if (data.user.isAdmin) {
                // Instead of auto-routing, show the router choice modal step
                setLoginName(data.user.name);
                setLoginStep('admin-select');
            } else {
                window.location.href = '/dashboard';
            }

        } catch (err: any) {
            setLoginError(err.message);
            if (pinOverride) setLoginStep('pin');
        }
    };

    const handleOpenLogin = () => {
        setShowLoginModal(true);
        setLoginError('');
        setLoginPassword('');

        if (pin) {
            setLoginPin(pin);
            setLoginStep('checking');
            void handleLoginSubmit(pin);
        } else {
            setLoginPin('');
            setLoginStep('pin');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-md">
                <header className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
                        <Clock className="w-10 h-10 text-red-500" />
                        FireStation TimeClock
                    </h1>
                    <p className="text-slate-400">Enter Radio ID (PIN)</p>
                </header>

                {status === 'success' ? (
                    <div className="bg-green-500/10 border border-green-500/50 rounded-2xl p-12 text-center animate-in fade-in zoom-in duration-300">
                        <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-6" />
                        <h2 className="text-3xl font-bold text-green-400 mb-2">Success!</h2>
                        <p className="text-xl text-white mb-2">{firefighterName}</p>
                        <p className="text-slate-300">{message}</p>
                    </div>
                ) : (
                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl">
                        <div className="bg-slate-900 rounded-xl px-6 mb-6 text-center border border-slate-700 h-24 flex items-center justify-center relative overflow-hidden">
                            {status === 'error' && (
                                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center animate-pulse z-10 pointer-events-none">
                                    <p className="text-red-400 font-bold tracking-normal">{message}</p>
                                </div>
                            )}
                            <input
                                type="text"
                                inputMode="numeric"
                                value={pin}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\\D/g, '');
                                    if (val.length <= 8) setPin(val);
                                }}
                                className={`w-full bg-transparent text-center text-4xl font-mono tracking-widest outline-none text-white placeholder-slate-600 ${status === 'error' ? 'opacity-0' : 'opacity-100'}`}
                                placeholder="_ _ _ _"
                                autoFocus
                            />
                        </div>

                        {/* Keypad */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handleNumberClick(num.toString())}
                                    disabled={status === 'loading'}
                                    className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-2xl font-bold py-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {num}
                                </button>
                            ))}
                            <button
                                onClick={handleClear}
                                disabled={status === 'loading'}
                                className="bg-red-900/50 hover:bg-red-900/80 text-red-200 text-lg font-bold py-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                CLR
                            </button>
                            <button
                                onClick={() => handleNumberClick('0')}
                                disabled={status === 'loading'}
                                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-2xl font-bold py-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                0
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={status === 'loading'}
                                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 flex items-center justify-center py-6 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                <Delete className="w-8 h-8" />
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-4 flex-row-reverse">
                            <button
                                onClick={() => handleAction('clock-out')}
                                disabled={!pin || status === 'loading'}
                                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                Clock Out
                            </button>
                            <button
                                onClick={() => handleAction('clock-in')}
                                disabled={!pin || status === 'loading'}
                                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xl font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95"
                            >
                                Clock In
                            </button>
                        </div>
                    </div>
                )}

                {/* Log In Button */}
                <div className="mt-8 text-center">
                    <button
                        onClick={handleOpenLogin}
                        className="text-slate-500 hover:text-blue-400 text-sm font-semibold flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <LockKeyhole className="w-4 h-4" />
                        Log In to Dashboard
                    </button>
                </div>
            </div>

            {/* Login Modal */}
            {showLoginModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 border border-slate-700 shadow-2xl relative">
                        <button
                            onClick={() => {
                                setShowLoginModal(false);
                                setLoginPin('');
                                setLoginPassword('');
                                setLoginStep('pin');
                                setLoginError('');
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>

                        {loginStep === 'checking' ? (
                            <div className="py-8 text-center">
                                <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-slate-300">Checking Radio ID...</p>
                            </div>
                        ) : loginStep === 'pin' ? (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleLoginSubmit();
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Enter Radio ID (PIN)</label>
                                    <input
                                        ref={(input) => {
                                            if (input && showLoginModal && loginStep === 'pin') {
                                                setTimeout(() => input.focus(), 50);
                                            }
                                        }}
                                        type="text"
                                        value={loginPin}
                                        onChange={(e) => setLoginPin(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-xl font-mono text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="0000"
                                        autoFocus
                                    />
                                </div>
                                {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Next
                                </button>
                            </form>
                        ) : loginStep === 'password' ? (
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handleLoginSubmit();
                            }} className="space-y-4">
                                <div>
                                    <p className="text-center text-slate-300 mb-4">Hello, <span className="font-bold text-white">{loginName}</span></p>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Enter Password</label>
                                    <input
                                        ref={(input) => {
                                            if (input && showLoginModal && loginStep === 'password') {
                                                setTimeout(() => input.focus(), 50);
                                            }
                                        }}
                                        type="password"
                                        value={loginPassword}
                                        onChange={(e) => setLoginPassword(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-xl text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="••••••"
                                        autoFocus
                                    />
                                </div>
                                {loginError && <p className="text-red-400 text-sm text-center">{loginError}</p>}
                                <button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Log In
                                </button>
                            </form>
                        ) : (
                            <div className="space-y-4 text-center">
                                <p className="text-slate-300 mb-6">Hello, <span className="font-bold text-white">{loginName}</span>.<br /> Where would you like to go?</p>

                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-bold py-4 rounded-xl transition-colors shadow-lg"
                                >
                                    User Dashboard
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-slate-700"></div>
                                    <span className="flex-shrink-0 mx-4 text-slate-500 text-sm font-medium">OR</span>
                                    <div className="flex-grow border-t border-slate-700"></div>
                                </div>

                                <button
                                    onClick={() => window.location.href = '/admin'}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
                                >
                                    Admin Dashboard
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function LockKeyhole(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="16" r="1" />
            <rect x="8" y="10" width="8" height="12" rx="2" />
            <path d="M7 10V7a5 5 0 0 1 10 0v3" />
        </svg>
    )
}

function X(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    )
}
