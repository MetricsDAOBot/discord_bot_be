import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Socket, Server } from 'socket.io';
import cors from 'cors';import _ from 'lodash';
import path from 'path';
import dotenv from 'dotenv';
import { assignGraderToRequest, getRegradeRequest, getRegradeRequests, getRegradeRequestsForUser, newRegradeRequest, updateRegradeRequestByGrader, updateRegradeRequestByUser, } from './src/Regrade';
import { addTicket } from './src/GoldenTicket';
import { addAdmin, removeAdmin } from './src/Admin';
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
app.get('/regrade_requests', async function(req, res) {
    let requests = await getRegradeRequests();
    return res.send(requests);
});

app.get('/regrade_request/:uuid', async function(req, res) {
    let uuid = req.params["uuid"];
    let requests = await getRegradeRequest(uuid);
    return res.send(requests);
});

app.get('/regrade_requests/:discord_id', async function(req, res) {
    //need to sanitize
    let discordId = req.params["discord_id"];
    let requests = await getRegradeRequestsForUser(discordId);
    return res.send(requests);
});

app.post('/regrade_request', async function(req, res) {
    let { discord_id, discord_name }: { discord_id: string, discord_name: string} = req.body;
    let uuid = await newRegradeRequest(discord_id, discord_name);
    return res.send(uuid);
});

app.patch('/regrade_request', async function(req, res) {
    let { submission, grader_feedback, expected_score, current_score, reason, uuid } = req.body;

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
    let { discord_id, discord_name } = req.body;
    
    let ret = await assignGraderToRequest({
        discord_id,
        discord_name,
    });

    return res.send(ret);
});

app.patch('/regrade_request_by_grader', async function(req, res) {
    let { regraded_reason, regraded_score, uuid } = req.body;
    
    let ret = await updateRegradeRequestByGrader({
        uuid,
        regraded_reason,
        regraded_score
    });

    return res.send(ret);
});

// tickets
app.post('/add_ticket', async function(req, res) {
    let { discord_id, discord_name, created_by_id, created_by, number_of_tickets, remark } = req.body;
    
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
    let { discord_id, discord_name, added_by, added_by_id } = req.body;

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

http.listen(port, () => {
    console.log("I'm alive!");
});