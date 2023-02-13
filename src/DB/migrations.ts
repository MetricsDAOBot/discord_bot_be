export default [
    {
        id: 1,
        query: `
            CREATE TABLE migrations (
                id serial PRIMARY KEY,
                migration_id int UNIQUE not null,
                migration_group int not null,
                migrated_at timestamp not null
            );`,
        rollback_query: `DROP TABLE migrations;`
    },
    {
        id: 2,
        query: `
            CREATE TABLE regrade_requests (
                id serial PRIMARY KEY,
                discord_id text not null,
                discord_name text not null,
                created_at timestamp not null,
                updated_at timestamp not null,
                is_regrading boolean not null default false,
                uuid text not null,

                -- submission by user
                submission text,
                grader_feedback text,
                expected_score smallint,
                current_score smallint,
                reason text,

                -- submission by regrader
                regraded_by text,
                regraded_by_id text,
                regraded_at timestamp,
                regraded_score smallint,
                regraded_reason text,

                --approvals
                approved_by text,
                approved_by_id text,
                approved_at timestamp,

                -- others
                deleted_at timestamp
            );`,
        rollback_query: `DROP TABLE regrade_requests;`
    },
    {
        id: 3,
        query: `
            CREATE TABLE golden_tickets (
                id serial PRIMARY KEY,
                discord_id text not null,
                discord_name text not null,
                created_at timestamp not null,
                updated_at timestamp not null,
                created_by_id text not null,
                created_by text not null,
                remark text not null,
                
                -- spending
                is_spent boolean not null default false,
                spent_at timestamp,

                -- others
                deleted_at timestamp
            );`,
        rollback_query: `DROP TABLE golden_tickets;`
    },
    {
        id: 4,
        query: `
            CREATE TABLE admins (
                id serial PRIMARY KEY,
                discord_id text not null,
                added_by_id text not null,
                added_by text not null,
                added_at timestamp not null
            );`,
        rollback_query: `DROP TABLE admins;`
    },
];