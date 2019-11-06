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
	self.mouseOver = function(mouseX, mouseY) {
		return (mouseX >= self.x - self.width/2 && mouseX <= self.x + self.width/2 && 
			    mouseY >= self.y - self.height/2 && mouseY <= self.y + self.height/2);
	}
	return self;
}



/* Player entity
 */
Player = function(socket, x, y, name, xDes, yDes, speed, facing, head, body, hand, invent, intent, state, money) {
	var self = entity(x, y, 52, 90);
	self.socket = socket;
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

	self.lastMsg = "";    // Stores last message sent by player
	self.lastMsgTime = 0; // Timer for last message sent

	self.fishingTime = gameTick * 2;       // 2 seconds to fish
	self.fishingTimer = self.fishingTime ; // Timer for fishing
	
	self.punchTarget = -1;
	self.deadTime = gameTick * 2;     // Dead for 2 seonds
	self.deadTimer = self.deadTime;   // Timer for counting how long dead for

	self.update = function() {
		self.updateMovement();
		self.updateChatHead();
		self.updateFishing();

		if (self.state == "dead") {
			self.updateDying();
		}
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

			self.fishingTimer = self.fishingTime;

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
				if (self.state != "none") {
					self.state = "none";
					debugMsg("BACK TO NORMAL STATE");
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

	// Tick the player chat message above head
	self.updateChatHead = function() {
		if (self.lastMsgTime > 0) {
			self.lastMsgTime--;
		}
	}

	self.updateFishing = function() {
		if (self.state == "fish") {
			self.fishingTimer--;
		}
		if (self.fishingTimer == 0) {
			self.money += 10;
			self.fishingTimer = self.fishingTime;

			// Tell player to create the money animation
			socketList[self.socket].emit('money', 10);
		}
	}

	// Update and make player revive after being hit
	self.updateDying = function() {
		self.deadTimer--;
		if (self.deadTimer == 0) {
			self.state = "none";
			self.deadTimer = self.deadTime;
		}
		
	}

	// Execute actions after player just stopped moving
	self.justStopped = function() {
		if (self.intent == "fish" && self.collideWith(fishArea)) {
			self.state = "fish";
			debugMsg("FISHING STATE ON");
		} else if (self.intent == "shop" && self.collideWith(shop)) {
			self.state = "shop";
			debugMsg("Shop state on");
		} else if (self.intent == "punch" && self.collideWith(pList[self.punchTarget])) {

			self.intent = "none";
			self.state = "punch";

			pList[self.punchTarget].state = "dead";
			self.state = "none";
			debugMsg("I JUST PUNCHED A CUNT");
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


/* Chat system
 */
Chat = function(len) {
	var self = {
		array: Array(len).fill({
			name: "",
			msg: ""
		})
	};

	self.pushMsg = function(name, msg) {
		for (var i = self.array.length-1; i > 0; i--) {
			self.array[i] = self.array[i-1];
		}
		self.array[0] = {
			name: name,
			msg: msg
		};
	}

	return self;
}

/* Item properties
 */
Items = function() {
	var self = {
		array: []
	};

	self.addItem = function(itemID, name, equip) {
		self.array.push({
			itemID: itemID,
			name: name,
			equip: equip
		});
	}

	// Return item when given name, return -1 if not found
	self.getItem = function(itemID) {

		for (var i = 0; i < self.array.length; i++) {
			if (self.array[i].itemID == itemID) {
				return self.array[i];
			}
		}
		return -1;
	}

	return self;
}


/* Shop is entity with an inventory + price
 */
Shop = function(x, y, width, height) {
	var self = entity(x, y, width, height);
	self.inventory = [];

	self.thankTime = gameTick * 1;
	self.thankTimer = 0;

	self.update = function() {
		if (self.thankTimer > 0) { self.thankTimer--; }
	}	

	// Add item to inventory
	self.addItem = function(itemID, price) {
		self.inventory.push({
			itemID: itemID,
			name: (items.getItem(itemID)).name,
			price: price
		});
	}

	// Return item price
	self.getPrice = function(itemID) {
		for (var i = 0; i < self.inventory.length; i++) {
			if (self.inventory[i].itemID == itemID) {
				return self.inventory[i].price;
			}
		}
		return -1;
	}

	self.thank = function() {
		self.thankTimer = self.thankTime;
	}

	return self;
}



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
const playerSpeed = 5; // Pixels moved per gametick
const gameTick = 32;
var debug = false;



// Taking in arguments when executed
if (process.argv.length > 2) {
	if (process.argv[2] == "debug") {
		debug = true;
		console.log("\nDEBUG MODE========================\n")
	}
}

// Take in console input
/*
  players - lists all the players on the server
  give [userID] [itemID] - gives a player an item
  pList - displays the pList
  chat - displays current chat history
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

		// chat command
		} else if (args[0] == "chat") {
			console.log(chatHistory);

		} else {
			console.log("Unknown command");
		}

	} else if (args.length == 3) {

		// give [userID] [itemID]
		if (args[0] == "give") {
			if (args[1] in pList) {
				if (args[2] >= 0 && args[2] < items.array.length) {
					pList[args[1]].invent.push(parseInt(args[2]));
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
			var player = Player(socket.id, 750, 350, data, -1, -1, playerSpeed,
			                     "right", -1, -1, -1, [], "none", "none", 9999);

			// Add new player into the server information + save socket
			socketList[socket.id] = socket;
			pList[socket.id] = player;

			socket.emit('updateState', pList)

			// Give player the server state + specific values
			socket.emit('initDone', {
				tick: gameTick, 
				debug: debug, 
				items: items, 
				shop: shop
			});
			

			console.log("[" + data + "] has joined ------------- total players online = " + Object.keys(pList).length);


		// Error if null username submitted
		} else {
			console.log("no name submitted");
			socket.emit('nullName');
		}
	});

	// Disconnect player and update players on new player count
	socket.on('disconnect', function() {
		if (pList[socket.id] != undefined) {
			console.log("player with id [" + socket.id + "] DISCONNECTED!!! ---------- players remaining = " + Object.keys(pList).length);
			delete pList[socket.id];
		}
	});

	// Player selected a spot to move to
	socket.on('movement', function(data) {
		if (pList[socket.id] != undefined) {

			//=========================================================
			// Check if location is valid <- do once you implement location
			// CHANGE ..... its sending its current position
			

			// Only allow movement if you are not DEAD
			if (pList[socket.id].state != "dead") {
				var punchTarget = mouseOverPlayers(socket.id, data.clickX, data.clickY);

				// Setting intent
				if (fishArea.mouseOver(data.clickX, data.clickY)) {
					pList[socket.id].intent = "fish";
				} else if (shop.mouseOver(data.clickX, data.clickY)) {
					pList[socket.id].intent = "shop";

				// Looking to punch someone with boxing glove
				} else if (pList[socket.id].hand == 3 && (punchTarget != -1)) {
					pList[socket.id].intent = "punch";
					pList[socket.id].punchTarget = punchTarget;
					debugMsg("i wanna punch " + pList[punchTarget].name);
				} else {	
					pList[socket.id].intent = "none";
				}

				debugMsg("intent = " + pList[socket.id].intent);

				// Setting destination and facing
				pList[socket.id].xDes = data.clickX;
				pList[socket.id].yDes = data.clickY;
				if (pList[socket.id].xDes - pList[socket.id].x >= 0) {
					pList[socket.id].facing = "right";
				} else {
					pList[socket.id].facing = "left";
				}
			}
		}
	});

	// Player sent a message
	socket.on('chat', function(data) {
		if (pList[socket.id] != undefined) {
			console.log("Received message[" + data + "] from player " + socket.id);
			chatHistory.pushMsg(pList[socket.id].name, data);

			// Set player's last message sent
			pList[socket.id].lastMsg = data;
			pList[socket.id].lastMsgTime = gameTick * 5;
		}
	});



	
	// Player equip an item
	socket.on('equip', function(itemID) {

		// Check if player even has the item... hehe
		if (pList[socket.id].invent.includes(itemID)) {
			debugMsg("Player " + pList[socket.id].name + " equiped item " + itemID);

			var slot = items.getItem(itemID).equip;
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
	socket.on('removeEquip', function(equip) {
		debugMsg("Player " + pList[socket.id].name + " unequiped item from " + equip);
		if (equip == "head") {
			pList[socket.id].head = -1;
		} else if (equip == "body") {
			pList[socket.id].body = -1;
		} else if (equip == "hand") {
			pList[socket.id].hand = -1;
		}
	});

	// Player trying to buy item from shop
	socket.on('buyItem', function(itemID) {
		if (pList[socket.id].state == "shop" && pList[socket.id].money >= shop.getPrice(itemID)) {
			debugMsg("money = " + pList[socket.id].money + "   ---> get Price = " + shop.getPrice(itemID) + " item id ==" + itemID);
			pList[socket.id].invent.push(itemID);
			pList[socket.id].money -= shop.getPrice(itemID);
			debugMsg(pList[socket.id].name + " bought a" + (items.getItem(itemID)).name);
			shop.thank();  // thank the shop keeper

			// Tell player to create the money animation
			socketList[socket.id].emit('money', "-"+shop.getPrice(itemID));
		} else {
			debugMsg(pList[socket.id].name + "can't buy "+ (items.getItem(itemID)).name+ "= not enough moeny");
		}
	});
});



// Testing entities
var fishArea = entity(890, 550, 130, 109);
var chatHistory = Chat(10);

// Items array
var items = Items();
items.addItem(0, "lollypop", "hand");
items.addItem(1, "helmet", "head");
items.addItem(2, "armour", "body");
items.addItem(3, "glove", "hand");

// Shop
var shop = Shop(465, 430, 145, 143);
shop.addItem(0, 50);
shop.addItem(1, 100);
shop.addItem(2, 69);
shop.addItem(3, 999);

// Collision array
var collisions = [];
collisions.push(entity(1252+150, 231+150, 300, 300));
collisions.push(entity(714+350, 507+200, 700, 400));
collisions.push(entity(182+400, 689+200, 800, 400));


// Server game loop @ 32 ticks
setInterval(function() {

	// Update all players
	for (var i in pList) {
		pList[i].update();
	}

	// Update the shop
	shop.update();

	// Broadcast everyone's new states + chat
	for (var i in socketList) {
		socketList[i].emit('updateState', pList);
		socketList[i].emit('updateChat', chatHistory.array);
		socketList[i].emit('shopThank', shop.thankTimer);
	}


}, 1000/gameTick);




// ========================================
// Functions
// ========================================



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

// Checks if mouse is over any players or not   (returns socketID if true or -1 if false)
function mouseOverPlayers(socketID, mouseX, mouseY) {
	for (var i in pList) {
		if (i != socketID) {
			if (pList[i].mouseOver(mouseX, mouseY)) {
				return i;
			}
		}
	}
	return -1;
}