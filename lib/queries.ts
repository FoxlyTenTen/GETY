import { supabase } from '@/lib/supabase';

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const QUERY_KEYS = {
    homeData:       (uid: string)    => ['homeData',       uid]    as const,
    history:        (uid: string)    => ['history',        uid]    as const,
    plans:          (uid: string)    => ['plans',          uid]    as const,
    planDetail:     (scanId: string) => ['planDetail',     scanId] as const,
    notifications:  (uid: string)    => ['notifications',  uid]    as const,
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type HomeData = {
    userName: string;
    latestScan: {
        disease_name: string;
        scanned_at: string;
        risk_level: 'low' | 'medium' | 'high';
        tree_label: string;
    } | null;
    totalScans: number;
    highRiskScan: {
        disease_name: string;
        tree_label: string;
    } | null;
    currentStep: {
        title: string;
        due_date: string | null;
    } | null;
};

export type DbStep = {
    id: string;
    step_order: number;
    title: string;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
};

export type DbPlan = {
    id: string;
    overall_progress: number;
    expert_tip: string | null;
    treatment_plan_steps: DbStep[];
};

export type DbScan = {
    id: string;
    disease_name: string;
    confidence_score: number;
    risk_level: 'low' | 'medium' | 'high';
    image_url: string | null;
    follow_up_days: number;
    scanned_at: string;
    recommendation_json: {
        what_to_do_next?: string[];
        keep_your_farm_safe?: { title: string; desc: string }[];
        follow_up_action?: string;
    } | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
    treatment_plans: DbPlan[];
};

export type MilestoneDbStep = {
    id: string;
    step_order: number;
    title: string;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
    due_date: string | null;
};

export type MilestoneDbPlan = {
    id: string;
    overall_progress: number;
    estimated_recovery_days: number;
    expert_tip: string | null;
    status: 'active' | 'completed' | 'cancelled';
    created_at: string;
    treatment_plan_steps: MilestoneDbStep[];
    scan: {
        id: string;
        disease_name: string;
        risk_level: 'low' | 'medium' | 'high';
        confidence_score: number;
        scanned_at: string;
    } | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
};

export type DetailDbStep = {
    id: string;
    step_order: number;
    title: string;
    description: string | null;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
    due_date: string | null;
    completed_at: string | null;
};

export type DetailDbPlan = {
    id: string;
    title: string;
    overall_progress: number;
    estimated_recovery_days: number;
    recommended_fungicide: string | null;
    water_mix_ratio: string | null;
    expert_tip: string | null;
    status: 'active' | 'completed' | 'cancelled';
    treatment_plan_steps: DetailDbStep[];
    scan: {
        id: string;
        disease_name: string;
        risk_level: 'low' | 'medium' | 'high';
        confidence_score: number;
        scanned_at: string;
    } | null;
    tree: {
        id: string;
        label_name: string;
        latitude: number | null;
        longitude: number | null;
    } | null;
};

// ─── Fetch Functions ────────────────────────────────────────────────────────────

export async function fetchHomeData(userId: string): Promise<HomeData> {
    const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle();

    const { data: { user } } = await supabase.auth.getUser();
    const userName = profile?.full_name || user?.email?.split('@')[0] || 'Farmer';

    const { data: userTrees } = await supabase
        .from('trees')
        .select('id, label_name')
        .eq('user_uid', userId);

    const treeIds = (userTrees ?? []).map((t: { id: string }) => t.id);

    if (treeIds.length === 0) {
        return { userName, latestScan: null, totalScans: 0, highRiskScan: null, currentStep: null };
    }

    const treeLabels: Record<string, string> = {};
    (userTrees ?? []).forEach((t: { id: string; label_name: string }) => {
        treeLabels[t.id] = t.label_name;
    });

    const { data: scans } = await supabase
        .from('scans')
        .select('id, disease_name, scanned_at, risk_level, tree_id')
        .in('tree_id', treeIds)
        .order('scanned_at', { ascending: false });

    const totalScans = scans?.length ?? 0;
    const latest = scans?.[0] ?? null;
    const highRisk = scans?.find((s: any) => s.risk_level === 'high') ?? null;

    const { data: ongoingStep } = await supabase
        .from('treatment_plan_steps')
        .select(`
            id, title, due_date,
            treatment_plan:treatment_plans!inner (
                id, status, tree_id
            )
        `)
        .eq('status', 'ongoing')
        .in('treatment_plans.tree_id', treeIds)
        .limit(1)
        .maybeSingle();

    return {
        userName,
        latestScan: latest ? {
            disease_name: latest.disease_name,
            scanned_at: latest.scanned_at,
            risk_level: latest.risk_level,
            tree_label: treeLabels[latest.tree_id] || 'Unknown Plot',
        } : null,
        totalScans,
        highRiskScan: highRisk ? {
            disease_name: highRisk.disease_name,
            tree_label: treeLabels[highRisk.tree_id] || 'Unknown Plot',
        } : null,
        currentStep: ongoingStep ? {
            title: (ongoingStep as any).title,
            due_date: (ongoingStep as any).due_date,
        } : null,
    };
}

export async function fetchHistory(userId: string): Promise<DbScan[]> {
    const { data: userTrees, error: treeErr } = await supabase
        .from('trees')
        .select('id')
        .eq('user_uid', userId);

    if (treeErr) throw treeErr;
    const treeIds = (userTrees ?? []).map((t: { id: string }) => t.id);

    if (treeIds.length === 0) return [];

    const { data, error: fetchErr } = await supabase
        .from('scans')
        .select(`
            id,
            disease_name,
            confidence_score,
            risk_level,
            image_url,
            follow_up_days,
            scanned_at,
            recommendation_json,
            tree:trees (
                id, label_name, latitude, longitude
            ),
            treatment_plans (
                id, overall_progress, expert_tip,
                treatment_plan_steps (
                    id, step_order, title, status
                )
            )
        `)
        .in('tree_id', treeIds)
        .order('scanned_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    return (data as unknown as DbScan[]) ?? [];
}

export async function fetchPlans(userId: string): Promise<MilestoneDbPlan[]> {
    const { data: userTrees, error: treeErr } = await supabase
        .from('trees')
        .select('id')
        .eq('user_uid', userId);

    if (treeErr) throw treeErr;
    const treeIds = (userTrees ?? []).map((t: { id: string }) => t.id);

    if (treeIds.length === 0) return [];

    const { data, error: fetchErr } = await supabase
        .from('treatment_plans')
        .select(`
            id,
            status,
            overall_progress,
            estimated_recovery_days,
            expert_tip,
            created_at,
            treatment_plan_steps (
                id, step_order, title, status, due_date
            ),
            scan:scans (
                id, disease_name, risk_level, confidence_score, scanned_at
            ),
            tree:trees (
                id, label_name, latitude, longitude
            )
        `)
        .in('tree_id', treeIds)
        .order('created_at', { ascending: false });

    if (fetchErr) throw fetchErr;
    return (data as unknown as MilestoneDbPlan[]) ?? [];
}

export async function fetchPlanDetail(scanId: string): Promise<DetailDbPlan> {
    const { data, error: fetchErr } = await supabase
        .from('treatment_plans')
        .select(`
            id,
            title,
            overall_progress,
            estimated_recovery_days,
            recommended_fungicide,
            water_mix_ratio,
            expert_tip,
            status,
            treatment_plan_steps (
                id, step_order, title, description,
                status, due_date, completed_at
            ),
            scan:scans (
                id, disease_name, risk_level, confidence_score, scanned_at
            ),
            tree:trees (
                id, label_name, latitude, longitude
            )
        `)
        .eq('scan_id', scanId)
        .single();

    if (fetchErr) throw fetchErr;
    return data as unknown as DetailDbPlan;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export type NotificationStep = {
    stepId: string;
    stepTitle: string;
    stepDescription: string | null;
    status: 'locked' | 'upcoming' | 'ongoing' | 'completed';
    due_date: string | null;
    completed_at: string | null;
    planTitle: string;
    diseaseName: string;
    scanId: string;
    treeLabel: string;
    riskLevel: 'low' | 'medium' | 'high';
};

export async function fetchNotifications(userId: string): Promise<NotificationStep[]> {
    // Get all tree IDs for this user
    const { data: trees, error: treesErr } = await supabase
        .from('trees')
        .select('id')
        .eq('user_uid', userId);
    if (treesErr) throw treesErr;
    if (!trees || trees.length === 0) return [];

    const treeIds = trees.map(t => t.id);

    const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
            id,
            title,
            status,
            scan:scans ( id, disease_name, risk_level ),
            tree:trees ( label_name ),
            treatment_plan_steps (
                id, title, description, status, due_date, completed_at
            )
        `)
        .in('tree_id', treeIds)
        .order('created_at', { ascending: false });

    if (error) throw error;

    const steps: NotificationStep[] = [];
    for (const plan of data ?? []) {
        const scan = plan.scan as any;
        const tree = plan.tree as any;
        for (const step of (plan.treatment_plan_steps as any[]) ?? []) {
            steps.push({
                stepId: step.id,
                stepTitle: step.title,
                stepDescription: step.description ?? null,
                status: step.status,
                due_date: step.due_date ?? null,
                completed_at: step.completed_at ?? null,
                planTitle: plan.title,
                diseaseName: scan?.disease_name ?? 'Unknown',
                scanId: scan?.id ?? '',
                treeLabel: tree?.label_name ?? 'Unknown Plot',
                riskLevel: scan?.risk_level ?? 'low',
            });
        }
    }

    // Sort: overdue first, then by due_date ascending
    return steps.sort((a, b) => {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
        return da - db;
    });
}
