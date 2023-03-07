export type RegradeRequest = {
    id: number;
    discord_id: string;
    discord_name: string;
    created_at: string;
    updated_at: string;
    is_regrading: bool;
    uuid: string;

    blockchain: string | null;
    question: string | null;
    thread_id: string | null;
    submission: string | null;
    grader_feedback: string | null;
    current_score: string | null;
    expected_score: string | null;
    reason: string | null; // reason to get expected score

    regraded_by_id: string | null;
    regraded_by: string | null;
    regraded_at: string | null;
    regraded_score: number | null;
    regraded_reason: string | null;

    approved_at: string | null;
    approved_by: string | null;
    approved_by_id: string | null;

    deleted_at: string | null;
}

export type RegradeRequestCSV = RegradeRequest & { is_admin: boolean }

export type AddRegradeRequestByUserParams = {
    discord_id: string;
    discord_name: string;

    submission: string | null;
    grader_feedback: string | null;
    current_score: string | null;
    expected_score: string | null;
    reason: string | null; // reason to get expected score
    blockchain: string | null;
    question: string | null;
}
export type AssignThreadIdParams = {
    uuid: string;
    thread_id: string;
}

export type UpdateRegradeRequestByUserParams = {
    uuid: string;

    submission: string | null;
    grader_feedback: string | null;
    current_score: string | null;
    expected_score: string | null;
    reason: string | null; // reason to get expected score
}

export type AssignGraderToRegradeRequestParams = {
    // uuid: string;

    discord_id: string;
    discord_name: string;
}

export type UpdateRegradeRequestByGraderParams = {
    uuid: string;

    regraded_by_id: string;
    regraded_score: string | null;
    regraded_reason: string | null;
}

export type ApproveRegradeRequestByAdminParams = {
    uuid: string;

    discord_id: string;
    discord_name: string;
}

export type PendingApprovalsParams = {
    discord_id: string;
    page: string;
}