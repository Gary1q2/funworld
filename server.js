/* Basic entity that literally does nothing
   -coordinates (x, y) are at the center of the image
   -width & height are the collision bounds
 */
entity = function(x, y, width, height) {
	var self = {
		x: x,
		y: y,
		width: width,
		height: height
	};

	// Return if collision with other object (true or false)
	self.collideWith = function(other) {
		var rect1 = {
			x: self.x - self.width/2,
			y: self.y - self.height/2,
			width: self.width,
			height: self.height
		};
		var rect2 = {
			x: other.x - other.width/2,
			y: other.y - other.height/2,
			width: other.width,
			height: other.height
		};
		return testCollisionRectRect(rect1, rect2);
	}

	// Return if clicked (true or false)
	self.checkClick = function(mouseX, mouseY) {
		return (mouseX >= self.x - self.width/2 && mouseX <= self.x + self.width/2 && 
			    mouseY >= self.y - self.height/2 && mouseY <= self.y + self.height/2);
	}
	return self;
}



/* Player entity
 */
Player = function(x, y, name, xDes, yDes, speed, facing, head, body, hand, invent, intent, state, money) {
	var self = entity(x, y, 52, 90);
	self.name = name;
	self.xDes = xDes;
	self.yDes = yDes;
	self.speed = speed;
	self.facing = facing;
	self.head = head;
	self.body = body;
	self.hand = hand;
	self.invent = invent;
	self.intent = intent;
	self.state = state;
	self.money = money;

	self.update = function() {
		self.updateMovement();
	}


	// Update player's movement
	self.updateMovement = function() {
		if (self.xDes != -1 && self.yDes != -1) {
			let moveAngle = getMoveAngle(self.x, self.xDes, self.y, self.yDes);
			var tempX = calculateXPos(self.x, self.xDes, self.speed, moveAngle);
			var tempY = calculateYPos(self.y, self.yDes, self.speed, moveAngle);
			var oldX = self.x;
			var oldY = self.y;
			self.x = tempX;
			self.y = tempY;

			if (self.checkCollision()) {

				// Jump back position
				self.x = oldX;
				self.y = oldY;

				self.xDes = -1;
				self.yDes = -1;
				self.justStopped();

			// No collision, so keep going
			} else {
				self.x = tempX;
				self.y = tempY;

				// Back to normal state
				if (self.state != -1) {
					self.state = -1;
					debugMsg("BACK TO NORMAL STATE");

					socket.emit("fishing", false);
				}

				// Player reached destination, so stop moving
				if (self.x == self.xDes && self.y == self.yDes) {
					self.xDes = -1;
					self.yDes = -1;
					self.justStopped();
				}

			}
		}
	}

	// Execute actions after player just stopped moving
	self.justStopped = function() {
		if (self.intent == "fish" && self.collideWith(fishArea)) {
			self.state = "fish";
			debugMsg("FISHING STATE ON");

			// Tell server
			socket.emit("fishing", true);

		} else if (self.intent == "shop" && self.collideWith(shop)) {
			self.state = "shop";
			debugMsg("Shop state on");
		}
	}

	// Check if player is colliding with a wall
	self.checkCollision = function() {
		for (let i = 0; i < collisions.length; i++) {
			if (self.collideWith(collisions[i])) {
				return true;
			}
		}
		return false;
	}

	return self;
}







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


