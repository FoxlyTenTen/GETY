import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    loading: boolean;
    userRole: string | null;
    isAdmin: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    loading: true,
    userRole: null,
    isAdmin: false,
    signOut: async () => {},
});

async function fetchUserRole(userId: string): Promise<string | null> {
    const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
    return data?.role ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load existing session on mount
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                const role = await fetchUserRole(session.user.id);
                setUserRole(role);
            }
            setLoading(false);
        });

        // Listen for auth state changes (login / logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session);
                if (session?.user) {
                    const role = await fetchUserRole(session.user.id);
                    setUserRole(role);
                } else {
                    setUserRole(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setUserRole(null);
    };

    const isAdmin = userRole === 'admin';

    return (
        <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, userRole, isAdmin, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
