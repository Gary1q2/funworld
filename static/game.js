var socket = io();

// Local variables
var shutdown = false;             // Indicates if server is shutting down
var initialised = false;          // Indicates if player has initialised his name

// Local player variable
var player = {
	name: "",
	xPos: 100,
	yPos: 100,
	xPosDes: 100,
	yPosDes: 100,
	moveAngle: 0,
	moving: false,
	facing: "right",
	chat: ""
};

// Local playerList array
var localPlayerList;               // Local array containing other player's position
var otherMove = [];                // Array containing queue of other player's positions to be drawn
var currMove;                      // Pop localPlayerList here to interpolate position
var interpolate = false;           


var displayChat = 0;               // Display local player's chat?
var otherChat = {};                // Store's other player's chats to be rendered


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
socket.on('initDone', function() { 

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
	localPlayerList = data;
});


// Another player joined, so update your array
socket.on('otherJoin', function(data, id) {
	if (initialised) {
		localPlayerList[id] = data;
	}
});

// A player left, so remove them from your array
socket.on('otherLeave', function(id) {
	if (initialised) {
		delete localPlayerList[id];
	}
});



// Receive update on player's locations
socket.on('updateState', function(data) {

    // Push other player's location onto queue to be rendered
	otherMove.push(data);
	console.log("Someone is moving... [" + otherMove.length + "]");
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

		player.xPosDes = event.offsetX;
		player.yPosDes = event.offsetY;
		player.moveAngle = getMoveAngle(player.xPos, player.xPosDes, player.yPos, player.yPosDes);
		console.log("I want to move to [" + player.xPosDes + " , " + player.yPosDes + "]   Angle = " 
			                                    + Math.round(player.moveAngle*180/Math.PI) + " degs");
		player.moving = true;

		// Set the facing direction
		if (player.xPosDes - player.xPos >= 0) {
			player.facing = "right";
			console.log("right");
		} else {
			console.log("left");
			player.facing = "left";
		}

		console.log("player facing = " + player.facing);

		// Focus the chat box
		document.getElementById('chatbox').focus();
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


// Send player position to server at every game tick
setInterval(function() {

	if (initialised) {

		// Send the current position of player to the server if it is UPDATING
		if (player.xPos != player.xPosDes || player.yPos != player.yPosDes) {
			var coords = {
				x: player.xPos,
				y: player.yPos,
				facing: player.facing
			};
			//console.log(coords);
			socket.emit('movement', coords);

			console.log("sent my movement to server...");
			console.log(coords);
		}
	}
}, 1000);



// Client game loop
function mainLoop() {
	if (initialised) {
		context.clearRect(0, 0, canvas.width, canvas.height);
		updatePlayerLoc();
		drawPlayer();
		updateDrawOtherPlayers();
		drawPlayerChat();
		drawOtherChat();
	}
	requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);


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
			console.log("key = " + key + " xPos = " + Math.round(localPlayerList[key].xPos) + "yPos = " + Math.round(localPlayerList[key].yPos));
			context.fillText(otherChat[key].chat, Math.round(localPlayerList[key].xPos-stickman.width/2), Math.round(localPlayerList[key].yPos-stickman.height/2-30));
		}
	}
}


// Update the current player's location
function updatePlayerLoc() {

	// Moves the player from current position to destination position (client side prediction)
	var speed = 8;
	player.xPos = calculateXPos(player.xPos, player.xPosDes, speed, player.moveAngle);
	player.yPos = calculateYPos(player.yPos, player.yPosDes, speed, player.moveAngle);

	// Just reached the destination -> so send location...
	if (player.moving == true && player.xPos == player.xPosDes && player.yPos == player.yPosDes) {
		player.moving = false;
		var coords = {
			x: player.xPos,
			y: player.yPos,
			facing: player.facing
		};
		//console.log(coords);
		socket.emit('movement', coords);
		console.log("sent my movement to server... - reached destination");
	}
}


// Draw the player
function drawPlayer() {
	// Draws the current player
	if (player.facing == "right") {
		context.drawImage(stickman, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos-stickman.height/2));	
	} else {
		context.translate(Math.round(player.xPos+stickman.width/2), Math.round(player.yPos-stickman.height/2))
		context.scale(-1, 1);
		context.drawImage(stickman, 0, 0);
		context.setTransform(1, 0, 0, 1, 0, 0)
	}

	//console.log("pplayer facing = " + player.facing);	

	context.fillText(player.name, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos+stickman.height/2+40));
	context.fillText("xPos: " + Math.round(player.xPos), Math.round(player.xPos-stickman.width/2), Math.round(player.yPos+stickman.height/2+70));
	context.fillText("yPos: " + Math.round(player.yPos), Math.round(player.xPos-stickman.width/2), Math.round(player.yPos+stickman.height/2+90));
	context.fillText("facing: " + player.facing, Math.round(player.xPos-stickman.width/2), Math.round(player.yPos+stickman.height/2+110));
}



