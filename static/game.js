var socket = io();

// Local variables
var shutdown = false;
var initialised = false;

// Local player variable
var player = {
	name: "",
	xPos: 100,
	yPos: 100,
	xPosDes: 100,
	yPosDes: 100
};

// Local playerList array
var localPlayerList;
var movementQueue = {};
var shifting = false;


// Focus the username field
document.getElementById('userInput').focus();



// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
canvas.width = 1500;
canvas.height = 700;
//console.log("canvas width = " + document.getElementById('hud').value + "---- canvas height = " + canvas.style.height);
context.font = "20px Arial";




// Set username from login prompt
function setName() {
    player.name = document.getElementById('userInput').value;
    console.log("user's name = " + player.name);

    document.getElementById('playerName').innerHTML = player.name;

    // Notify server to setup new player
	socket.emit('new player', player.name);
}

// Update the player number counter when player joins or leaves
socket.on('playerNum', function(data) {

	// Remove login form if it's still there
	if (document.getElementById('login').style.display != "none") {
		document.getElementById('login').style.display = "none";
		document.getElementById('hud').style.display = "block";
		document.getElementById('playerNum').style.display = "block";
		document.getElementById('playerName').style.display = "block";
	}

	// Update the number displayed on the HTML
    document.getElementById('playerNum').innerHTML = "Players online: " + data;
    console.log("got the num packet =" + data);
});


// User didn't enter a name
socket.on('nullName', function() {
	var toChange = document.getElementById('login').childNodes[0];
	toChange.nodeValue = 'Enter your name: User must not be null';
    document.getElementById('userInput').focus();
});

// Server shutting down, prevent new actions
socket.on('shutdown', function() {
	shutdown = true;

	/*
	shutdown = true (should negate anymore actions that the player makes)
	*/
});



// Submit username via enter key
document.getElementById('userInput').onkeypress = function(event) {
	console.log("enter pressed yee the boiz");
    switch (event.keyCode) {
    	case 13:
    	    setName();
    	    break;
    }
};

// Disconnect from the server GRACEFULLY
function disconnect() {
	console.log("Requesting to disconnect...");
	socket.disconnect();
}

// Receive gamestate from server
socket.on('gameState', function(data) {
	localPlayerList = data;

	// push all that info into a queue for every single
	movementQueue.push(localPlayerList);
});

// Let player know we have been initialised properly
socket.on('initDone', function() { 
	initialised = true;
});


// Player clicked to move somewhere
document.addEventListener("click", function(event) {
	if (initialised) {

		//===========================================================
		// Should client side check here - once you implement locations
		//===========================================================

		player.xPosDes = event.offsetX;
		player.yPosDes = event.offsetY;
		console.log("I want to move to [" + player.xPosDes + " , " + player.yPosDes + "]");
	}
});


// Send player position to server at every game tick
setInterval(function() {

	if (initialised) {

		// Send the current position of player to the server if it is UPDATING
		if (player.xPos != player.xPosDes || player.yPos != player.yPosDes) {
			var coords = {
				x: player.xPos,
				y: player.yPos
			};
			console.log(coords);
			socket.emit('movement', coords);
		}
	}
}, 1000/4);




// Render loop - 32 ticks/sec
setInterval(function() {

	// Pop the player's movement off the queue and RENDER THEM ALL!!!
	//===================================================================

	//==================================================================
	if (shifting == false && movementQueue != undefined) {
		shifting = true;
		var temp = movementQueue.pop();
		for (i in temp) {
			if (Math.abs(player.xPosDes - player.xPos) > speed) {
				if (player.xPos < player.xPosDes) {
					player.xPos += speed;
				} else if (player.xPos > player.xPosDes) {
					player.xPos -= speed;
				}
			} else if (Math.abs(player.xPosDes - player.xPos) > 0) {
				player.xPos = player.xPosDes;
			}
			if (Math.abs(player.yPosDes - player.yPos) > speed) {
				if (player.yPos < player.yPosDes) {
					player.yPos += speed;
				} else if (player.yPos > player.yPosDes) {
					player.yPos -= speed;
				}
			} else if (Math.abs(player.yPosDes - player.yPos) > 0) {
				player.yPos = player.yPosDes;
			}


		}
	} else {

		// Draws other players
		for (i in localPlayerList) {
			if (i != socket.id) {
				context.drawImage(stickman, localPlayerList[i].xPos-stickman.width/2, localPlayerList[i].yPos-stickman.height/2);
				context.fillText(localPlayerList[i].name, localPlayerList[i].xPos-stickman.width/2, localPlayerList[i].yPos+stickman.height/2+40);

				context.fillText("xPos: " + localPlayerList[i].xPos, localPlayerList[i].xPos-stickman.width/2, localPlayerList[i].yPos+stickman.height/2+70);
				context.fillText("yPos: " + localPlayerList[i].yPos, localPlayerList[i].xPos-stickman.width/2, localPlayerList[i].yPos+stickman.height/2+90);
			}
		}
	}


	// Moves the player from current position to destination position (client side prediction)
	var speed = 8;
	if (Math.abs(player.xPosDes - player.xPos) > speed) {
		if (player.xPos < player.xPosDes) {
			player.xPos += speed;
		} else if (player.xPos > player.xPosDes) {
			player.xPos -= speed;
		}
	} else if (Math.abs(player.xPosDes - player.xPos) > 0) {
		player.xPos = player.xPosDes;
	}
	if (Math.abs(player.yPosDes - player.yPos) > speed) {
		if (player.yPos < player.yPosDes) {
			player.yPos += speed;
		} else if (player.yPos > player.yPosDes) {
			player.yPos -= speed;
		}
	} else if (Math.abs(player.yPosDes - player.yPos) > 0) {
		player.yPos = player.yPosDes;
	}


	// Draws the current player
	var stickman = new Image();
	stickman.src = "static/stickman.png";
	context.clearRect(0, 0, canvas.width, canvas.height);
	context.drawImage(stickman, player.xPos-stickman.width/2, player.yPos-stickman.height/2);
	context.fillText(player.name, player.xPos-stickman.width/2, player.yPos+stickman.height/2+40);
	context.fillText("xPos: " + player.xPos, player.xPos-stickman.width/2, player.yPos+stickman.height/2+70);
	context.fillText("yPos: " + player.yPos, player.xPos-stickman.width/2, player.yPos+stickman.height/2+90);

}, 1000/32);


