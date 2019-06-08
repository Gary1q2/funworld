// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);


app.set('port', (process.env.PORT || 6969));
app.use('/static', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});

// Starts the server
server.listen(app.get('port'), function() {
  console.log(`Starting server on port ${app.get('port')}`);
});

// Variables
playerNum = 0;

// Shut server down gracefully upon CTRL + C or interrupt
process.on('SIGINT', function() {
	console.log("I'm shutting down baiii");
	io.sockets.emit('shutdown');
	process.exit()
});

// Handles new player connecitons
io.on('connection', function(socket) {

	// New player submitted their name
	socket.on('new player', function(data) {
		if (data) {
			playerNum++;
	    	console.log("[" + data + "] has joined with id [" + socket.id + "] ------------- total players online = " + playerNum);
			io.sockets.emit('playerNum', playerNum);   // Update players on player count

		// Error if null username submitted
		} else {
			console.log("no name submitted");
			socket.emit('nullName');
		}
	});

	// Disconnect player and update players on new player count
	socket.on('disconnect', function() {
		playerNum--;
		console.log("player with id [" + socket.id + "] DISCONNECTED!!! ---------- players remaining = " + playerNum);
		io.sockets.emit('playerNum', playerNum);
	});
});