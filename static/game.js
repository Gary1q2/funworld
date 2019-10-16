// Importing item images
var lollypop = new Image();
lollypop.src = "static/lollypop.png";
var helmet = new Image();
helmet.src = "static/helmet.png";
var armour = new Image();
armour.src = "static/armour.png";

// Importing equipment HUD images
var head = new Image();
head.src = "static/head.png";
var body = new Image();
body.src = "static/body.png";
var hand = new Image();
hand.src = "static/hand.png";

// Setting values for item array
var items = {};
items[0] = {
	name: lollypop,
	equip: "hand"
}
items[1] = {
	name: helmet,
	equip: "head"
}
items[2] = {
	name: armour,
	equip: "body"
}




var socket = io();

// Local variables
var shutdown = false;             // Indicates if server is shutting down
var initialised = false;          // Indicates if player has initialised his name

// Local player variable
var player = {
	name: "",
	xPos: 750,
	yPos: 350,
	xDes: -1,
	yDes: -1,
	moveAngle: 0,
	moving: false,
	facing: "right",
	chat: "",
	collision: false,
	head: -1,
	body: -1,
	hand: -1,
	invent: [0, 1, 2]
};


var localPList;               // Local array containing other player's position

var displayChat = 0;               // Display local player's chat?
var otherChat = {};                // Store's other player's chats to be rendered


var playerSpeed;
var gameTick;

var debug = false;

var inventOpen = false;   // if inventory is opened or not

// Global stick figure image
var stickman = new Image();
stickman.src = "static/stickman.png";

var stickColW = 40;
var stickColH = 100;

var bg = new Image();
bg.src = "static/bg_test.png";

// Focus the username field
document.getElementById('userInput').focus();



// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = 1500;
canvas.height = 800;
ctx.font = "20px Arial";


var collisions = [];
var rect = {x: 1252, y: 231, h: 300, w: 300};
collisions.push(rect);
var rect = {x: 714,	y: 507,	h: 400,	w: 700};
collisions.push(rect);
var rect = {x: 182,	y: 689,	h: 400,	w: 800};
collisions.push(rect);


var mouse_x = -1;
var mouse_y = -1;


// Submit username via enter key
document.getElementById('userInput').onkeypress = function(event) {
	debugMsg("enter pressed yee the boiz");
    switch (event.keyCode) {
    	case 13:
    	    setName();
    	    break;
    }
};

// Set username from login prompt
function setName() {
    player.name = document.getElementById('userInput').value;
    debugMsg("user's name = " + player.name);

    document.getElementById('playerName').innerHTML = player.name;

    // Notify server to setup new player
	socket.emit('new player', player.name);
}

// User didn't enter a name
socket.on('nullName', function() {
	var toChange = document.getElementById('login').childNodes[0];
	toChange.nodeValue = 'Enter your name: User must not be null';
    document.getElementById('userInput').focus();
});

// Let player know we have been initialised properly
socket.on('initDone', function(data) { 

	playerSpeed = data.spd;
	gameTick = data.tick;
	debug = data.debug;

	// Remove login form
	document.getElementById('login').style.display = "none";
	document.getElementById('hud').style.display = "block";
	document.getElementById('playerNum').style.display = "block";
	document.getElementById('playerName').style.display = "block";
	document.getElementById('chatbox').style.display = "block";
	
	// Start the main loop
	initialised = true;
	setInterval(mainLoop, 1000/gameTick);
});

// Update the player number counter when player joins or leaves
socket.on('playerNum', function(data) {

	// Update the number displayed on the HTML
    document.getElementById('playerNum').innerHTML = "Players online: " + data;
    debugMsg("got the num packet =" + data);
});

// Server shutting down, prevent new actions
socket.on('shutdown', function() {
	shutdown = true;

	/*
	shutdown = true (should negate anymore actions that the player makes)
	*/
});

// Disconnect from the server GRACEFULLY
function disconnect() {
	debugMsg("Requesting to disconnect...");
	socket.disconnect();
}

// Receive initial gamestate from server
socket.on('gameState', function(data) {
	localPList = data;
});


// Another player joined, so update your array
socket.on('otherJoin', function(data, id) {
	if (initialised) {
		localPList[id] = data;
	}
});

// A player left, so remove them from your array
socket.on('otherLeave', function(id) {
	if (initialised) {
		delete localPList[id];
	}
});


// Receive update on player's locations
socket.on('updateState', function(data) {

	for (i in data) {
		localPList[i].xDes = data[i].xPos;
		localPList[i].yDes = data[i].yPos;
		localPList[i].facing = data[i].facing;
	}
});

