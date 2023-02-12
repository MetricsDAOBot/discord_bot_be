export type RegradeRequest = {
    id: number;
    discord_id: string;
    discord_name: string;
    created_at: string;
    updated_at: string;
    is_regrading: bool;
    uuid: string;

    submission: string | null;
    grader_feedback: string | null;
    current_score: number | null;
    expected_score: number | null;
    reason: string | null; // reason to get expected score

    regraded_by_id: number | null;
    regraded_by: string | null;
    regraded_at: string | null;
    regraded_score: number | null;
    regraded_reason: string | null;

    deleted_at: string | null;
}

export type UpdateRegradeRequestByUserParams = {
    uuid: string;

    submission: string | null;
    grader_feedback: string | null;
    current_score: number | null;
    expected_score: number | null;
    reason: string | null; // reason to get expected score
}

export type AssignGraderToRegradeRequestParams = {
    uuid: string;

    discord_id: number;
    discord_name: string;
}

export type UpdateRegradeRequestByGraderParams = {
    uuid: string;

    regraded_score: number | null;
    regraded_reason: string | null;
}

export type ApproveRegradeRequestByAdminParams = {
    uuid: string;

    discord_id: string;
    discord_name: string;
}