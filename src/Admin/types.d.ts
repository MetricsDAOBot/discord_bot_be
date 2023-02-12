export type AddAdminParams = {
    discord_id: string;
    added_by_id: string;
    added_by: string;
}

export type RemoveAdminParams = {
    discord_id: string;
    remove_by_id: string;
}

export type Admin = {
    id: number;
    discord_id: string;
    added_by: string;
    added_at: string;
}