import DB from '../DB';
import { AddAdminParams, RemoveAdminParams } from './types';
import { getInsertQuery, getUTCDatetime, isCurrentUserAdmin } from '../../utils';

export const addAdmin = async({ discord_id, discord_name, added_by_id, added_by }: AddAdminParams) => {
    let isAdmin = await isCurrentUserAdmin(added_by_id);
    if(!isAdmin) {
        return "Unauthorized!";
    }
    let isNewUserAdmin = await isCurrentUserAdmin(discord_id);
    if(isNewUserAdmin) {
        return "User is already an admin!";
    }

    let db = new DB();

    let now = getUTCDatetime();
    let table = 'admins';
    let columns = ['discord_id', 'added_by_id', 'added_by', 'added_at'];
    let values: any[][] = [];

    values.push([discord_id, added_by_id, added_by, now]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error occurred";
    }

    return `Added ${discord_name} as admin`;
}

export const removeAdmin = async({ discord_id, discord_name, removed_by_id }: RemoveAdminParams) => {
    let isAdmin = await isCurrentUserAdmin(removed_by_id);
    if(!isAdmin) {
        return "Unauthorized!";
    }

    let db = new DB();
    let query = `delete from admins where discord_id = '${discord_id}'`;
    let isSuccess = await db.executeQuery(query);

    if(!isSuccess) {
        return "Error occurred";
    }

    return `Removed ${discord_name}'s admin privileges.`;
}