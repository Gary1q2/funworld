var port = 6969;
var ip = "0.0.0.0";

// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);



app.set('port', (process.env.PORT || port));
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server
server.listen(app.get('port'), ip, function() {
  console.log(`Starting server on port ${app.get('port')}`);
});

// Variables
var playerNum = 0;
var playerList = {};
var chatLog = [];

// Shut server down gracefully upon CTRL + C or interrupt
process.on('SIGINT', function() {
	console.log("I'm shutting down baiii");
	io.sockets.emit('shutdown');
	process.exit()
});


// Handles player connections
io.on('connection', function(socket) {

	// New player joined & submitted their name
	socket.on('new player', function(data) {
		if (data) {

			// Setup new player's location information
			var playerInfo = {
				name: data,
				xPos: 100,
				yPos: 100
			};

			// Add new player into the server information and give player the server state
			playerList[socket.id] = playerInfo;
			socket.emit('initDone');
			socket.emit('gameState', playerList);
			console.log(data);	

			// Tell other players to update their local list about new player
			socket.broadcast.emit('otherJoin', playerInfo, socket.id);

			// Update every client about the new player number
			playerNum++;
			io.sockets.emit('playerNum', playerNum);
			console.log("[" + data + "] has joined with id [" + socket.id + "] ------------- total players online = " + playerNum);


		// Error if null username submitted
		} else {
			console.log("no name submitted");
			socket.emit('nullName');
		}
	});

	// Disconnect player and update players on new player count
	socket.on('disconnect', function() {
		if (playerList[socket.id] != undefined) {
			playerNum--;
			console.log("player with id [" + socket.id + "] DISCONNECTED!!! ---------- players remaining = " + playerNum);
			io.sockets.emit('playerNum', playerNum);
			socket.broadcast.emit('otherLeave', socket.id);
			delete playerList[socket.id];
		}
	});

	// Player selected a spot to move to
	socket.on('movement', function(data) {
		if (playerList[socket.id] != undefined) {
			console.log(data);
			console.log("socket id = " + socket.id);

			//=========================================================
			// Check if location is valid <- do once you implement location
			// CHANGE ..... its sending its current position

			playerList[socket.id].xPos = data.x;
			playerList[socket.id].yPos = data.y;
			console.log(playerList);

			socket.broadcast.emit('updateState', playerList);
		}
	});

	// Player sent a message
	socket.on('chat', function(data) {
		if (playerList[socket.id] != undefined) {
			console.log("Received message[" + data + "] from player " + socket.id);
			socket.broadcast.emit('playerChat', {
				id: socket.id,
				msg: data
			});

			// Log the chat into array
			chatLog.push({id: socket.id, msg: data});
		}
	});

});