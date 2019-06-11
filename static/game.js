var socket = io();

// Local variables
var playerName = "";
var shutdown = false;
var initialised = false;


document.getElementById('userInput').focus();   // Focus the username field



// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');



canvas.width = 1500;
canvas.height = 700;
//console.log("canvas width = " + document.getElementById('hud').value + "---- canvas height = " + canvas.style.height);
context.font = "20px Arial";


// Player number updated
socket.on('playerNum', function(data) {

	// Remove login form if it's still there
	if (document.getElementById('login').style.display != "none") {
		document.getElementById('login').style.display = "none";
		document.getElementById('hud').style.display = "block";
		document.getElementById('playerNum').style.display = "block";
		document.getElementById('playerName').style.display = "block";
	}

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

// Set username from login prompt
function setName() {
    playerName = document.getElementById('userInput').value;
    console.log("user's name = " + playerName);

    document.getElementById('playerName').innerHTML = playerName;

    // Notify server to setup new player
	socket.emit('new player', playerName);
}

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

// Draw gamestate when received from server
socket.on('gameState', function(data) {
	//console.log("received game state");
	//console.log(data);
	var stickman = new Image();
	stickman.src = "static/stickman.png";

	context.clearRect(0, 0, canvas.width, canvas.height);
	for (i in data) {
		context.drawImage(stickman, data[i].xPos-stickman.width/2, data[i].yPos-stickman.height/2);
		context.fillText(data[i].name, data[i].xPos-stickman.width/2, data[i].yPos+stickman.height/2+40);

		context.fillText("xPos: " + data[i].xPos, data[i].xPos-stickman.width/2, data[i].yPos+stickman.height/2+70);
		context.fillText("yPos: " + data[i].yPos, data[i].xPos-stickman.width/2, data[i].yPos+stickman.height/2+90);
	}
	//console.log(data);
});

// Let player know we have been initialised properly
socket.on('initDone', function() { 
	initialised = true;
});



document.addEventListener("click", function(event) {
	if (initialised) {
		var coords = {
			x: event.offsetX,
			y: event.offsetY
		};
		console.log(coords);
		socket.emit('movement', coords);
	}
});