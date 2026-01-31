import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';

export default function ProtectedRoute({ children, requireProfile = false, requireLock = false }) {
    const { user, loading: authLoading } = useAuth();
    const { profile, loading: profileLoading, locks } = useProfile();

    if (authLoading || ((requireProfile || requireLock) && profileLoading)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (requireProfile && (!profile || !profile.profile_complete)) {
        return <Navigate to="/onboarding" />;
    }

    if (requireLock && locks.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-md text-center">
                    <h2 className="text-2xl font-bold mb-4">Lock Required</h2>
                    <p className="text-[hsl(var(--color-text-muted))] mb-6">
                        You must lock at least one university before accessing Application Guidance.
                    </p>
                    <a href="/shortlist" className="btn btn-primary">
                        Go to Shortlist
                    </a>
                </div>
            </div>
        );
    }

    return children;
}
