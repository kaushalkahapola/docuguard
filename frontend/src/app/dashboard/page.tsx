'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

// Mock document data — later this data will come from the Spring Boot API
const MOCK_DOCUMENTS = [
    { id: 'doc-001', name: 'Q4 Financial Report.pdf', category: 'Finance', requiredRole: 'ADMIN', size: '2.4 MB' },
    { id: 'doc-002', name: 'Employee Handbook.pdf', category: 'HR', requiredRole: 'USER', size: '1.1 MB' },
    { id: 'doc-003', name: 'Annual Audit Report.pdf', category: 'Finance', requiredRole: 'ADMIN', size: '4.8 MB' },
    { id: 'doc-004', name: 'Onboarding Guide.pdf', category: 'HR', requiredRole: 'USER', size: '800 KB' },
];

export default function DashboardPage() {
    const { user, idToken, role, isLoading, logout } = useAuth();
    const router = useRouter();

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!user) return null;

    async function handleDownload(docId: string, docName: string) {
        try {
            if (!idToken) throw new Error("No auth token available");

            // 1. Ask Spring Boot for the Pre-Signed URL
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/${docId}`, {
                headers: {
                    Authorization: `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                let errorMsg = 'Failed to get document link';
                if (response.status === 403) {
                    errorMsg = 'Access Denied: You do not have the required role for this document.';
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();

            // 2. We got the S3 Pre-Signed URL! Now redirect the browser to start the direct download.
            // The browser will directly download the file from S3, completely bypassing our Spring Boot server!
            window.open(data.url, '_blank');

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error occurred';
            alert(message);
        }
    }

    async function handleLogout() {
        await logout();
        router.push('/login');
    }

    const accessibleDocs = MOCK_DOCUMENTS.filter(
        doc => role === 'ADMIN' || doc.requiredRole === 'USER'
    );

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Navbar */}
            <nav className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <span className="text-white font-bold text-lg">DocuGuard</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">{user.username}</span>
                            {role && (
                                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${role === 'ADMIN'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    }`}>
                                    {role}
                                </span>
                            )}
                        </div>
                        <button
                            id="logout-btn"
                            onClick={handleLogout}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-10">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white">Document Vault</h1>
                    <p className="text-slate-400 mt-1">
                        You have access to <strong className="text-white">{accessibleDocs.length}</strong> document(s) based on your <span className="text-blue-400">{role}</span> role.
                    </p>
                </div>

                {/* Info Banner */}
                <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm flex gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Downloads are secured via AWS S3 Pre-Signed URLs. Each link expires in 5 minutes. Files never pass through the application server.</span>
                </div>

                {/* Document Grid */}
                <div className="grid gap-4">
                    {accessibleDocs.map(doc => (
                        <div
                            key={doc.id}
                            className="flex items-center justify-between p-5 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-white font-medium">{doc.name}</p>
                                    <p className="text-slate-500 text-sm">{doc.category} • {doc.size}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <span className={`hidden sm:block text-xs px-2 py-1 rounded-md font-medium ${doc.requiredRole === 'ADMIN'
                                    ? 'bg-amber-500/10 text-amber-500'
                                    : 'bg-green-500/10 text-green-500'
                                    }`}>
                                    {doc.requiredRole}
                                </span>
                                <button
                                    id={`download-${doc.id}`}
                                    onClick={() => handleDownload(doc.id, doc.name)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/30 hover:border-blue-600 rounded-lg text-sm font-medium transition-all duration-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