// Receive chat from other player
socket.on("playerChat", function(data) {

	// Update new word to display
	if (data.id in otherChat) {
		debugMsg("updating word!!!");
		otherChat[data.id].chat = data.msg;
		otherChat[data.id].displayChat++;

	// Setup hash for player
	} else {
		debugMsg("creating new entry in hash")
		otherChat[data.id] = {
			chat: data.msg,
			displayChat: 1
		};
	}

	// Make the text stop showing
	setTimeout(function() {
		otherChat[data.id].displayChat--;
	}, 5000)
});


// Player clicked on the screen
document.getElementById('canvas').addEventListener("click", function(event) {
	if (initialised) {

		// Clicked the inventory
		if (inventOpen) {
			var itemClicked = inventItemClicked(event.offsetX, event.offsetY);
			debugMsg("CLICKED ON ITEM = " + itemClicked);

			var equipClicked = equipItemClicked(event.offsetX, event.offsetY);
			debugMsg("CLICKED on EQUIPMENT = " + equipClicked);

			// Assign the item clicked to player's equipped item
			if (itemClicked != -1) {
				if (items[itemClicked].equip == "head") {
					player.head = itemClicked;
				} else if (items[itemClicked].equip == "body") {
					player.body = itemClicked;
				} else if (items[itemClicked].equip == "hand") {
					player.hand = itemClicked;
				}
			} else if (equipClicked != -1) {
				if (equipClicked == "head") {
					player.head = -1;
				} else if (equipClicked == "body") {
					player.body = -1;
				} else if (equipClicked == "hand") {
					player.hand = -1;
				}
			}
			// ===============================================
			// CAN ONLY CLICK ON EITHER INVENTORY OR EQUIPMENT ONLY RIGHT NOW
			// OVERRIDESSSS

			// ================================================


		// Move the player
		} else {

			//===========================================================
			// Should client side check here - once you implement locations
			//===========================================================

			player.xDes = event.offsetX;
			player.yDes = event.offsetY;
			mouse_x = event.offsetX;
			mouse_y = event.offsetY;
			player.moveAngle = getMoveAngle(player.xPos, player.xDes, player.yPos, player.yDes);
			debugMsg("I want to move to [" + player.xDes + " , " + player.yDes + "]   Angle = " 
				                                    + Math.round(player.moveAngle*180/Math.PI) + " degs");
			player.moving = true;

			// Set the facing direction
			if (player.xDes - player.xPos >= 0) {
				player.facing = "right";
				debugMsg("right");
			} else {
				debugMsg("left");
				player.facing = "left";
			}
			debugMsg("player facing = " + player.facing);

			document.getElementById('chatbox').focus();
		}
	}
}, true);

// Handling key presses
document.onkeypress = function(event) {
	//debugMsg("pressed key code " + event.keyCode);
    switch (event.keyCode) {

    	// Press enter to send chat
    	case 13:
			debugMsg("Press enter for chat message");

	    	// Send chat message to server if not empty
			var text = document.getElementById("chatbox").value;
			if (text != "") {
				debugMsg("Sent msg to server");
		    	socket.emit('chat', text);
		    	document.getElementById("chatbox").value = "";
			}

			// Prepare chat to be rendered
			player.chat = text;
			displayChat++;
			setTimeout(function() {
				displayChat--;
			}, 5000);
		    break;

		// Press I for inventory    
	    case 73:
	    case 105:
	    	inventOpen = !inventOpen;
	    	debugMsg("inventory opened = " + inventOpen);
	    	break;
    }
};



// Client game loop
function mainLoop() {
	if (initialised) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(bg, 0, 0);
		player.collision = checkCollision(player.xPos, player.yPos);

		// Send position to server
		socket.emit('movement', {
			x: player.xPos,
			y: player.yPos,
			facing: player.facing
		});

		// Draw player position
		updatePlayer();
		updateOtherPlayers();
		drawPlayer();
		drawOtherPlayers();
		
		// Draw chat
		drawPlayerChat();
		drawOtherChat();

		// Draw player's equipped items
		drawEquipped();

		// Draw inventory (if opened)
		if (inventOpen) {
			drawInventory();
		}

		// Some debugging stuff
		if (debug) { 
			drawCollisions(); 
			ctx.fillText("[" + mouse_x + "," + mouse_y + "]", 50, 50);
		}
	}
}

