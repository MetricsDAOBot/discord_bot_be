import DB from '../DB';
import { randomUUID } from 'crypto';
import { isValidUUID, getInsertQuery, getUTCDatetime, isCurrentUserAdmin, } from '../../utils';
import { AddRegradeRequestByUserParams, ApproveRegradeRequestByAdminParams, AssignGraderToRegradeRequestParams, PendingApprovalsParams, RegradeRequest, UpdateRegradeRequestByGraderParams, UpdateRegradeRequestByUserParams } from './types';
import { addTicket, getUserTickets } from '../GoldenTicket';
import moment from 'moment';

export const newRegradeRequest = async(addRequest: AddRegradeRequestByUserParams) => {
    let db = new DB();

    let { discord_id, discord_name, submission, grader_feedback, expected_score, current_score, reason } = addRequest;
    let tickets = await getUserTickets({ discord_id, unspent_only: true });
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
    let columns = ['discord_id', 'discord_name', 'created_at', 'updated_at', 'uuid', 'submission', 'grader_feedback', 'expected_score', 'current_score', 'reason'];
    let values: any[][] = [];

    values.push([discord_id, discord_name, now, now, uuid, submission, grader_feedback, expected_score, current_score, reason]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    await db.executeQueryForSingleResult(query);
    return uuid;
}

export const getRegradeRequests = async(onlyActive = true, excludeId = "") => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null`;

    if(onlyActive) {
        query += ' and regraded_at is null and is_regrading = False';
    }

    if(excludeId) {
        query += ` and discord_id <> '${excludeId}'`;

    }

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getCurrentRequestForGrader = async(discord_id: string) => {
    let db = new DB();

    let query = `select * from regrade_requests 
                        where deleted_at is null
                        and regraded_at is null 
                        and is_regrading = true
                        and regraded_by_id = '${discord_id}'
                        and regraded_score is null
                        and regraded_reason is null`;

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getRegradeRequestsForUser = async(discordId: string, page: number) => {
    let db = new DB();

    let query = `select * from regrade_requests 
                        where deleted_at is null 
                            and discord_id = '${discordId}'
                        order by created_at
                        limit 2 offset ${page}`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getRegradeRequest = async(uuid: string) => {
    let db = new DB();

    if(!isValidUUID(uuid)) {
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
        // uuid,

        discord_id,
        discord_name
    } = updateRequest;

    let currentRequests = await getCurrentRequestForGrader(discord_id);
    if(currentRequests.length > 0) {
        return currentRequests[0];
    }

    let requests = await getRegradeRequests(true, discord_id);
    if(requests.length === 0) {
        return "No regrade requests found!";
    }

    let now = getUTCDatetime();
    let query = `update regrade_requests 
                 set regraded_by_id = '${discord_id}', 
                     regraded_by = '${discord_name}',
                     is_regrading = True,
                     updated_at = '${now}'
                 where uuid = '${requests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return requests[0];
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

    let regradeRequests = await getRegradeRequest(uuid);
    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(regradeRequests[0].regraded_score) {
        return "Already regraded";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set regraded_score = '${regraded_score}', 
                     regraded_reason = '${regraded_reason}',
                     regraded_at = '${now}',
                     is_regrading = false
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

export const approveRegradeRequest = async(approveRequest: ApproveRegradeRequestByAdminParams) => {
    let db = new DB();

    let {
        uuid,

        discord_id,
        discord_name,
    } = approveRequest;

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests = await getRegradeRequest(uuid);
    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(regradeRequests[0].approved_at) {
        return "Already approved";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set approved_by = '${discord_name}', 
                     approved_by_id = '${discord_id}',
                     approved_at = '${now}'
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    await addTicket({
        discord_id: regradeRequests[0].regraded_by_id!, // regrade request user
        discord_name: regradeRequests[0].regraded_by!,
        created_by: discord_name, // admin
        created_by_id: discord_id,
        remark: `Reviewed request ${uuid}`,
    });

    return "Approved";
}

export const getPendingApprovals = async({ discord_id, page}: PendingApprovalsParams) => {
    let db = new DB();
    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let query = `select * from regrade_requests 
                            where deleted_at is null
                            and is_regrading = false
                            and regraded_score is not null
                            and approved_by_id is null`;

    // limit 2 to check if there's another approval after this
    query += ` order by created_at limit 2 offset ${page};`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}