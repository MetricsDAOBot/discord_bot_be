import DB from '../DB';
import { AddAdminParams, RemoveAdminParams } from './types';
import { getInsertQuery, isCurrentUserAdmin } from '../../utils';

export const addAdmin = async({ discord_id, added_by_id, added_by }: AddAdminParams) => {
    let isAdmin = await isCurrentUserAdmin(added_by_id);
    if(!isAdmin) {
        return "Unauthorized!";
    }

    let db = new DB();

    let table = 'admins';
    let columns = ['discord_id', 'added_by_id', 'added_by'];
    let values: any[][] = [];

    values.push([discord_id, added_by_id, added_by]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error occurred";
    }

    return "Success";
}

export const removeAdmin = async({ discord_id, remove_by_id }: RemoveAdminParams) => {
    let isAdmin = await isCurrentUserAdmin(remove_by_id);
    if(!isAdmin) {
        return "Unauthorized!";
    }

    let db = new DB();
    let query = `delete from admins where discord_id = '${discord_id}'`;
    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error occurred";
    }

    return "Success";
}