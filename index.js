const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = {};

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("ZIPMEET Signaling Server Running");
});

io.on("connection", (socket) => {

    console.log(`Connected: ${socket.id}`);

    socket.on("create-room", (roomCode) => {

        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }

        socket.join(roomCode);

        rooms[roomCode].push(socket.id);

        socket.emit("room-created", roomCode);

        console.log(`Room created: ${roomCode}`);
    });

    socket.on("join-room", (roomCode) => {

        if (!rooms[roomCode]) {
            rooms[roomCode] = [];
        }

        socket.join(roomCode);

        rooms[roomCode].push(socket.id);

        socket.emit("joined-room", roomCode);

        socket.to(roomCode).emit("user-joined", {
            userId: socket.id
        });

        console.log(`${socket.id} joined ${roomCode}`);
    });

    socket.on("offer", (data) => {

        io.to(data.target).emit("offer", {
            offer: data.offer,
            sender: socket.id
        });

    });

    socket.on("answer", (data) => {

        io.to(data.target).emit("answer", {
            answer: data.answer,
            sender: socket.id
        });

    });

    socket.on("ice-candidate", (data) => {

        io.to(data.target).emit("ice-candidate", {
            candidate: data.candidate,
            sender: socket.id
        });

    });

    socket.on("transcript", (data) => {

        io.to(data.room).emit("transcript", {
            sender: socket.id,
            text: data.text
        });

    });

    socket.on("disconnect", () => {

        console.log(`Disconnected: ${socket.id}`);

        for (const room in rooms) {

            rooms[room] = rooms[room].filter(
                id => id !== socket.id
            );

            io.to(room).emit("user-left", socket.id);

            if (rooms[room].length === 0) {
                delete rooms[room];
            }
        }
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`ZIPMEET server running on port ${PORT}`);
});
