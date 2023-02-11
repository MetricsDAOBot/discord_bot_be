import DB from '../DB';
import { randomUUID } from 'crypto';
import { checkIsValidUUID, getInsertQuery, getUTCDatetime, } from '../../utils';
import { AssignGraderToRegradeRequestParams, RegradeRequest, UpdateRegradeRequestByGraderParams, UpdateRegradeRequestByUserParams } from './types';
import { getUserTickets } from '../GoldenTicket';
import moment from 'moment';

export const newRegradeRequest = async(discordId: string, discordName: string) => {
    let db = new DB();

    let tickets = await getUserTickets({ discord_id: discordId, unspent_only: true });
    if(!tickets || tickets.length === 0) {
        return "You're out of Golden Tickets";
    }

    let now = getUTCDatetime();
    let updateGoldenTicketQuery = `update golden_tickets set is_spent = TRUE, spent_at = '${now}', updated_at = '${now}' where id = ${tickets[0].id};`;
    let isSuccess = await db.executeQuery(updateGoldenTicketQuery);
    if(!isSuccess) {
        return "Error";
    }

    let uuid = randomUUID();
    let table = 'regrade_requests';
    let columns = ['discord_id', 'discord_name', 'created_at', 'updated_at', 'uuid'];
    let values: any[][] = [];

    values.push([discordId, discordName, now, now, uuid]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    await db.executeQueryForSingleResult(query);
    return uuid;
}

export const getRegradeRequests = async(onlyActive = true) => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null`;

    if(onlyActive) {
        query += ' and regraded_at is null and is_regrading = False';
    }
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getRegradeRequestsForUser = async(discordId: string) => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null and discord_id = ${discordId}`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getRegradeRequest = async(uuid: string) => {
    let db = new DB();

    if(!checkIsValidUUID(uuid)) {
        return [];
    }

    let query = `select * from regrade_requests where uuid = '${uuid}'`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const updateRegradeRequestByUser = async(updateRequest: UpdateRegradeRequestByUserParams) => {
    let db = new DB();

    let {
        uuid,

        submission,
        grader_feedback,
        expected_score,
        current_score,
        reason
    } = updateRequest;

    let requests = await getRegradeRequest(uuid);
    if(requests.length === 0) {
        return "Unable to find request";
    }

    if(!moment(requests[0].created_at).isSame(requests[0].updated_at)) {
        return "Unable to update request";
    }

    let now = getUTCDatetime();
    let query = `update regrade_requests 
                 set submission = '${submission}', 
                     grader_feedback = '${grader_feedback}', 
                     expected_score = ${expected_score}, 
                     current_score = ${current_score}, 
                     reason = '${reason}',
                     updated_at = '${now}'
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

export const assignGraderToRequest = async(updateRequest: AssignGraderToRegradeRequestParams) => {
    let db = new DB();

    let {
        uuid,

        discord_id,
        discord_name
    } = updateRequest;

    let query = `update regrade_requests 
                 set discord_id = '${discord_id}', 
                     discord_name = '${discord_name}',
                     is_regrading = True
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

export const unassignGraderForRequest = async(uuid: string) => {
    let db = new DB();

    let query = `update regrade_requests 
                 set regraded_by = null, 
                     regraded_by_id = null,
                     is_regrading = False
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

export const updateRegradeRequestByGrader = async(updateRequest: UpdateRegradeRequestByGraderParams) => {
    let db = new DB();

    let {
        uuid,

        regraded_score,
        regraded_reason,
    } = updateRequest;

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set regraded_score = '${regraded_score}', 
                     regraded_reason = '${regraded_reason}',
                     regraded_at = '${now}'
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}