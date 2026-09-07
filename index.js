const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

function getRoomUsers(roomCode) {
    if (!rooms[roomCode]) return [];
    return rooms[roomCode].users;
}

io.on("connection", (socket) => {

    console.log("CONNECTED:", socket.id);

    socket.on("create-room", ({ roomCode, username }) => {

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                users: []
            };
        }

        const existingUser =
            rooms[roomCode].users.find(
                u => u.socketId === socket.id
            );

        if (!existingUser) {
            rooms[roomCode].users.push({
                socketId: socket.id,
                username,
                muted: false
            });
        }

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.username = username;

        socket.emit("room-created", {
            roomCode,
            users: getRoomUsers(roomCode)
        });

        console.log(`${username} created ${roomCode}`);
    });

    socket.on("join-room", ({ roomCode, username }) => {

        if (!rooms[roomCode]) {
            rooms[roomCode] = {
                users: []
            };
        }

        rooms[roomCode].users.push({
            socketId: socket.id,
            username,
            muted: false
        });

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.username = username;

        socket.emit("joined-room", {
            roomCode,
            users: getRoomUsers(roomCode)
        });

        socket.to(roomCode).emit("user-joined", {
            socketId: socket.id,
            username
        });

        io.to(roomCode).emit(
            "participant-list",
            getRoomUsers(roomCode)
        );

        console.log(`${username} joined ${roomCode}`);
    });

    socket.on("offer", data => {

        io.to(data.target).emit("offer", {
            sender: socket.id,
            offer: data.offer
        });

    });

    socket.on("answer", data => {

        io.to(data.target).emit("answer", {
            sender: socket.id,
            answer: data.answer
        });

    });

    socket.on("ice-candidate", data => {

        io.to(data.target).emit("ice-candidate", {
            sender: socket.id,
            candidate: data.candidate
        });

    });

    socket.on("transcript", data => {

        const roomCode =
            socket.data.roomCode;

        if (!roomCode) return;

        io.to(roomCode).emit("transcript", {
            username: socket.data.username,
            text: data.text,
            timestamp: Date.now()
        });

    });

    socket.on("mute-state", state => {

        const roomCode =
            socket.data.roomCode;

        if (!roomCode) return;

        const room = rooms[roomCode];

        if (!room) return;

        const user =
            room.users.find(
                u => u.socketId === socket.id
            );

        if (!user) return;

        user.muted = state.muted;

        io.to(roomCode).emit(
            "participant-list",
            room.users
        );

    });

    socket.on("chat-message", message => {

        const roomCode =
            socket.data.roomCode;

        if (!roomCode) return;

        io.to(roomCode).emit("chat-message", {
            username: socket.data.username,
            message
        });

    });

    socket.on("leave-room", () => {

        const roomCode =
            socket.data.roomCode;

        if (!roomCode) return;

        if (rooms[roomCode]) {

            rooms[roomCode].users =
                rooms[roomCode].users.filter(
                    u => u.socketId !== socket.id
                );

            socket.leave(roomCode);

            io.to(roomCode).emit(
                "participant-list",
                rooms[roomCode].users
            );

            io.to(roomCode).emit(
                "user-left",
                socket.id
            );

            if (
                rooms[roomCode].users.length === 0
            ) {
                delete rooms[roomCode];
            }
        }
    });

    socket.on("disconnect", () => {

        const roomCode =
            socket.data.roomCode;

        if (
            roomCode &&
            rooms[roomCode]
        ) {

            rooms[roomCode].users =
                rooms[roomCode].users.filter(
                    u => u.socketId !== socket.id
                );

            io.to(roomCode).emit(
                "user-left",
                socket.id
            );

            io.to(roomCode).emit(
                "participant-list",
                rooms[roomCode].users
            );

            if (
                rooms[roomCode].users.length === 0
            ) {
                delete rooms[roomCode];
            }
        }

        console.log(
            "DISCONNECTED:",
            socket.id
        );

    });

});

app.get("/health", (req, res) => {
    res.json({
        status: "ZIPMEET ONLINE"
    });
});

const PORT =
    process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(
        `ZIPMEET running on ${PORT}`
    );
});
