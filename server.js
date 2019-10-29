const port = 6969;
const ip = "0.0.0.0";

// Setting items WARNING could be different to client
var items = {};
setItem(0, "lollypop", "hand", 50, "static/lollypop.png");
setItem(1, "helmet", "head", 100, "static/helmet.png");
setItem(2, "armour", "body", 89, "static/armour.png");



// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

// Console input on server
var stdin = process.openStdin();

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
const playerSpeed = 5; // Pixels moved per gametick
const gameTick = 32;




var debug = false;

// Height and width of a stickman image
var stickColW = 40;
var stickColH = 100;

// Adding collision squares to the collision array
var collisions = [];
var rect = {x: 1252, y: 231, h: 300, w: 300};
collisions.push(rect);
var rect = {x: 714,	y: 507,	h: 400,	w: 700};
collisions.push(rect);
var rect = {x: 182,	y: 689,	h: 400,	w: 800};
collisions.push(rect);



// Taking in arguments when executed
if (process.argv.length > 2) {
	if (process.argv[2] == "debug") {
		debug = true;
		console.log("\nDEBUG MODE========================\n")
	}
}

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
				xPos: 750,
				yPos: 350,
				xDes: -1,
				yDes: -1,
				facing: "right",
				head: -1,
				body: -1,
				hand: -1,
				invent: [0, 1, 2],
				intent: -1,
				state: -1,
				money: 0
			};

			// Add new player into the server information + save socket
			socketList[socket.id] = socket;
			pList[socket.id] = playerInfo;

			// Give player the server state + specific values
			socket.emit('initDone', {spd: playerSpeed, tick: gameTick, debug: debug});
			socket.emit('updateState', pList);
			debugMsg(data);	

			// Update every client about the new player number
			playerNum++;
			io.sockets.emit('playerNum', playerNum);
			console.log("[" + data + "] has joined ------------- total players online = " + playerNum);


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
			delete pList[socket.id];
		}
	});

	// Player selected a spot to move to
	socket.on('movement', function(data) {
		if (pList[socket.id] != undefined) {

			//=========================================================
			// Check if location is valid <- do once you implement location
			// CHANGE ..... its sending its current position
			
			// Update location of player
			pList[socket.id].xPos = data.x;
			pList[socket.id].yPos = data.y;
			pList[socket.id].facing = data.facing;
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

	// Player equip an item
	socket.on('equipItem', function(itemID) {
		if (pList[socket.id].invent.includes(itemID)) {
			debugMsg("Player " + pList[socket.id].name + " equiped item " + itemID);
			var slot = items[itemID].equip;
			if (slot == "head") {
				pList[socket.id].head = itemID;
			} else if (slot == "body") {
				pList[socket.id].body = itemID;
			} else if (slot == "hand") {
				pList[socket.id].hand = itemID;
			}
		}
	});

	// Player unequip an item
	socket.on('unequipItem', function(body) {
		debugMsg("Player " + pList[socket.id].name + " unequiped item from " + body);
		if (body == "head") {
			pList[socket.id].head = -1;
		} else if (body == "body") {
			pList[socket.id].body = -1;
		} else if (body == "hand") {
			pList[socket.id].hand = -1;
		}
	});

	// Player is fishing or not
	socket.on('fishing', function(data) {
		if (pList[socket.id] != undefined) {
			if (data == true) {
				pList[socket.id].state = "fishing";
			} else {
				pList[socket.id].state = "none";
			}
		}
	});

	// Update player money
	socket.on('money', function(data) {
		if (pList[socket.id] != undefined) {
			pList[socket.id].money += data;
		}
	});

});

// Server game loop @ 32 ticks
setInterval(function() {

	// Send to all clients all player states
	sendPlayerState();

}, 1000/gameTick);


// Take in console input
/*
  players - lists all the players on the server
  give [userID] [itemID] - gives a player an item
  pList - displays the pList

*/
stdin.addListener("data", function(d) {
	var string = d.toString().trim();
	var args = string.split(" ");
	console.log(args);

	
	if (args.length == 1) {

		// players command
		if (args[0] == "players") {
			console.log("Name ID")
			for (var player in pList) {
				console.log(pList[player].name+" "+player);
			}

		// pList command
		} else if (args[0] == "pList") {
			console.log(pList);
		} else {
			console.log("Unknown command");
		}

	} else if (args.length == 3) {

		// give [userID] [itemID]
		if (args[0] == "give") {
			if (args[1] in pList) {
				if (args[2] >= 0 && args[2] <= 2) {
					pList[args[1]].invent.push(args[2]);
					console.log("Gave [" + args[1] + "] item [" + args[2] + "]");
				} else {
					console.log("Invalid itemID");
				}
			} else {
				console.log("Invalid userID");
			}
		} else {
			console.log("Unknown command");
		}

	} else {
		console.log("Unknown command");
	}
});


// Initialise item property inside items{}
function setItem(itemID, name, bodyPart, price, fileLoc) {
	items[itemID] = {
		name: name,
		equip: bodyPart,
		price: price
	};
}


// Broadcast new player states to all clients
function sendPlayerState() {

	// Broadcast everyone's new states
	for (var player in socketList) {
		socketList[player].emit('updateState', pList);
	}
}

// Update all player movement
function updatePlayerMovement() {

	var speed = playerSpeed;

	for (var i in pList) {
		if (pList[i].xDes != -1 && pList[i].yDes != -1) {
			var moveAngle = getMoveAngle(pList[i].xPos, pList[i].xDes, pList[i].yPos, pList[i].yDes);
			var tempX = calculateXPos(pList[i].xPos, pList[i].xDes, speed, moveAngle);
			var tempY = calculateYPos(pList[i].yPos, pList[i].yDes, speed, moveAngle);

			// Reached boundary, stop moving
			if (checkCollision(tempX, tempY)) {
				pList[i].xDes = pList[i].xPos;
				pList[i].yDes = pList[i].yPos;

			// No boundary reached, keep moving!
			} else {
				pList[i].xPos = tempX; 
				pList[i].yPos = tempY;
			}	

			// Player reached destination, no more moving
			if (pList[i].xPos == pList[i].xDes && pList[i].yPos == pList[i].yDes) {
				pList[i].xDes = -1;
				pList[i].yDes = -1;
				debugMsg("stopped moving");
			}
		}
	}
}


// Check if passed position collides with any of the rectangles in the collisions[]
function checkCollision(xPos, yPos) {
	for (var i = 0; i < collisions.length; i++) {
		if (((xPos+stickColW/2 >= collisions[i].x && xPos+stickColW/2 <= collisions[i].x + collisions[i].w) ||
		   (xPos-stickColW/2 >= collisions[i].x && xPos-stickColW/2 <= collisions[i].x + collisions[i].w)) &&
		   ((yPos+stickColH/2 >= collisions[i].y && yPos+stickColH/2 <= collisions[i].y + collisions[i].h) ||
		   (yPos-stickColH/2 >= collisions[i].y && yPos-stickColH/2 <= collisions[i].y + collisions[i].h))) {
			return true;
		}
	}
	return false
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

// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}