import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';

export default function NavigationLayout({ children, showBackButton = false, onBack = null }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut } = useAuth();
    const { profile, stage, locks } = useProfile();

    const handleBack = () => {
        if (onBack) {
            onBack(); // Allow custom back handler (for save)
        } else {
            navigate(-1); // Default: browser back
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const navItems = [
        { path: '/dashboard', label: '🏠 Dashboard', icon: '🏠' },
        { path: '/discover', label: '🔍 Discover', icon: '🔍' },
        { path: '/shortlist', label: '⭐ Shortlist', icon: '⭐' },
        { path: '/ai-counsellor', label: '🤖 AI Counsellor', icon: '🤖' },
        ...(locks?.length > 0 ? [{ path: '/application-guidance', label: '📝 Applications', icon: '📝' }] : []),
        { path: '/profile/edit', label: '👤 Profile', icon: '👤' }
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex h-screen bg-[hsl(var(--color-bg))]">
            {/* Sidebar */}
            <div className="w-64 bg-[hsl(var(--color-bg-secondary))] border-r border-[hsl(var(--color-border))] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-[hsl(var(--color-border))]">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-[hsl(var(--color-primary))] to-[hsl(var(--color-secondary))] bg-clip-text text-transparent">
                        Study Abroad
                    </h1>
                    <p className="text-xs text-[hsl(var(--color-text-muted))] mt-1">
                        Stage {stage}: {['Building Profile', 'Discovering', 'Finalizing', 'Applications'][stage - 1]}
                    </p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive(item.path)
                                ? 'bg-[hsl(var(--color-primary))]/10 text-[hsl(var(--color-primary))] font-medium'
                                : 'text-[hsl(var(--color-text-muted))] hover:bg-[hsl(var(--color-bg))]/50 hover:text-[hsl(var(--color-text))]'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            <span className="text-sm">{item.label.replace(/^.+?\s/, '')}</span>
                        </Link>
                    ))}
                </nav>

                {/* User Info & Logout */}
                <div className="p-4 border-t border-[hsl(var(--color-border))]">
                    <div className="mb-3 p-3 card">
                        <div className="text-xs text-[hsl(var(--color-text-muted))]">Profile Strength</div>
                        <div className="text-sm font-medium text-[hsl(var(--color-primary))]">
                            {profile?.profile_complete ? '✅ Complete' : '⚠️ Incomplete'}
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full btn btn-secondary text-sm"
                    >
                        🚪 Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Back Button (if enabled) */}
                {showBackButton && (
                    <div className="bg-[hsl(var(--color-bg-secondary))] border-b border-[hsl(var(--color-border))] px-6 py-3">
                        <button
                            onClick={handleBack}
                            className="btn btn-secondary btn-sm"
                        >
                            ← Back
                        </button>
                    </div>
                )}

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