// Returns the equipment (head, body or hand) that was clicked
// -1 if nothing
function equipItemClicked(mouseX, mouseY) {
	var equipX = 1000;
	var equipY = 100;
	var len = 60;
	if (mouseX >= equipX-len/2 && mouseX <= equipX+len/2 && mouseY >= equipY-len/2 && mouseY <= equipY+len/2) {
		return "head";
	} else if (mouseX >= equipX-len/2 && mouseX <= equipX+len/2 && mouseY >= equipY+len-len/2 && mouseY <= equipY+len+len/2) {
		return "body";
	} else if (mouseX >= equipX-len-len/2 && mouseX <= equipX-len+len/2 && mouseY >= equipY+len-len/2 && mouseY <= equipY+len+len/2) {
		return "hand";
	}
	return -1;
}

// Returns the item id clicked in the inventory
function inventItemClicked(mouseX, mouseY) {

	var xLoc = 700;
	var yLoc = 100;
	var itemW = 60;
	var itemH = 60;
	var border = 20;

	// Check if clicked on an item
	for (var i = 0; i < player.invent.length; i++) {
		if (mouseX >= xLoc && mouseX <= xLoc + itemW && mouseY >= yLoc + (i * itemH) && mouseY <= yLoc + (i * itemH) + itemH) {
			return player.invent[i];
		}
	}

	// If nothing returns -1
	return -1;
}

// Draw the player's equipped items
function drawEquipped() {
	if (player.head != -1) {
		ctx.drawImage(items[player.head].name, player.xPos-stickColW/2, player.yPos-stickColH/2 - 10);
	}
	if (player.body != -1) {
		ctx.drawImage(items[player.body].name, player.xPos-stickColW/2, player.yPos-stickColH/2+20);
	}
	if (player.hand != -1) {
		ctx.drawImage(items[player.hand].name, player.xPos-stickColW/2+20, player.yPos-stickColH/2);
	}	
}

// Draw the player's inventory
function drawInventory() {

	var xLoc = 700;
	var yLoc = 100;
	var itemW = 60;
	var itemH = 60;
	var border = 20;

	// Draw the inventory
	for (var i = 0; i < player.invent.length; i++) {

		// Draw rectangles
		ctx.beginPath();
		ctx.lineWidth = "2";
		ctx.rect(xLoc, yLoc + (i * itemH), itemW, itemH);
		ctx.stroke();

		// Draw items
		ctx.drawImage(items[player.invent[i]].name, xLoc, yLoc + (i * itemH));
	}

	var equipX = 1000;
	var equipY = 100;
	var len = 60;

	// Draw the equipment screen background
	ctx.drawImage(head, equipX-len/2, equipY-len/2, len, len);
	ctx.drawImage(body, equipX-len/2, equipY+len-len/2, len, len);
	ctx.drawImage(hand, equipX-len-len/2, equipY+len-len/2, len, len);

	// Draw the rectangles for clicking
	ctx.beginPath();
	ctx.lineWidth = "2";
	ctx.rect(equipX-len/2, equipY-len/2, len, len);
	ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = "2";
	ctx.rect(equipX-len/2, equipY+len-len/2, len, len);
	ctx.stroke();

	ctx.beginPath();
	ctx.lineWidth = "2";
	ctx.rect(equipX-len-len/2, equipY+len-len/2, len, len);
	ctx.stroke();

	// Draw equipment on equipment screen
	if (player.head != -1) {
		ctx.drawImage(items[player.head].name, equipX-len/2, equipY-len/2);
	}
	if (player.body != -1) {
		ctx.drawImage(items[player.body].name, equipX-len/2, equipY+len-len/2);
	} 
	if (player.hand != -1) {
		ctx.drawImage(items[player.hand].name, equipX-len-len/2, equipY+len-len/2);
	}
	
	

}

