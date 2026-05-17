import * as Notifications from 'expo-notifications';

// Show alerts even when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermission(): Promise<boolean> {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

export type SchedulableStep = {
    id: string;
    title: string;
    due_date: string | null;
};

// Schedule two notifications per step:
//   • Evening before due date at 8 PM  → "Tomorrow: [step]"
//   • Morning of due date at 8 AM      → "Due Today: [step]"
// Uses step.id as the identifier so re-scheduling is idempotent.
export async function scheduleStepNotifications(
    steps: SchedulableStep[],
    planTitle: string,
    treeLabel: string,
): Promise<void> {
    const now = new Date();

    for (const step of steps) {
        if (!step.due_date) continue;
        const due = new Date(step.due_date);

        // Day-before reminder at 8 PM
        const dayBefore = new Date(due);
        dayBefore.setDate(dayBefore.getDate() - 1);
        dayBefore.setHours(20, 0, 0, 0);
        if (dayBefore > now) {
            await Notifications.scheduleNotificationAsync({
                identifier: `step-before-${step.id}`,
                content: {
                    title: `🌿 Tomorrow: ${step.title}`,
                    body: `${planTitle} at ${treeLabel} — due tomorrow`,
                    data: { stepId: step.id },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayBefore },
            });
        }

        // Day-of reminder at 8 AM
        const dayOf = new Date(due);
        dayOf.setHours(8, 0, 0, 0);
        if (dayOf > now) {
            await Notifications.scheduleNotificationAsync({
                identifier: `step-due-${step.id}`,
                content: {
                    title: `🚨 Due Today: ${step.title}`,
                    body: `${planTitle} at ${treeLabel} — action required today`,
                    data: { stepId: step.id },
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayOf },
            });
        }
    }
}

export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}
