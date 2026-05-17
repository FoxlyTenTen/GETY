import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScanProvider } from '@/context/ScanContext';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, scheduleStepNotifications } from '@/lib/notifications';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 5 * 60 * 1000, retry: 1 },
    },
});

export default function RootLayout() {
    useEffect(() => {
        (async () => {
            const granted = await requestNotificationPermission();
            if (!granted) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: trees } = await supabase
                .from('trees')
                .select('id')
                .eq('user_uid', user.id);
            if (!trees || trees.length === 0) return;

            const treeIds = trees.map((t: any) => t.id);

            const { data: plans } = await supabase
                .from('treatment_plans')
                .select(`
                    title,
                    treatment_plan_steps ( id, title, due_date, status ),
                    tree:trees ( label_name )
                `)
                .in('tree_id', treeIds)
                .eq('status', 'active');

            for (const plan of plans ?? []) {
                const steps = ((plan as any).treatment_plan_steps ?? [])
                    .filter((s: any) => s.status !== 'completed');
                await scheduleStepNotifications(
                    steps,
                    (plan as any).title,
                    (plan as any).tree?.label_name ?? 'Your plot',
                );
            }
        })();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <LanguageProvider>
                <AuthProvider>
                    <ScanProvider>
                        <Stack screenOptions={{ headerShown: false }}>
                            <Stack.Screen name="(tabs)" />
                            <Stack.Screen name="pages/notifications" />
                            <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
                            <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
                        </Stack>
                    </ScanProvider>
                </AuthProvider>
            </LanguageProvider>
        </QueryClientProvider>
    );
}
