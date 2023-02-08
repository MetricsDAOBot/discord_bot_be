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
                discord_id int not null,
                dicord_name text not null,
                created_at timestamp not null,
                updated_at timestamp not null,
                is_regrading boolean not null default false,

                -- submission by user
                submission text,
                grader_feedback text,
                expected_score smallint,
                reason text,

                -- submission by regrader
                regraded_by text,
                regraded_at timestamp,
                regraded_score smallint,
                regraded_reason text
            );`,
        rollback_query: `DROP TABLE regrade_requests;`
    },
];