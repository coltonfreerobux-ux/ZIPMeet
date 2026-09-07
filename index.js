const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

const users = [];

app.get("/", (req, res) => {

res.send(`
<!DOCTYPE html>
<html>
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">

<title>ZIPMEET</title>

<style>

body{
background:#111;
color:white;
font-family:Arial;
margin:0;
height:100vh;
display:flex;
}

#left{
flex:1;
padding:20px;
}

#right{
width:350px;
background:black;
overflow:auto;
}

h1{
color:#3399ff;
}

input{
width:100%;
padding:10px;
margin-bottom:10px;
background:#222;
border:none;
color:white;
border-radius:5px;
}

button{
padding:10px;
margin-bottom:10px;
width:100%;
border:none;
border-radius:5px;
cursor:pointer;
}

#mic{
background:#ff8800;
color:white;
}

#mute{
background:#cc0000;
color:white;
}

#participants{
background:#1f1f1f;
padding:10px;
border-radius:6px;
margin-top:10px;
}

.user{
padding:5px;
}

#transcript{
padding:10px;
}

.msg{
background:#1a1a1a;
padding:10px;
margin-bottom:8px;
border-radius:6px;
}

</style>

</head>

<body>

<div id="left">

<h1>ZIPMEET</h1>

<input
id="username"
placeholder="Enter Username">

<button id="join">
Join Meeting
</button>

<button id="mic">
Enable Microphone
</button>

<button id="mute">
Mute
</button>

<h3>Participants</h3>

<div id="participants"></div>

</div>

<div id="right">

<h3 style="padding:10px">
Transcript
</h3>

<div id="transcript"></div>

</div>

<script src="/socket.io/socket

<script>

const socket = io();

let joined = false;
let muted = false;
let localStream = null;

function addMessage(text)
{
    const div =
    document.createElement("div");

    div.className = "msg";

    div.textContent = text;

    document
    .getElementById("transcript")
    .appendChild(div);
}

document
.getElementById("join")
.onclick = () =>
{
    const username =
    document
    .getElementById("username")
    .value
    .trim();

    if(!username)
    {
        alert("Enter username");
        return;
    }

    if(joined)
    {
        return;
    }

    joined = true;

    socket.emit(
        "join",
        username
    );
};

document
.getElementById("mic")
.onclick = async () =>
{
    try
    {
        localStream =
        await navigator
        .mediaDevices
        .getUserMedia({
            audio:true
        });

        addMessage(
            "🎤 Microphone enabled"
        );

        startSpeech();

    }
    catch(err)
    {
        alert(
            "Microphone denied"
        );
    }
};

document
.getElementById("mute")
.onclick = () =>
{
    if(!localStream)
    {
        alert(
            "Enable microphone first"
        );
        return;
    }

    muted = !muted;

    localStream
    .getAudioTracks()
    .forEach(track=>{
        track.enabled = !muted;
    });

    document
    .getElementById("mute")
    .textContent =
    muted
    ? "Unmute"
    : "Mute";
};

socket.on(
"participants",
list =>
{
    const box =
    document.getElementById(
        "participants"
    );

    box.innerHTML = "";

    list.forEach(name =>
    {
        const div =
        document.createElement("div");

        div.className =
        "user";

        div.textContent =
        name;

        box.appendChild(div);
    });
});

socket.on(
"transcript",
msg =>
{
    addMessage(msg);
});

function startSpeech()
{
    const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

    if(!SpeechRecognition)
    {
        addMessage(
        "Speech recognition unavailable"
        );
        return;
    }

    const recognition =
    new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult =
    e =>
    {
        const text =
        e.results[
        e.results.length - 1
        ][0].transcript;

        socket.emit(
            "transcript",
            text
        );
    };

    recognition.start();
}

</script>

</body>
</html>
`);

});

io.on("connection", socket => {

socket.on("join", username => {

    socket.username = username;

    users.push(username);

    io.emit(
        "participants",
        users
    );

    io.emit(
        "transcript",
        username +
        " joined"
    );

});

socket.on("transcript", text => {

    io.emit(
        "transcript",
        socket.username +
        ": " +
        text
    );

});

socket.on("disconnect", () => {

    if(socket.username)
    {
        const index =
        users.indexOf(
            socket.username
        );

        if(index > -1)
        {
            users.splice(
                index,
                1
            );
        }

        io.emit(
        "participants",
        users
        );

        io.emit(
            "transcript",
            socket.username +
            " left"
        );
    }

});

});

const PORT =
process.env.PORT || 3000;

server.listen(PORT, () => {

console.log(
"ZIPMEET running on",
PORT
);

});
