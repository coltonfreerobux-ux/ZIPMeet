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

function getRoom(roomCode) {
    if (!rooms[roomCode]) {
        rooms[roomCode] = {
            users: []
        };
    }
    return rooms[roomCode];
}

function emitParticipants(roomCode) {
    if (!rooms[roomCode]) return;

    io.to(roomCode).emit(
        "participant-list",
        rooms[roomCode].users
    );
}

io.on("connection", (socket) => {

    console.log("CONNECTED:", socket.id);

    socket.on("create-room", ({ roomCode, username }) => {

        const room = getRoom(roomCode);

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.username = username;

        room.users.push({
            socketId: socket.id,
            username: username
        });

        socket.emit("room-created", {
            roomCode
        });

        emitParticipants(roomCode);

        console.log(
            `${username} created ${roomCode}`
        );
    });

    socket.on("join-room", ({ roomCode, username }) => {

        const room = getRoom(roomCode);

        socket.join(roomCode);

        socket.data.roomCode = roomCode;
        socket.data.username = username;

        room.users.push({
            socketId: socket.id,
            username: username
        });

        socket.emit("joined-room", {
            roomCode
        });

        socket.to(roomCode).emit(
            "user-joined",
            {
                socketId: socket.id,
                username: username
            }
        );

        emitParticipants(roomCode);

        console.log(
            `${username} joined ${roomCode}`
        );
    });

    socket.on("offer", (data) => {

        io.to(data.target).emit(
            "offer",
            {
                sender: socket.id,
                offer: data.offer
            }
        );

    });

    socket.on("answer", (data) => {

        io.to(data.target).emit(
            "answer",
            {
                sender: socket.id,
                answer: data.answer
            }
        );

    });

    socket.on("ice-candidate", (data) => {

        io.to(data.target).emit(
            "ice-candidate",
            {
                sender: socket.id,
                candidate: data.candidate
            }
        );

    });

    socket.on("transcript", ({ text }) => {

        const roomCode =
            socket.data.roomCode;

        if (!roomCode) return;

        io.to(roomCode).emit(
            "transcript",
            {
                username:
                    socket.data.username,
                text
            }
        );

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
                    user =>
                        user.socketId !==
                        socket.id
                );

            io.to(roomCode).emit(
                "user-left",
                {
                    socketId: socket.id
                }
            );

            emitParticipants(roomCode);

            if (
                rooms[roomCode].users
                    .length === 0
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
        status: "online"
    });
});

const PORT =
    process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(
        `ZIPMEET running on port ${PORT}`
    );
});
