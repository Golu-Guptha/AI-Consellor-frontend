export default function LoadingSpinner({ fullScreen = false, message = 'Loading...' }) {
    if (fullScreen) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[hsl(var(--color-bg))] to-[hsl(var(--color-bg-secondary))]">
                <div className="spinner mb-4"></div>
                <p className="text-[hsl(var(--color-text-muted))]">{message}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
            <div className="spinner"></div>
            <p className="text-[hsl(var(--color-text-muted))] text-sm animate-pulse">{message}</p>
        </div>
    );
}
