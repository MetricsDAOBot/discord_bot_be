import DB from '../DB';
import { randomUUID } from 'crypto';
import { isValidUUID, getInsertQuery, getUTCDatetime, isCurrentUserAdmin, } from '../../utils';
import { AddRegradeRequestByUserParams, ApproveRegradeRequestByAdminParams, AssignGraderToRegradeRequestParams, AssignThreadIdParams, MarkAsNoPaymentParams, MarkAsPaidParams, PendingApprovalsParams, RegradeRequest, RegradeRequestCSV, UpdateRegradeRequestByGraderParams, UpdateRegradeRequestByUserParams } from './types';
import { addTicket, getUserTickets } from '../GoldenTicket';
import moment from 'moment';

/**
 * Adds a new regrade request. Will check if user has tickets before opening a new ticket.
 * Used in /new_regrade_request
 * 
 * @param addRequest 
 * @returns string
 */
export const newRegradeRequest = async(addRequest: AddRegradeRequestByUserParams) => {
    let db = new DB();

    let { discord_id, discord_name, submission, grader_feedback, expected_score, current_score, reason, blockchain, bounty_name } = addRequest;
    console.log({ discord_id, discord_name, submission, grader_feedback, expected_score, current_score, reason, blockchain, bounty_name });

    let tickets = await getUserTickets({ discord_id, unspent_only: true });
    if(!tickets || tickets.length === 0) {
        return "You're out of Golden Tickets";
    }

    //escape apostrophe
    blockchain = blockchain!.replace(/'/g, "''");
    bounty_name = bounty_name!.replace(/'/g, "''");
    expected_score = expected_score!.replace(/'/g, "''");
    current_score = current_score!.replace(/'/g, "''");
    discord_name = discord_name.replace(/'/g, "''");
    grader_feedback = grader_feedback?.replace(/'/g, "''") ?? "";
    reason = reason?.replace(/'/g, "''") ?? "";

    let now = getUTCDatetime();
    let updateGoldenTicketQuery = `update golden_tickets set is_spent = TRUE, spent_at = '${now}', updated_at = '${now}' where id = ${tickets[0].id};`;
    let isSuccess = await db.executeQuery(updateGoldenTicketQuery);
    if(!isSuccess) {
        return "Error";
    }

    // uuid is to fetch requests, id is not used to prevent people from guessing their request numbers
    // however this is unused and the idea is scrapped, uuid is kept so that it can be used if needed in the future
    let uuid = randomUUID();
    let table = 'regrade_requests';
    let columns = ['discord_id', 'discord_name', 'created_at', 'updated_at', 'uuid', 'submission', 'grader_feedback', 'expected_score', 'current_score', 'reason', 'blockchain', 'bounty_name'];
    let values: any[][] = [];

    values.push([discord_id, discord_name, now, now, uuid, submission, grader_feedback, expected_score, current_score, reason, blockchain, bounty_name]);

    let query = getInsertQuery(columns, values, table);
    query = `${query.replace(';', '')} returning id;`;

    await db.executeQueryForSingleResult(query);
    return uuid;
}

/**
 * Returns all regrade requests. is_admin column = true if the requester is an admin, info is only useful for the bot. 
 * Since only the bot can access the endpoints, no leaks should happen. 
 * However, if ever this endpoint is exposed, the is_admin column may be redundant.
 * 
 * Used in /all_requests
 * 
 * @param discord_id 
 * @returns RegradeRequest[]
 */
export const getRegradeRequestsCSV = async(discord_id: string) => {
    let db = new DB();

    let isAdmin = await isCurrentUserAdmin(discord_id);

    let query = `select *, ${isAdmin? 'true' : 'false'} as is_admin from regrade_requests where deleted_at is null`;

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequestCSV>(query);
    return regradeRequest ?? [];
}

/**
 * Returns only open regrade requests.
 * 
 * Used in /all_requests
 * 
 * @param discord_id 
 * @returns RegradeRequest[]
 */
export const getOpenRegradeRequests = async() => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null and approved_at is null`;

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

export const getRegradeRequestsWithoutThread = async() => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null and thread_id is null`;

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

/**
 * @param onlyActive 
 * @param excludeId 
 * @returns RegradeRequest[]
 */
export const getRegradeRequests = async(onlyActive = true, excludeId = "") => {
    let db = new DB();

    let query = `select * from regrade_requests where deleted_at is null`;

    if(onlyActive) {
        query += ' and regraded_at is null and is_regrading = False';
    }

    // excludes certain discord id
    if(excludeId) {
        query += ` and discord_id <> '${excludeId}'`;
    }

    query += ' order by created_at;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

/**
 * Returns the request the grader is currently reviewing.
 * 
 * @param discord_id 
 * @returns RegradeRequest[]
 */
export const getCurrentRequestForGrader = async(discord_id: string) => {
    let db = new DB();

    let query = `select * from regrade_requests 
                        where deleted_at is null
                        and regraded_at is null 
                        and is_regrading = true
                        and regraded_by_id = '${discord_id}'
                        and regraded_score is null
                        and regraded_reason is null`;

    query += ' order by created_at desc;';
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

/**
 * Returns the regrade requests for a discord user.
 * Used in /my_requests
 * 
 * @param discordId 
 * @param page 
 * @returns RegradeRequest[]
 */
export const getRegradeRequestsForUser = async(discordId: string, page: number = -1) => {
    let db = new DB();

    let query = `select * from regrade_requests 
                        where deleted_at is null 
                            and discord_id = '${discordId}'
                        order by created_at desc`;

    if(page > -1) {
        query += ` limit 2 offset ${page}`;
    }
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

/**
 * Gets a specific request by uuid
 * 
 * @param uuid 
 * @returns RegradeRequest[]
 */
export const getRegradeRequest = async(uuid: string) => {
    let db = new DB();

    if(!isValidUUID(uuid)) {
        return [];
    }

    let query = `select * from regrade_requests where uuid = '${uuid}'`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}


/**
 * Gets a specific request by thread_id
 * 
 * @param uuid 
 * @returns RegradeRequest[]
 */
export const getRegradeRequestByThreadID = async(threadId: string) => {
    let db = new DB();

    let query = `select * from regrade_requests where thread_id = '${threadId}'`;
    let regradeRequest = await db.executeQueryForResults<RegradeRequest>(query);
    return regradeRequest ?? [];
}

/**
 * Updates a request from the requester.
 * Currently unused.
 * 
 * @param UpdateRegradeRequestByUserParams 
 * @returns string
 */
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

    //some people use comma as decimals
    expected_score = expected_score!.replace(/'/g, "''");
    current_score = current_score!.replace(/'/g, "''");
    grader_feedback = grader_feedback?.replace(/'/g, "''") ?? "";
    reason = reason?.replace(/'/g, "''") ?? "";

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

/**
 * Assigns a grader to a request of another user.
 * 
 * @param AssignGraderToRegradeRequestParams 
 * @returns string | RegradeRequest
 */
export const assignThreadIdToRequest = async(updateRequest: AssignThreadIdParams) => {
    let db = new DB();

    let {
        uuid,
        thread_id,
        first_message_id,
    } = updateRequest;

    let requests = await getRegradeRequest(uuid);
    if(requests.length === 0) {
        return "No regrade requests found!";
    }

    let now = getUTCDatetime();
    let query = `update regrade_requests 
                 set thread_id = '${thread_id}',
                     first_message_id = '${first_message_id}',
                     updated_at = '${now}'
                 where uuid = '${requests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return requests[0];
}

/**
 * Assigns a grader to a request of another user.
 * 
 * @param AssignGraderToRegradeRequestParams 
 * @returns string | RegradeRequest
 */
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

    // escape apostrophe
    discord_name = discord_name.replace(/'/g, "''");

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

/**
 * Unassigns the grader from their current assignment.
 * Currently unused.
 * 
 * @param uuid 
 * @returns string
 */
export const unassignGraderForRequest = async(uuid: string) => {
    let db = new DB();

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set regraded_by = null, 
                     regraded_by_id = null,
                     is_regrading = False,
                     updated_at = '${now}'
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

/**
 * Updates the regraded score and regraded reason for the grader's current assignment.
 * 
 * @param UpdateRegradeRequestByGraderParams 
 * @returns string
 */
export const updateRegradeRequestByGrader = async(updateRequest: UpdateRegradeRequestByGraderParams) => {
    let db = new DB();

    let {
        uuid,

        regraded_score,
        regraded_reason,

        regraded_by_id,
    } = updateRequest;

    let regradeRequests = await getRegradeRequest(uuid);
    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(regradeRequests[0].regraded_score) {
        return "Already regraded";
    }

    if(regradeRequests[0].regraded_by_id !== regraded_by_id) {
        return "You are not assigned to this request";
    }
    
    // escape apostrophe
    regraded_score = regraded_score!.replace(/'/g, "''");
    regraded_reason = regraded_reason?.replace(/'/g, "''") ?? "";

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set regraded_score = '${regraded_score}', 
                     regraded_reason = '${regraded_reason}',
                     regraded_at = '${now}',
                     is_regrading = false,
                     updated_at = '${now}'
                 where uuid = '${uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Updated";
}

/**
 * Admin Function.
 * Approve the regrader's regraded score.
 * Gives one Golden Ticket to the regrader.
 * 
 * @param ApproveRegradeRequestByAdminParams 
 * @returns string
 */
export const approveRegradeRequest = async(approveRequest: ApproveRegradeRequestByAdminParams) => {
    let db = new DB();

    let {
        uuid,
        thread_id,

        discord_id,
        discord_name,
    } = approveRequest;

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests: RegradeRequest[] = [];

    if(uuid) regradeRequests = await getRegradeRequest(uuid);
    if(thread_id) regradeRequests = await getRegradeRequestByThreadID(thread_id);

    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(!regradeRequests[0].regraded_score) {
        return "Request not regraded yet";
    }

    if(regradeRequests[0].approved_at) {
        return "Already approved";
    }

    // escape apostrophe
    discord_name = discord_name.replace(/'/g, "''");
    let request = regradeRequests[0];
    let isPaymentExpected = (request.regraded_score ?? 0) > (request.current_score ?? 0 );

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set approved_by = '${discord_name}', 
                     approved_by_id = '${discord_id}',
                     approved_at = '${now}',
                     updated_at = '${now}'
                     ${isPaymentExpected? ', is_payment_expected = true' : ''}
                 where uuid = '${regradeRequests[0].uuid}'`;

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

/**
 * Admin Function.
 * Reject the regrader's regraded score.
 * Opens up the submission to be regraded by someone else.
 * 
 * @param ApproveRegradeRequestByAdminParams 
 * @returns string
 */
export const rejectRegradeRequest = async(approveRequest: ApproveRegradeRequestByAdminParams) => {
    let db = new DB();

    let {
        uuid,
        thread_id,

        discord_id,
        discord_name,
    } = approveRequest;

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests: RegradeRequest[] = [];

    if(uuid) regradeRequests = await getRegradeRequest(uuid);
    if(thread_id) regradeRequests = await getRegradeRequestByThreadID(thread_id);

    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(!regradeRequests[0].regraded_score) {
        return "Request not regraded yet";
    }

    // cant reject if this was already approved
    if(regradeRequests[0].approved_at) {
        return "Already approved";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set 
                    regraded_at = null, 
                    regraded_by = null, 
                    regraded_by_id = null, 
                    regraded_reason = null, 
                    is_regrading = false, 
                    regraded_score = null,
                    updated_at = '${now}'
                 where uuid = '${regradeRequests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    return "Rejected";
}

/**
 * Admin Function.
 * Returns all requests that had been regraded but not approved.
 * 
 * @param PendingApprovalsParams 
 * @returns RegradeRequest[]
 */
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

/**
 * Admin Function.
 * Marks regrade request as no payment needed.
 * 
 * @param MarkAsNoPaymentParams 
 * @returns RegradeRequest[]
 */
export const markRegradeRequestAsNoPayment = async({ discord_id, thread_id }: MarkAsNoPaymentParams) => {
    let db = new DB();

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests = await getRegradeRequestByThreadID(thread_id);

    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(!regradeRequests[0].regraded_score) {
        return "Request not regraded yet";
    }

    // cant reject if this was already approved
    if(!regradeRequests[0].approved_at) {
        return "Request not approved yet";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set 
                    is_payment_expected = false,
                    is_payment_assigned = false,
                    updated_at = '${now}'
                 where uuid = '${regradeRequests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    regradeRequests = await getRegradeRequestByThreadID(thread_id);
    return regradeRequests[0];
}

/**
 * Admin Function.
 * Marks regrade request as no payment needed.
 * 
 * @param MarkAsNoPaymentParams 
 * @returns RegradeRequest[]
 */
export const markRegradeRequestAsPaymentAssigned = async({ discord_id, thread_id }: MarkAsPaidParams) => {
    let db = new DB();

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests = await getRegradeRequestByThreadID(thread_id);

    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(!regradeRequests[0].regraded_score) {
        return "Request not regraded yet";
    }

    // cant reject if this was already approved
    if(!regradeRequests[0].approved_at) {
        return "Request not approved yet";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set 
                    is_payment_expected = true,
                    is_payment_assigned = true,
                    updated_at = '${now}'
                 where uuid = '${regradeRequests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    regradeRequests = await getRegradeRequestByThreadID(thread_id);
    return regradeRequests[0];
}

/**
 * Admin Function.
 * Marks regrade request as no payment needed.
 * 
 * @param MarkAsNoPaymentParams 
 * @returns RegradeRequest[]
 */
export const markRegradeRequestAsPaid = async({ discord_id, thread_id, tx_hash }: MarkAsPaidParams) => {
    let db = new DB();

    let isAdmin = await isCurrentUserAdmin(discord_id);
    if(!isAdmin) {
        return "Unauthorized";
    }

    let regradeRequests = await getRegradeRequestByThreadID(thread_id);

    if(regradeRequests.length === 0) {
        return "Unable to find request";
    }

    if(!regradeRequests[0].regraded_score) {
        return "Request not regraded yet";
    }

    // cant reject if this was already approved
    if(!regradeRequests[0].approved_at) {
        return "Request not approved yet";
    }

    let now = getUTCDatetime();

    let query = `update regrade_requests 
                 set 
                    is_payment_expected = true,
                    is_payment_assigned = true,
                    paid_at = '${now}',
                    updated_at = '${now}'
                    ${tx_hash? `, payment_tx_hash = '${tx_hash}'` : ''}
                 where uuid = '${regradeRequests[0].uuid}'`;

    let isSuccess = await db.executeQuery(query);
    if(!isSuccess) {
        return "Error";
    }

    regradeRequests = await getRegradeRequestByThreadID(thread_id);
    return regradeRequests[0];
}