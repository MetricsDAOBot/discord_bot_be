import { getInsertQuery, getUTCDatetime, isCurrentUserAdmin } from '../../utils';
import DB from '../DB';
import { AddTicketParams, GetTicketParams, GoldenTicket, SpendTicketParams } from './types';

export const addTicket = async({ discord_id, discord_name, created_by_id, created_by }: AddTicketParams) => {
    let isAdmin = await isCurrentUserAdmin(created_by_id);
    if(!isAdmin) {
        return "Unauthorized!";
    }

    let db = new DB();
    let now = getUTCDatetime();

    let table = 'golden_tickets';
    let columns = ['discord_id', 'discord_name', 'created_at', 'updated_at', 'created_by', 'created_by_id'];
    let values: any[][] = [];

    values.push([discord_id, discord_name, now, now, created_by, created_by_id]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error occurred";
    }

    return "Success";
}

export const getUserTickets = async({ discord_id, unspent_only }: GetTicketParams) => {
    let db = new DB();
    let query = `select * from golden_tickets where discord_id = '${discord_id}' and deleted_at is null`;
    if(unspent_only) {
        query += ` and is_spent = False`;
    }

    let tickets = await db.executeQueryForResults<GoldenTicket>(query);
    return tickets;
}

/** unused */
/* export const spendTicket = async({ discord_id }: SpendTicketParams) => {
    let db = new DB();
    let tickets = await getUserTickets({ discord_id, unspent_only: true });
    if(!tickets || tickets.length === 0) {
        return "You're out of Golden Tickets";
    }

    let now = getUTCDatetime();
    let query = `update golden_tickets set is_spent = True and spent_at = '${now}' and updated_at = '${now}';`;
    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error";
    }

    return "Success";
} */

/* export const removeTicket = async() => {

} */