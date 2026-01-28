'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
    const { login, completeNewPassword } = useAuth();
    const router = useRouter();

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState(''); // For the forced change
    const [requiresNewPassword, setRequiresNewPassword] = useState(false);

    // UI States
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Initial Login Handler
    async function handleLoginSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const result = await login(email, password);
            if (result.requiresNewPassword) {
                setRequiresNewPassword(true); // Switch UI to 'Set New Password' mode
            } else {
                router.push('/dashboard');
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    // Handle the "Force Change Password" scenario
    async function handleNewPasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await completeNewPassword(newPassword);
            router.push('/dashboard');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">DocuGuard</h1>
                    <p className="text-slate-400 mt-2">Secure Role-Based Document Vault</p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-xl font-semibold text-white mb-6">
                        {requiresNewPassword ? 'Set Permanent Password' : 'Sign In'}
                    </h2>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {!requiresNewPassword ? (
                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
                            >
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleNewPasswordSubmit} className="space-y-5">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
                                <p className="text-amber-400 text-sm">
                                    Since your account was just created by an administrator, AWS requires you to set a new permanent password.
                                </p>
                            </div>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-slate-300 mb-2">
                                    New Permanent Password
                                </label>
                                <input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="Enter new password"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200"
                            >
                                {isLoading ? 'Saving...' : 'Set Password & Login'}
                            </button>
                        </form>
                    )}

                    <p className="mt-6 text-center text-slate-500 text-xs">
                        Powered by Amazon Cognito • AWS IAM
                    </p>
                </div>
            </div>
        </main>
    );
}
