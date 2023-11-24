const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
var axios = require('axios');
const moment = require('moment');

require('dotenv').config();
const apiKey = process.env.MONGODB_API_KEY;

async function createNewMessage(room, username, message, timestamp) {
    var data = JSON.stringify({
        "collection": "spychat",
        "database": "spychatMain",
        "dataSource": "Cluster0",
        "document": {
            "room": `${room}`,
            "username": `${username}`,
            "message": `${message}`,
            "timestamp": `${timestamp}`
        }
    });

    var config = {
        method: 'post',
        url: 'https://us-east-2.aws.data.mongodb-api.com/app/data-fxynx/endpoint/data/v1/action/insertOne',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
            'api-key': apiKey,
            'Accept': 'application/ejson'
        },
        data: data
    };

    try {
        const response = await axios(config);
        console.log(JSON.stringify(response.data));
    } catch (error) {
        console.log(error);
    }
}

async function getChatMessages(room) {
    var data = JSON.stringify({
        "collection": "spychat",
        "database": "spychatMain",
        "dataSource": "Cluster0",
        "filter": {
            "room": `${room}`
        },
        "sort": { "completedAt": 1 },
    });

    var config = {
        method: 'post',
        url: 'https://us-east-2.aws.data.mongodb-api.com/app/data-fxynx/endpoint/data/v1/action/find',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Request-Headers': '*',
            'api-key': apiKey,
            'Accept': 'application/ejson'
        },
        data: data
    };

    try {
        const response = await axios(config);
        return response.data.documents;
    } catch (error) {
        console.error(error);
        return [];
    }
}

app.use(express.static('./'));

io.on('connection', (socket) => {
    // Get user IP address
    const userIp = socket.handshake.address;

    // Format the timestamp using moment.js
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');

    socket.on('join room', async (room) => {
        socket.join(room);
        socket.emit('system message', `You joined the room: ${room}`);

        // Get and emit previous messages
        const previousMessages = await getChatMessages(room);
        socket.emit('previous messages', previousMessages);
    });

    console.log(`${timestamp} - User connected: ${socket.id}, IP: ${userIp}`);

    socket.on('chat message', (msg) => {
        const { room, username, message } = msg;

        // Save the message to the database
        console.log(room, username, message)
        createNewMessage(room, username, message, timestamp)

        // Broadcast the message to everyone in the room
        io.to(room).emit('chat message', { username, message });
    });

    socket.on('disconnect', () => {
        console.log(`${timestamp} - User disconnected: ${socket.id}, IP: ${userIp}`);
    });
});

http.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});