// Collision array
var collisions = [];
collisions.push(entity(1252+150, 231+150, 300, 300));
collisions.push(entity(714+350, 507+200, 700, 400));
collisions.push(entity(182+400, 689+200, 800, 400));



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
			var player = Player(750, 350, data, -1, -1, playerSpeed,
			                     "right", -1, -1, -1, [], -1, -1, 0);

			// Add new player into the server information + save socket
			socketList[socket.id] = socket;
			pList[socket.id] = player;

			// Give player the server state + specific values
			socket.emit('initDone', {spd: playerSpeed, tick: gameTick, debug: debug, name: player.name});
			socket.emit('updateState', pList);	

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
			
			// Setting intent
			if (fishArea.checkClick(data.clickX, data.clickY)) {
				pList[socket.id].intent = "fish";
			} else if (shop.checkClick(data.clickX, data.clickY)) {
				pList[socket.id].intent = "shop";
			} else {	
				pList[socket.id].intent = "none";
			}

			debugMsg("["+data.clickX+","+data.clickY+"]");
			debugMsg("intent = " + pList[socket.id].intent);
			// Setting destination and facing
			pList[socket.id].xDes = data.clickX;
			pList[socket.id].yDes = data.clickY;
			if (pList[socket.id].xDes - pList[socket.id].x) {
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

// Testing entities
var fishArea = entity(890, 550, 130, 109);
var shop = entity(465, 430, 145, 143);


// Server game loop @ 32 ticks
setInterval(function() {

	// Update all players
	for (var i in pList) {
		pList[i].update();
	}


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
			var moveAngle = getMoveAngle(pList[i].x, pList[i].xDes, pList[i].y, pList[i].yDes);
			var tempX = calculateXPos(pList[i].x, pList[i].xDes, speed, moveAngle);
			var tempY = calculateYPos(pList[i].y, pList[i].yDes, speed, moveAngle);

			// Reached boundary, stop moving
			if (checkCollision(tempX, tempY)) {
				pList[i].xDes = pList[i].x;
				pList[i].yDes = pList[i].y;

			// No boundary reached, keep moving!
			} else {
				pList[i].x = tempX; 
				pList[i].y = tempY;
			}	

			// Player reached destination, no more moving
			if (pList[i].x == pList[i].xDes && pList[i].y == pList[i].yDes) {
				pList[i].xDes = -1;
				pList[i].yDes = -1;
				debugMsg("stopped moving");
			}
		}
	}
}


// Check if passed position collides with any of the rectangles in the collisions[]
function checkCollision(x, y) {
	for (var i = 0; i < collisions.length; i++) {
		if (((x+stickColW/2 >= collisions[i].x && x+stickColW/2 <= collisions[i].x + collisions[i].w) ||
		   (x-stickColW/2 >= collisions[i].x && x-stickColW/2 <= collisions[i].x + collisions[i].w)) &&
		   ((y+stickColH/2 >= collisions[i].y && y+stickColH/2 <= collisions[i].y + collisions[i].h) ||
		   (y-stickColH/2 >= collisions[i].y && y-stickColH/2 <= collisions[i].y + collisions[i].h))) {
			return true;
		}
	}
	return false
}





// Checks if two rectangles have a collision (true or false)
function testCollisionRectRect(rect1, rect2) {
	return rect1.x <= rect2.x + rect2.width 
		&& rect2.x <= rect1.x + rect1.width
		&& rect1.y <= rect2.y + rect2.height
		&& rect2.y <= rect1.y + rect1.height;
}







// Moves the player x location on the x axis
// Given the player's current x position, destination x postion & speed
function calculateXPos(x, xDes, speed, angle) {
	if (Math.abs(xDes - x) > speed*Math.cos(angle)) {
		if (x < xDes) {
			return (x + (speed*Math.cos(angle)));
		} else if (x > xDes) {
			return (x - (speed*Math.cos(angle)));
		}
	} else if (Math.abs(xDes - x) > 0) {
		return xDes;
	} else {
		return x;
	}
}

// Moves the player y location on the y axis
// Given the player's current y position, destination y postion & speed
function calculateYPos(y, yDes, speed, angle) {
	if (Math.abs(yDes - y) > speed*Math.sin(angle)) {
		if (y < yDes) {
			return (y + (speed*Math.sin(angle)));
		} else if (y > yDes) {
			return (y - (speed*Math.sin(angle)));
		}
	} else if (Math.abs(yDes - y) > 0) {
		return yDes;
	} else {
		return y;
	}
}

// Calculate the move angle given the player's current position and destination
function getMoveAngle(x, xDes, y, yDes) {
	return Math.abs(Math.atan((Math.abs(yDes-y)/(xDes-x))));
}

// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}