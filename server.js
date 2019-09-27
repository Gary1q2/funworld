const port = 6969;
const ip = "0.0.0.0";

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
var pList = {};  // Stores player information
var socketList = {};  // Stores player sockets
var chatLog = [];     // Stores player messages

var playerNum = 0; 
const playerSpeed = 50; // Pixels moved per gametick
const gameTick = 5;




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
				yPos: 100,
				xDes: -1,
				yDes: -1,
				facing: "right"
			};

			// Add new player into the server information + save socket
			socketList[socket.id] = socket;
			pList[socket.id] = playerInfo;

			// Give player the server state + specific values
			socket.emit('initDone', {spd: playerSpeed, tick: gameTick});
			socket.emit('gameState', pList);
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
		if (pList[socket.id] != undefined) {
			playerNum--;
			console.log("player with id [" + socket.id + "] DISCONNECTED!!! ---------- players remaining = " + playerNum);
			io.sockets.emit('playerNum', playerNum);
			socket.broadcast.emit('otherLeave', socket.id);
			delete pList[socket.id];
		}
	});

	// Player selected a spot to move to
	socket.on('movement', function(data) {
		if (pList[socket.id] != undefined) {
			console.log(data);
			console.log("socket id = " + socket.id);

			//=========================================================
			// Check if location is valid <- do once you implement location
			// CHANGE ..... its sending its current position
			pList[socket.id].xDes = data.xDes;
			pList[socket.id].yDes = data.yDes;

			if (pList[socket.id].xDes - pList[socket.id].xPos >= 0) {
				pList[socket.id].facing = "right";
			} else {
				pList[socket.id].facing = "left";
			}
		}
	});

	// Player sent a message
	socket.on('chat', function(data) {
		if (pList[socket.id] != undefined) {
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



// Server game loop @ 32 ticks
setInterval(function() {
	updatePlayerMovement();
	sendPlayerMovement();

}, 1000/gameTick);



// Broadcast new player positions to all clients
function sendPlayerMovement() {

	// Create array containing only player positions + info
	var playerLoc = {};
	for (var player in pList) {
		var pos = {
			xPos: pList[player].xPos,
			yPos: pList[player].yPos,
			facing: pList[player].facing
		}
		playerLoc[player] = pos;
	}

	// Broadcast everyone's new positions
	for (var player in socketList) {
		socketList[player].emit('updateState', playerLoc);
	}
}

// Update all player movement
function updatePlayerMovement() {

	var speed = playerSpeed;

	for (var i in pList) {
		if (pList[i].xDes != -1 && pList[i].yDes != -1) {
			//console.log("xDes =" + pList[i].xDes + "    yDes = " + pList[i].yDes);
			var moveAngle = getMoveAngle(pList[i].xPos, pList[i].xDes, pList[i].yPos, pList[i].yDes);
			pList[i].xPos = calculateXPos(pList[i].xPos, pList[i].xDes, speed, moveAngle);
			pList[i].yPos = calculateYPos(pList[i].yPos, pList[i].yDes, speed, moveAngle);

			// Player reached destination, no more moving
			if (pList[i].xPos == pList[i].xDes && pList[i].yPos == pList[i].yDes) {
				pList[i].xDes = -1;
				pList[i].yDes = -1;
				console.log("stopped moving");
			}
		}
	}
}












// Moves the player x location on the x axis
// Given the player's current x position, destination x postion & speed
function calculateXPos(xPos, xDes, speed, angle) {
	if (Math.abs(xDes - xPos) > speed*Math.cos(angle)) {
		if (xPos < xDes) {
			return (xPos + (speed*Math.cos(angle)));
		} else if (xPos > xDes) {
			return (xPos - (speed*Math.cos(angle)));
		}
	} else if (Math.abs(xDes - xPos) > 0) {
		return xDes;
	} else {
		return xPos;
	}
}

// Moves the player y location on the y axis
// Given the player's current y position, destination y postion & speed
function calculateYPos(yPos, yDes, speed, angle) {
	if (Math.abs(yDes - yPos) > speed*Math.sin(angle)) {
		if (yPos < yDes) {
			return (yPos + (speed*Math.sin(angle)));
		} else if (yPos > yDes) {
			return (yPos - (speed*Math.sin(angle)));
		}
	} else if (Math.abs(yDes - yPos) > 0) {
		return yDes;
	} else {
		return yPos;
	}
}

// Calculate the move angle given the player's current position and destination
function getMoveAngle(xPos, xDes, yPos, yDes) {
	return Math.abs(Math.atan((Math.abs(yDes-yPos)/(xDes-xPos))));
}