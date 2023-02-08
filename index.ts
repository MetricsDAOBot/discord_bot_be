import express from 'express';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { Socket, Server } from 'socket.io';
import cors from 'cors';import _ from 'lodash';
import path from 'path';
import dotenv from 'dotenv';
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

http.listen(port, () => {
    console.log("I'm alive!");
});