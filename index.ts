import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Socket, Server } from 'socket.io';
import cors from 'cors';import _ from 'lodash';
import path from 'path';
import dotenv from 'dotenv';
import { approveRegradeRequest, assignGraderToRequest, assignThreadIdToRequest, getOpenRegradeRequests, getPendingApprovals, getRegradeRequest, getRegradeRequestByThreadID, getRegradeRequests, getRegradeRequestsCSV, getRegradeRequestsForUser, getRegradeRequestsWithoutThread, markRegradeRequestAsNoPayment, markRegradeRequestAsPaid, markRegradeRequestAsPaymentAssigned, newRegradeRequest, rejectRegradeRequest, unassignGraderForRequest, updateRegradeRequestByGrader, updateRegradeRequestByUser, } from './src/Regrade';
import { addTicket, getUserTickets } from './src/GoldenTicket';
import { addAdmin, removeAdmin } from './src/Admin';
import { AddAdminParams } from './src/Admin/types';
import { AddTicketParams } from './src/GoldenTicket/types';
import { AssignGraderToRegradeRequestParams, PendingApprovalsParams, UpdateRegradeRequestByGraderParams, UpdateRegradeRequestByUserParams } from './src/Regrade/types';
dotenv.config({ path: path.join(__dirname, '.env')});

process.on('uncaughtException', function (err) {
    //dont stop on uncaught exception
    console.log('Caught exception: ', err);
});

//create app
const port = 8081;
const whitelists = JSON.parse(process.env.CORS_WHITELIST!);

let app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({
    origin: whitelists,
    credentials: true
}));

//connect app to websocket
let http = createServer(app);
/* let io = new Server(http, {
    cors: {
        origin: whitelists,
        credentials: true
    }
}); */

//websocket functions
/* io.on('connection', (socket: Socket) => {
    
}); */

//api endpoints
app.get('/', function(req, res) {
    res.send('Hello World');
});

//form endpoints
app.post('/regrade_requests', async function(req, res) {
    let { discord_id }: { discord_id: string } = req.body;
    let requests = await getRegradeRequestsCSV(discord_id);
    return res.send(requests);
});

app.get('/open_regrade_requests', async function(req, res) {
    let requests = await getOpenRegradeRequests();
    return res.send(requests);
});

app.get('/regrade_request_without_threads', async function(req, res) {
    let requests = await getRegradeRequestsWithoutThread();
    return res.send(requests);
});

app.get('/regrade_request/:uuid', async function(req, res) {
    let uuid: string = req.params["uuid"];
    let requests = await getRegradeRequest(uuid);
    return res.send(requests);
});

app.get('/regrade_request_by_thread_id/:thread_id', async function(req, res) {
    let thread_id: string = req.params["thread_id"];
    let requests = await getRegradeRequestByThreadID(thread_id);
    return res.send(requests);
});

app.get('/regrade_requests/:discord_id', async function(req, res) {
    //need to sanitize
    let discordId: string = req.params["discord_id"];
    let requests = await getRegradeRequestsForUser(discordId);
    return res.send(requests);
});

app.get('/regrade_requests/:discord_id/:page', async function(req, res) {
    //need to sanitize
    let discordId: string = req.params["discord_id"];
    let page: number = parseInt(req.params["page"]);
    let requests = await getRegradeRequestsForUser(discordId, page);
    return res.send(requests);
});

// old new regrade request
/* app.post('/regrade_request', async function(req, res) {
    let { discord_id, discord_name }: { discord_id: string, discord_name: string} = req.body;
    let uuid = await newRegradeRequest(discord_id, discord_name);
    return res.send(uuid);
}); */

app.post('/regrade_request', async function(req, res) {
    let uuid = await newRegradeRequest(req.body);
    return res.send(uuid);
});

/**
 * Assigns thread id and first_message_id to the current regrade request
 */
app.post('/assign_regrade_request_thread_id', async function(req, res) {
    let request = await assignThreadIdToRequest(req.body);
    return res.send(request);
});

app.patch('/regrade_request', async function(req, res) {
    let { submission, grader_feedback, expected_score, current_score, reason, uuid }: UpdateRegradeRequestByUserParams = req.body;

    let ret = await updateRegradeRequestByUser({
        submission,
        grader_feedback,
        expected_score,
        current_score,
        reason,
        uuid,
    });

    return res.send(ret);
});

app.patch('/assign_grader_to_request', async function(req, res) {
    let { discord_id, discord_name }: AssignGraderToRegradeRequestParams = req.body;
    
    let ret = await assignGraderToRequest({
        discord_id,
        discord_name,
    });

    return res.send(JSON.stringify(ret));
});

app.patch('/regrade_request_by_grader', async function(req, res) {
    let { regraded_reason, regraded_score, regraded_by_id, uuid }: UpdateRegradeRequestByGraderParams = req.body;
    
    let ret = await updateRegradeRequestByGrader({
        uuid,
        
        regraded_by_id,
        regraded_reason,
        regraded_score
    });

    return res.send(ret);
});

app.post('/pending_approvals', async function(req, res) {
    let { discord_id, page }: PendingApprovalsParams = req.body;
    let requests = await getPendingApprovals({ discord_id, page });
    return res.send(requests);
});

app.post('/approve_regrade_request', async function(req, res) {
    let ret = await approveRegradeRequest(req.body);
    return res.send(ret);
});

app.post('/reject_regrade_request', async function(req, res) {
    let ret = await rejectRegradeRequest(req.body);
    return res.send(ret);
});

app.post('/mark_request_as_no_payment', async function(req, res) {
    let ret = await markRegradeRequestAsNoPayment(req.body);
    return res.send(ret);
});

app.post('/mark_request_as_payment_assigned', async function(req, res) {
    let ret = await markRegradeRequestAsPaymentAssigned(req.body);
    return res.send(ret);
});

app.post('/mark_request_as_paid', async function(req, res) {
    let ret = await markRegradeRequestAsPaid(req.body);
    return res.send(ret);
});

app.post('/remove_grader_by_thread_id', async function(req, res) {
    let ret = await unassignGraderForRequest(req.body);
    return res.send(ret);
});

// tickets
app.get('/ticket_count/:discord_id', async function(req, res) {
    let discord_id: string = req.params["discord_id"];

    let tickets = await getUserTickets({ discord_id, unspent_only: true });
    return res.send((tickets?.length ?? 0).toString());
});

app.post('/add_ticket', async function(req, res) {
    let { discord_id, discord_name, created_by_id, created_by, number_of_tickets, remark }: AddTicketParams = req.body;
    
    let ret = await addTicket({
        discord_id,
        discord_name,
        created_by_id,
        created_by,
        number_of_tickets,
        remark
    });

    return res.send(ret);
});

// admins
app.post('/add_admin', async function(req, res) {
    let { discord_id, discord_name, added_by, added_by_id }: AddAdminParams = req.body;

    let ret = await addAdmin({
        discord_id,
        discord_name,
        added_by,
        added_by_id
    });

    return res.send(ret);
});

app.post('/remove_admin', async function(req, res) {
    let { discord_id, discord_name, removed_by_id } = req.body;
    
    let ret = await removeAdmin({
        discord_id,
        discord_name,
        removed_by_id,
    });

    return res.send(ret);
});


// start the server
http.listen(port, () => {
    console.log("I'm alive!");
});