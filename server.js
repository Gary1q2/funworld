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

// Shut server down gracefully upon CTRL + C or interrupt
process.on('SIGINT', function() {
	console.log("I'm shutting down baiii");
	io.sockets.emit('shutdown');
	process.exit()
});

// Handles player connections
io.on('connection', function(socket) {

	// New player submitted their name
	socket.on('new player', function(data) {
		if (data) {
			playerNum++;
	    	console.log("[" + data + "] has joined with id [" + socket.id + "] ------------- total players online = " + playerNum);
			io.sockets.emit('playerNum', playerNum);   // Update players on player count

			// Initialise information in playerList
			var playerInfo = {
				name: data,
				xPos: 100,
				yPos: 100,
				xPosDes: 0,
				yPosDes: 0
			};
			playerList[socket.id] = playerInfo;
			socket.emit('initDone');
			socket.emit('gameState', playerList);
			console.log(data);	

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
			delete playerList[socket.id];
		}
	});

	// Player selected a spot to move to
	socket.on('movement', function(data) {
		if (playerList[socket.id] != undefined) {
			console.log(data);
			console.log("socket id = " + socket.id);
			playerList[socket.id].xPosDes = data.x;
			playerList[socket.id].yPosDes = data.y;
			console.log(playerList);
		}
	});

});

// TRY to send gamestate at 32 ticks
setInterval(function() {
	var speed = 8;
	for (var i in playerList) {
		if (Math.abs(playerList[i].xPosDes - playerList[i].xPos) > speed) {
			if (playerList[i].xPos < playerList[i].xPosDes) { playerList[i].xPos += speed; } 
			else if (playerList[i].xPos > playerList[i].xPosDes) { playerList[i].xPos -= speed; }
		} else if (Math.abs(playerList[i].xPosDes - playerList[i].xPos) > 0) {
			playerList[i].xPos = playerList[i].xPosDes;
		}
		if (Math.abs(playerList[i].yPosDes - playerList[i].yPos) > speed) {
			if (playerList[i].yPos > playerList[i].yPosDes) { playerList[i].yPos -= speed; }
			else if (playerList[i].yPos < playerList[i].yPosDes) { playerList[i].yPos += speed; }
		} else if (Math.abs(playerList[i].yPosDes - playerList[i].yPos) > 0) {
			playerList[i].yPos = playerList[i].yPosDes;
		}
	}

  	io.sockets.emit('gameState', playerList);
}, 1000/30);



