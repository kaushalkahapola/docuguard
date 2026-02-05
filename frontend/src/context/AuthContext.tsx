'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { signIn, signOut, confirmSignIn, getCurrentUser, fetchAuthSession, AuthUser } from 'aws-amplify/auth';

interface AuthContextType {
    user: AuthUser | null;
    idToken: string | null;
    role: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ requiresNewPassword: boolean }>;
    signUp: (email: string, password: string) => Promise<void>;
    confirmSignUpUser: (email: string, code: string) => Promise<void>;
    completeNewPassword: (newPassword: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [idToken, setIdToken] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check if a user is already logged in on page load
    useEffect(() => {
        refreshSession();
    }, []);

    async function refreshSession() {
        try {
            const currentUser = await getCurrentUser();
            const session = await fetchAuthSession();
            const token = session.tokens?.idToken?.toString() ?? null;
            const payload = session.tokens?.idToken?.payload;
            const userRole = (payload?.['custom:role'] as string) ?? null;
            setUser(currentUser);
            setIdToken(token);
            setRole(userRole);
        } catch {
            setUser(null);
            setIdToken(null);
            setRole(null);
        } finally {
            setIsLoading(false);
        }
    }

    async function login(email: string, password: string) {
        const response = await signIn({ username: email, password });

        // AWS Cognito usually forces a password change on first login for admin-created users
        if (response.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
            return { requiresNewPassword: true };
        }

        await refreshSession();
        return { requiresNewPassword: false };
    }

    async function signUp(email: string, password: string) {
        // AWS Amplify auth uses email as the default username
        await import('aws-amplify/auth').then(mod => mod.signUp({
            username: email,
            password,
            options: {
                userAttributes: {
                    email
                }
            }
        }));
    }

    async function confirmSignUpUser(email: string, code: string) {
        await import('aws-amplify/auth').then(mod => mod.confirmSignUp({
            username: email,
            confirmationCode: code
        }));
    }

    async function completeNewPassword(newPassword: string) {
        // Submit the new permanent password to AWS
        await confirmSignIn({ challengeResponse: newPassword });
        await refreshSession();
    }

    async function logout() {
        await signOut();
        setUser(null);
        setIdToken(null);
        setRole(null);
    }

    return (
        <AuthContext.Provider value={{ user, idToken, role, isLoading, login, signUp, confirmSignUpUser, completeNewPassword, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