// Update and draw other players
function updateDrawOtherPlayers() {

	// Pop the player's movement off the queue and RENDER THEM ALL!!!
	//===================================================================

	//==================================================================

	// Other players have moved, interpolate their positions
	if (interpolate == false && otherMove.length > 0) {
		currMove = otherMove.pop();
		console.log("Popped off ["+ otherMove.length +"]")
		interpolate = true;


		// Update the other player's facing direction
		for (key in currMove) {
			localPlayerList[key].facing = currMove[key].facing;
		}
	} 

	if (interpolate == true) {
		var done = true;
		for (i in currMove) {
			if (i != socket.id) {
				console.log("BEFOREEEE  LocalList = ["+localPlayerList[i].xPos+","+localPlayerList[i].yPos+"]    CurrMove = ["+currMove[i].xPos+","+currMove[i].yPos+"]");
				
				otherMoveAngle = getMoveAngle(localPlayerList[i].xPos, currMove[i].xPos, localPlayerList[i].yPos, currMove[i].yPos);
				console.log("other move angle = " + otherMoveAngle + "   cos(moveANgle) = " + Math.cos(otherMoveAngle));

				localPlayerList[i].xPos = calculateXPos(localPlayerList[i].xPos, currMove[i].xPos, 8, otherMoveAngle);
				localPlayerList[i].yPos = calculateYPos(localPlayerList[i].yPos, currMove[i].yPos, 8, otherMoveAngle);

				// Draw stickman facing left or right
				if (localPlayerList[i].facing == "right") {
					context.drawImage(stickman, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos-stickman.height/2));	
				} else {
					context.translate(Math.round(localPlayerList[i].xPos+stickman.width/2), Math.round(localPlayerList[i].yPos-stickman.height/2))
					context.scale(-1, 1);
					context.drawImage(stickman, 0, 0);
					context.setTransform(1, 0, 0, 1, 0, 0)
				}


				// Draw helpful variables
				context.fillText(localPlayerList[i].name, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+40));
				context.fillText("xPos: " + localPlayerList[i].xPos, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+70));
				context.fillText("yPos: " + localPlayerList[i].yPos, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+90));
				context.fillText("facing: " + currMove[i].facing, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+110));
			

				if (localPlayerList[i].xPos != currMove[i].xPos || localPlayerList[i].yPos != currMove[i].yPos) {
					done = false;
					console.log("done set to false");
					console.log(localPlayerList[i].xPos + " " + currMove[i].xPos + " " + localPlayerList[i].yPos + " " + currMove[i].yPos);
				}
				console.log("AFTER   LocalList = ["+localPlayerList[i].xPos+","+localPlayerList[i].yPos+"]    CurrMove = ["+currMove[i].xPos+","+currMove[i].yPos+"]");
			}

		}

		if (done == true) {
			interpolate = false;
			console.log("interpolate FALSED");
		}
	





	// Other players haven't moved, so just render the same location
	} else {
		//console.log("shud be printing local state");
		for (i in localPlayerList) {
			if (i != socket.id) {

				// Draw stickman facing left or right
				if (localPlayerList[i].facing == "right") {
					context.drawImage(stickman, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos-stickman.height/2));	
				} else {
					context.translate(Math.round(localPlayerList[i].xPos+stickman.width/2), Math.round(localPlayerList[i].yPos-stickman.height/2))
					context.scale(-1, 1);
					context.drawImage(stickman, 0, 0);
					context.setTransform(1, 0, 0, 1, 0, 0)
				}
			
				// Draw helpful variables
				context.fillText(localPlayerList[i].name, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+40));
				context.fillText("xPos: " + localPlayerList[i].xPos, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+70));
				context.fillText("yPos: " + localPlayerList[i].yPos, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+90));
				context.fillText("facing: " + localPlayerList[i].facing, Math.round(localPlayerList[i].xPos-stickman.width/2), Math.round(localPlayerList[i].yPos+stickman.height/2+110));
			}
		}
	}
}



// Moves the player x location on the x axis
// Given the player's current x position, destination x postion & speed
function calculateXPos(xPos, xPosDes, speed, angle) {
	if (Math.abs(xPosDes - xPos) > speed*Math.cos(angle)) {
		if (xPos < xPosDes) {
			return (xPos + (speed*Math.cos(angle)));
		} else if (xPos > xPosDes) {
			return (xPos - (speed*Math.cos(angle)));
		}
	} else if (Math.abs(xPosDes - xPos) > 0) {
		return xPosDes;
	} else {
		return xPos;
	}
}

// Moves the player y location on the y axis
// Given the player's current y position, destination y postion & speed
function calculateYPos(yPos, yPosDes, speed, angle) {
	if (Math.abs(yPosDes - yPos) > speed*Math.sin(angle)) {
		if (yPos < yPosDes) {
			return (yPos + (speed*Math.sin(angle)));
		} else if (yPos > yPosDes) {
			return (yPos - (speed*Math.sin(angle)));
		}
	} else if (Math.abs(yPosDes - yPos) > 0) {
		return yPosDes;
	} else {
		return yPos;
	}
}

// Calculate the move angle given the player's current position and destination
function getMoveAngle(xPos, xPosDes, yPos, yPosDes) {
	return Math.abs(Math.atan((Math.abs(yPosDes-yPos)/(xPosDes-xPos))));
}