import { Stack } from 'expo-router';
import { ScanProvider } from '@/context/ScanContext';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';

export default function RootLayout() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <ScanProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="auth/login" options={{ presentation: 'modal' }} />
                        <Stack.Screen name="auth/register" options={{ presentation: 'modal' }} />
                    </Stack>
                </ScanProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}