// Draw all the rectangles in the collisions[] + stickman collision
function drawCollisions() {
	// Draw boundary collisions
	for (var i = 0; i < collisions.length; i++) {
		ctx.beginPath();
		ctx.lineWidth = "2";
		ctx.rect(collisions[i].x, collisions[i].y, collisions[i].w, collisions[i].h);
		ctx.stroke();
	}

	// Draw current player collision
	ctx.beginPath();
	ctx.rect(player.xPos-stickColW/2, player.yPos-stickColH/2, stickColW, stickColH);
	ctx.stroke();

	// Draw other player collisions
	for (var i in localPList) {
		if (i != socket.id) {
			ctx.beginPath();
			ctx.rect(localPList[i].xPos-stickColW/2, localPList[i].yPos-stickColH/2, stickColW, stickColH)
			ctx.stroke();
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
	return false;
}

// Update the current player's location
function updatePlayer() {

	// Moves the player from current position to destination position (client side prediction)
	var speed = playerSpeed;

	if (player.xDes != -1 && player.yDes != -1) {

		var tempX = calculateXPos(player.xPos, player.xDes, speed, player.moveAngle);
		var tempY = calculateYPos(player.yPos, player.yDes, speed, player.moveAngle);

		// Stop moving if we reached collision boundary
		if (checkCollision(tempX, tempY)) {
			player.xDes = player.xPos;
			player.yDes = player.yPos;

		// No collision, so keep going :D
		} else {
			player.xPos = tempX;
			player.yPos = tempY;
		}

		// Player reached destination, stop moving
		if (player.xPos == player.xDes && player.yPos == player.yDes) {
			player.xDes = -1;
			player.yDes = -1;
		}
	}
}

// Draw the current player
function drawPlayer() {
	if (player.facing == "right") {
		ctx.drawImage(stickman, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos-stickman.height/2));	
	} else {
		ctx.translate(Math.round(player.xPos+stickman.width/2), Math.round(player.yPos-stickman.height/2))
		ctx.scale(-1, 1);
		ctx.drawImage(stickman, 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0)
	}


	drawStickVar(player.name, player.xPos, player.yPos + 40);

	// Debugging variables
	if (debug) {
		drawStickVar("xPos: " + Math.round(player.xPos), player.xPos, player.yPos + 70);
		drawStickVar("yPos: " + Math.round(player.yPos), player.xPos, player.yPos + 90);
		drawStickVar("facing: " + player.facing, player.xPos, player.yPos + 110);
		drawStickVar("collision: " + player.collision, player.xPos, player.yPos + 130);
	}
}

// Update other players
function updateOtherPlayers() {

	var speed = playerSpeed;

	// Update the positions of other players (if they requiring moving that is)
	for (i in localPList) {
		if (i != socket.id) {
			if (localPList[i].xDes != -1 && localPList[i].yDes != -1) {
				var moveAngle = getMoveAngle(localPList[i].xPos, localPList[i].xDes, localPList[i].yPos, localPList[i].yDes);
				localPList[i].xPos = calculateXPos(localPList[i].xPos, localPList[i].xDes, speed, moveAngle);
				localPList[i].yPos = calculateYPos(localPList[i].yPos, localPList[i].yDes, speed, moveAngle);

				// Player reached destination, no more moving
				if (localPList[i].xPos == localPList[i].xDes && localPList[i].yPos == localPList[i].yDes) {
					localPList[i].xDes = -1;
					localPList[i].yDes = -1;
				}
			}
		}
	}

}

// Draw other players
function drawOtherPlayers() {

	// Draw the positions of other players
	for (i in localPList) {
		if (i != socket.id) {

			// Draw stickman facing left or right
			if (localPList[i].facing == "right") {
				ctx.drawImage(stickman, Math.round(localPList[i].xPos-stickman.width/2), Math.round(localPList[i].yPos-stickman.height/2));	
			} else {
				ctx.translate(Math.round(localPList[i].xPos+stickman.width/2), Math.round(localPList[i].yPos-stickman.height/2));
				ctx.scale(-1, 1);
				ctx.drawImage(stickman, 0, 0);
				ctx.setTransform(1, 0, 0, 1, 0, 0)
			}

			drawStickVar(localPList[i].name, localPList[i].xPos, localPList[i].yPos + 40);

			// Debugging variables
			if (debug) {
				drawStickVar("xPos: " + Math.round(localPList[i].xPos), localPList[i].xPos, localPList[i].yPos + 70);
				drawStickVar("yPos: " + Math.round(localPList[i].yPos), localPList[i].xPos, localPList[i].yPos + 90);
				drawStickVar("facing: " + localPList[i].facing, localPList[i].xPos, localPList[i].yPos + 110);			
			}
		}
	}
}

// Draw the player's chat on top of their own head
function drawPlayerChat() {
	if (displayChat != 0) {
		ctx.fillText(player.chat, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos-stickman.height/2-30));
	}
}

// Draw chat for other players
function drawOtherChat() {
	for (key in otherChat) {
		if (otherChat[key].displayChat != 0) {
			debugMsg("key = " + key + " xPos = " + Math.round(localPList[key].xPos) + "yPos = " + Math.round(localPList[key].yPos));
			ctx.fillText(otherChat[key].chat, Math.round(localPList[key].xPos-stickman.width/2), Math.round(localPList[key].yPos-stickman.height/2-30));
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


// Draws text starting from the origin of the given stickman position
function drawStickVar(string, xPos, yPos) {
	ctx.fillText(string, Math.round(xPos-stickman.width/2), Math.round(yPos+stickman.height/2));
}


// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}