// Deals with logging into the game

// Focus the username field
document.getElementById('userInput').focus();

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

    // Notify server to setup new player
	socket.emit('new player', document.getElementById('userInput').value);
}

// User didn't enter a name
socket.on('nullName', function() {
	var toChange = document.getElementById('login').childNodes[0];
	toChange.nodeValue = 'Enter your name: User must not be null';
    document.getElementById('userInput').focus();
});


// Let player know we have been initialised properly
socket.on('initDone', function(data) { 

    //player.name = data.name;

    //player.speed = data.spd;
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
    setInterval(gameLoop, 1000/gameTick);
});