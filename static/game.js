var socket = io();

// Local variables
var shutdown = false;             // Indicates if server is shutting down
var initialised = false;          // Indicates if player has initialised his name

// Local player variable
var player = {
	name: "",
	xPos: 100,
	yPos: 100,
	xDes: 100,
	yDes: 100,
	moveAngle: 0,
	moving: false,
	facing: "right",
	chat: ""
};


var localPList;               // Local array containing other player's position

var displayChat = 0;               // Display local player's chat?
var otherChat = {};                // Store's other player's chats to be rendered


var playerSpeed;
var gameTick;

// Global stick figure image
var stickman = new Image();
stickman.src = "static/stickman.png";

// Focus the username field
document.getElementById('userInput').focus();



// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
canvas.width = 1500;
canvas.height = 700;
context.font = "20px Arial";


// Submit username via enter key
document.getElementById('userInput').onkeypress = function(event) {
	console.log("enter pressed yee the boiz");
    switch (event.keyCode) {
    	case 13:
    	    setName();
    	    break;
    }
};

// Set username from login prompt
function setName() {
    player.name = document.getElementById('userInput').value;
    console.log("user's name = " + player.name);

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

	// Remove login form
	document.getElementById('login').style.display = "none";
	document.getElementById('hud').style.display = "block";
	document.getElementById('playerNum').style.display = "block";
	document.getElementById('playerName').style.display = "block";
	
	initialised = true;
});







// Update the player number counter when player joins or leaves
socket.on('playerNum', function(data) {

	// Update the number displayed on the HTML
    document.getElementById('playerNum').innerHTML = "Players online: " + data;
    console.log("got the num packet =" + data);
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
	console.log("Requesting to disconnect...");
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
		console.log("updating word!!!");
		otherChat[data.id].chat = data.msg;
		otherChat[data.id].displayChat++;

	// Setup hash for player
	} else {
		console.log("creating new entry in hash")
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


// Player clicked to move somewhere
document.addEventListener("click", function(event) {
	if (initialised) {

		//===========================================================
		// Should client side check here - once you implement locations
		//===========================================================

		player.xDes = event.offsetX;
		player.yDes = event.offsetY;
		player.moveAngle = getMoveAngle(player.xPos, player.xDes, player.yPos, player.yDes);
		console.log("I want to move to [" + player.xDes + " , " + player.yDes + "]   Angle = " 
			                                    + Math.round(player.moveAngle*180/Math.PI) + " degs");
		player.moving = true;

		// Set the facing direction
		if (player.xDes - player.xPos >= 0) {
			player.facing = "right";
			console.log("right");
		} else {
			console.log("left");
			player.facing = "left";
		}
		console.log("player facing = " + player.facing);

		document.getElementById('chatbox').focus();

		var target = {
			xDes: player.xDes,
			yDes: player.yDes
		}
		socket.emit('movement', target);
	}
});



// Pressing enter to send chat message
document.onkeypress = function(event) {
    switch (event.keyCode) {
    	case 13:
		console.log("Press enter for chat message");

    	// Send chat message to server if not empty
		var text = document.getElementById("chatbox").value;
		if (text != "") {
			console.log("Sent msg to server");
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
    }
};




// Client game loop
function mainLoop() {
	if (initialised) {
		context.clearRect(0, 0, canvas.width, canvas.height);

		// Draw player position
		updatePlayer();
		updateOtherPlayers();
		drawPlayer();
		drawOtherPlayers();
		
		// Draw chat
		drawPlayerChat();
		drawOtherChat();

	}
	requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);




// Update the current player's location
function updatePlayer() {

	// Moves the player from current position to destination position (client side prediction)
	var speed = (gameTick*playerSpeed)/60;
	player.xPos = calculateXPos(player.xPos, player.xDes, speed, player.moveAngle);
	player.yPos = calculateYPos(player.yPos, player.yDes, speed, player.moveAngle);
}


// Draw the current player
function drawPlayer() {
	if (player.facing == "right") {
		context.drawImage(stickman, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos-stickman.height/2));	
	} else {
		context.translate(Math.round(player.xPos+stickman.width/2), Math.round(player.yPos-stickman.height/2))
		context.scale(-1, 1);
		context.drawImage(stickman, 0, 0);
		context.setTransform(1, 0, 0, 1, 0, 0)
	}

	// Debugging variables
	drawStickVar(player.name, player.xPos, player.yPos + 40);
	drawStickVar("xPos: " + Math.round(player.xPos), player.xPos, player.yPos + 70);
	drawStickVar("yPos: " + Math.round(player.yPos), player.xPos, player.yPos + 90);
	drawStickVar("facing: " + player.facing, player.xPos, player.yPos + 110);
}



// Update other players
function updateOtherPlayers() {

	var speed = (gameTick*playerSpeed)/60;

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
				context.drawImage(stickman, Math.round(localPList[i].xPos-stickman.width/2), Math.round(localPList[i].yPos-stickman.height/2));	
			} else {
				context.translate(Math.round(localPList[i].xPos+stickman.width/2), Math.round(localPList[i].yPos-stickman.height/2));
				context.scale(-1, 1);
				context.drawImage(stickman, 0, 0);
				context.setTransform(1, 0, 0, 1, 0, 0)
			}

			// Debugging variables
			drawStickVar(localPList[i].name, localPList[i].xPos, localPList[i].yPos + 40);
			drawStickVar("xPos: " + Math.round(localPList[i].xPos), localPList[i].xPos, localPList[i].yPos + 70);
			drawStickVar("yPos: " + Math.round(localPList[i].yPos), localPList[i].xPos, localPList[i].yPos + 90);
			drawStickVar("facing: " + localPList[i].facing, localPList[i].xPos, localPList[i].yPos + 110);
		}
	}
}





// Draw the player's chat on top of their own head
function drawPlayerChat() {
	if (displayChat != 0) {
		context.fillText(player.chat, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos-stickman.height/2-30));
	}
}


// Draw chat for other players
function drawOtherChat() {
	for (key in otherChat) {
		if (otherChat[key].displayChat != 0) {
			console.log("key = " + key + " xPos = " + Math.round(localPList[key].xPos) + "yPos = " + Math.round(localPList[key].yPos));
			context.fillText(otherChat[key].chat, Math.round(localPList[key].xPos-stickman.width/2), Math.round(localPList[key].yPos-stickman.height/2-30));
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
	context.fillText(string, Math.round(xPos-stickman.width/2), Math.round(yPos+stickman.height/2));
}