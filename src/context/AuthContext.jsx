import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);

            // Save token to localStorage for API calls
            if (session?.access_token) {
                localStorage.setItem('supabase.auth.token', session.access_token);
            }

            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'PASSWORD_RECOVERY') {
                // Determine base URL to handle production/dev differences
                const baseUrl = window.location.origin;
                window.location.href = `${baseUrl}/update-password`;
                return;
            }

            if (session?.access_token) {
                localStorage.setItem('supabase.auth.token', session.access_token);
            } else {
                localStorage.removeItem('supabase.auth.token');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, name) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name }
            }
        });

        if (error) throw error;

        // Create user record in database
        if (data.user) {
            const { error: dbError } = await supabase
                .from('users')
                .insert({
                    email: data.user.email,
                    supabase_user_id: data.user.id,
                    name: name
                });

            if (dbError) console.error('Failed to create user record:', dbError);
        }

        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    };

    const signInWithGoogle = () => {
        return new Promise((resolve, reject) => {
            const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

            if (!googleClientId) {
                reject(new Error('Google Client ID not configured'));
                return;
            }

            // Wait for Google Identity Services to load
            const waitForGoogle = () => {
                if (window.google?.accounts?.id) {
                    initGoogleSignIn();
                } else {
                    setTimeout(waitForGoogle, 100);
                }
            };

            const initGoogleSignIn = () => {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response) => {
                        try {
                            // Use the ID token from Google to sign in with Supabase
                            const { data, error } = await supabase.auth.signInWithIdToken({
                                provider: 'google',
                                token: response.credential,
                            });

                            if (error) {
                                reject(error);
                                return;
                            }
                            resolve(data);
                        } catch (err) {
                            reject(err);
                        }
                    },
                    auto_select: false,
                    context: 'signin',
                });

                // Trigger the Google One Tap / popup
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed()) {
                        // If One Tap is not displayed (e.g., user dismissed before),
                        // fall back to the button-based flow
                        const btnDiv = document.createElement('div');
                        btnDiv.id = 'google-signin-btn-hidden';
                        btnDiv.style.position = 'fixed';
                        btnDiv.style.top = '50%';
                        btnDiv.style.left = '50%';
                        btnDiv.style.transform = 'translate(-50%, -50%)';
                        btnDiv.style.zIndex = '10000';
                        document.body.appendChild(btnDiv);

                        window.google.accounts.id.renderButton(btnDiv, {
                            type: 'standard',
                            theme: 'filled_black',
                            size: 'large',
                            text: 'signin_with',
                            shape: 'pill',
                            width: 300,
                        });

                        // Auto-click the rendered button
                        setTimeout(() => {
                            const btn = btnDiv.querySelector('div[role="button"]');
                            if (btn) btn.click();
                            // Clean up after a delay
                            setTimeout(() => btnDiv.remove(), 30000);
                        }, 100);
                    }
                });
            };

            waitForGoogle();
        });
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        localStorage.removeItem('supabase.auth.token');
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/update-password`,
        });
        if (error) throw error;
        return data;
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
        return data;
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
