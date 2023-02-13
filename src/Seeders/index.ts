import { getInsertQuery, getUTCDatetime } from '../../utils';
import DB from '../DB';

export const seedAdmins = async() => {
    let db = new DB();
    let table = 'admins';
    let checkerQuery = `SELECT COUNT(*) as count FROM ${table}`;
    let checkerRes = await db.executeQueryForResults<{count: number}>(checkerQuery);

    if(checkerRes && checkerRes[0].count > 0) {
        console.log(`${table} already seeded! Skipping..`);
        return;
    }
    let now = getUTCDatetime();
    let columns = ['discord_id', 'added_by', 'added_by_id', 'added_at'];
    let values = [
        ['299884555211636736', 'Kida', '1', now],
    ];

    let query = getInsertQuery(columns, values, table);
    try {
        await db.executeQuery(query);
        console.log(`Seeded ${table}`);
        return true;
    }

    catch {
        return false;
    }
}