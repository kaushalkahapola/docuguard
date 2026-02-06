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

    // Format dates nicely
    const formatDate = (dateString?: string) => {
        if (!dateString) return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // Documents state
    const [documents, setDocuments] = useState<any[]>([]);
    const [fetchingDocs, setFetchingDocs] = useState(true);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadRole, setUploadRole] = useState('USER');

    // Create User state
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('USER');
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [createUserMsg, setCreateUserMsg] = useState({ type: '', text: '' });

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
                    contentType: file.type || 'application/octet-stream',
                    role: uploadRole
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

    async function handleCreateUser(e: React.FormEvent) {
        e.preventDefault();
        setCreateUserMsg({ type: '', text: '' });
        setIsCreatingUser(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ email: newUserEmail, role: newUserRole })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to create user");

            setCreateUserMsg({ type: 'success', text: data.message });
            setNewUserEmail('');
            setNewUserRole('USER');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Error creating user';
            setCreateUserMsg({ type: 'error', text: message });
        } finally {
            setIsCreatingUser(false);
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

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <label className="text-slate-400 text-sm">Target Role:</label>
                                <select
                                    value={uploadRole}
                                    onChange={(e) => setUploadRole(e.target.value)}
                                    disabled={isUploading}
                                    className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block p-2 outline-none"
                                >
                                    <option value="USER">USER (All Users)</option>
                                    <option value="ADMIN">ADMIN (Admins Only)</option>
                                </select>
                            </div>
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

                                {uploadError && <p className="text-red-400 text-sm mt-3">{uploadError}</p>}
                                {uploadSuccess && <p className="text-green-400 text-sm mt-3">{uploadSuccess}</p>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin User Management Section */}
                {role === 'ADMIN' && (
                    <div className="mb-8 p-6 bg-slate-800/80 border border-slate-700 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Add New User (Admin Only)
                        </h2>
                        <p className="text-sm text-slate-400 mb-4 bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                            Create a new account in AWS Cognito. AWS will email them a temporary password.
                            Upon first login, they must set a permanent password.
                        </p>

                        <form onSubmit={handleCreateUser} className="flex flex-col sm:flex-row items-end gap-4">
                            <div className="w-full sm:w-1/3">
                                <label className="block text-slate-400 text-sm mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newUserEmail}
                                    onChange={(e) => setNewUserEmail(e.target.value)}
                                    required
                                    disabled={isCreatingUser}
                                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 outline-none"
                                    placeholder="newuser@example.com"
                                />
                            </div>
                            <div className="w-full sm:w-1/4">
                                <label className="block text-slate-400 text-sm mb-1">Initial Role</label>
                                <select
                                    value={newUserRole}
                                    onChange={(e) => setNewUserRole(e.target.value)}
                                    disabled={isCreatingUser}
                                    className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2 outline-none"
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={isCreatingUser}
                                className={`
                                    px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${isCreatingUser
                                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-500/50'}
                                `}
                            >
                                {isCreatingUser ? 'Creating...' : 'Create Cognito User'}
                            </button>
                        </form>

                        {createUserMsg.text && (
                            <p className={`mt-3 text-sm ${createUserMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {createUserMsg.text}
                            </p>
                        )}
                    </div>
                )}

                {/* Document Data Table */}
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 border-b border-slate-700">
                                <tr>
                                    <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Document Name</th>
                                    <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Category</th>
                                    <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Access Level</th>
                                    <th scope="col" className="px-6 py-4 font-semibold tracking-wider">Date Added</th>
                                    <th scope="col" className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {accessibleDocs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            {fetchingDocs ? 'Loading documents...' : 'No documents available in the vault.'}
                                        </td>
                                    </tr>
                                ) : (
                                    accessibleDocs.map(doc => (
                                        <tr key={doc.id} className="hover:bg-slate-700/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center flex-shrink-0 border border-red-500/20">
                                                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <span className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">{doc.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-slate-400">{doc.category}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold tracking-wide border ${doc.requiredRole === 'ADMIN'
                                                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                    {doc.requiredRole}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400">
                                                {formatDate(doc.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    onClick={() => handleDownload(doc.id, doc.name)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/20 hover:border-blue-600 rounded-lg text-sm font-medium transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    );
}
