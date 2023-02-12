export type GoldenTicket = {
    id: number;
    discord_id : string;
    discord_name : string;
    created_at: string;
    updated_at: string;
    created_by_id : string;
    created_by : string;
    is_spent: boolean;
    spent_at: string;
    deleted_at: string;
}

export type AddTicketParams = {
    discord_id: string;
    discord_name: string;
    created_by_id: string;
    created_by: string;
    remark?: string;
}

export type GetTicketParams = {
    discord_id: string;
    unspent_only?: boolean;
}

export type SpendTicketParams = {
    discord_id: string;
}