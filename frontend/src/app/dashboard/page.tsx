'use client';

import { useEffect, useState } from 'react';
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

    // Documents state
    const [documents, setDocuments] = useState<any[]>([]);
    const [fetchingDocs, setFetchingDocs] = useState(true);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');

    // Fetch documents on load
    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
            return;
        }

        if (user && idToken) {
            fetchDocuments();
        }
    }, [user, isLoading, router, idToken]);

    async function fetchDocuments() {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents`, {
                headers: { Authorization: `Bearer ${idToken}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setFetchingDocs(false);
        }
    }

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

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        setUploadError('');
        setUploadSuccess('');
        setIsUploading(true);

        try {
            // 1. Get Pre-Signed PUT URL from Backend
            const backendRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type || 'application/octet-stream'
                })
            });

            if (!backendRes.ok) throw new Error("Failed to get upload URL");
            const { uploadUrl } = await backendRes.json();

            // 2. Upload file directly to S3
            const s3Res = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream'
                }
            });

            if (!s3Res.ok) throw new Error("Failed to upload file to S3");

            setUploadSuccess('File uploaded successfully! It will appear shortly once processed.');

            // Clear the file input
            e.target.value = '';

            // Optional: refresh documents after a short delay so the SQS worker has time to save it to DB
            setTimeout(fetchDocuments, 2000);

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setUploadError(message);
        } finally {
            setIsUploading(false);
        }
    }

    async function handleLogout() {
        await logout();
        router.push('/login');
    }

    // Removed hardcoded dummy filter
    const accessibleDocs = documents;

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

                {/* Admin Upload Section */}
                {role === 'ADMIN' && (
                    <div className="mb-8 p-6 bg-slate-800/80 border border-slate-700 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Admin Upload Portal
                        </h2>
                        <p className="text-sm text-slate-400 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                            Upload a document directly to S3. The background worker will automatically detect the upload resulting in the document appearing in the vault shortly after.
                        </p>

                        <div className="flex items-center gap-4">
                            <label className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all
                                ${isUploading
                                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 hover:border-amber-500/50'}
                            `}>
                                <svg className={`w-4 h-4 ${isUploading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {isUploading ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    )}
                                </svg>
                                {isUploading ? 'Uploading to S3...' : 'Select File to Upload'}
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </label>

                            {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}
                            {uploadSuccess && <p className="text-green-400 text-sm">{uploadSuccess}</p>}
                        </div>
                    </div>
                )}

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
