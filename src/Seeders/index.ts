import { getInsertQuery, getUTCDatetime } from '../../utils';
import DB from '../DB';

/**
 * Seeds the admins when using npm run seed or drop:seed or migrate:seed
 * 
 * @returns boolean
 */
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

    // edit values here to add seed admins
    // first value = discord id, second value = Added by discord name
    let values = [
        ['299884555211636736', 'Kida', '1', now], // Kida
        ['828115529394815037', 'Kida', '1', now], // GJ
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