import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import OnboardingPage from './pages/OnboardingPage';
import Dashboard from './pages/Dashboard';
import AICounsellorPage from './pages/AICounsellorPage';
import UniversityDiscoveryPage from './pages/UniversityDiscoveryPage';
import ShortlistPage from './pages/ShortlistPage';
import ApplicationGuidancePage from './pages/ApplicationGuidancePage';
import ProfileEditPage from './pages/ProfileEditPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <AuthProvider>
                    <ProfileProvider>
                        <ToastProvider>
                            <Routes>
                                {/* Public routes */}
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/signup" element={<SignupPage />} />
                                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                <Route path="/update-password" element={<UpdatePasswordPage />} />


                                {/* Protected routes */}
                                <Route path="/onboarding" element={
                                    <ProtectedRoute>
                                        <OnboardingPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/dashboard" element={
                                    <ProtectedRoute requireProfile>
                                        <Dashboard />
                                    </ProtectedRoute>
                                } />

                                <Route path="/ai-counsellor" element={
                                    <ProtectedRoute requireProfile>
                                        <AICounsellorPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/discover" element={
                                    <ProtectedRoute requireProfile>
                                        <UniversityDiscoveryPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/shortlist" element={
                                    <ProtectedRoute requireProfile>
                                        <ShortlistPage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/application-guidance" element={
                                    <ProtectedRoute requireProfile requireLock>
                                        <ApplicationGuidancePage />
                                    </ProtectedRoute>
                                } />

                                <Route path="/profile/edit" element={
                                    <ProtectedRoute>
                                        <ProfileEditPage />
                                    </ProtectedRoute>
                                } />

                                {/* Catch all */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </ToastProvider>
                    </ProfileProvider>
                </AuthProvider>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
