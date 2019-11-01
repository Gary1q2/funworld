// Loading images for other stuff
var images = {};
images.head = new Image();
images.head.src = "static/head.png";
images.body = new Image();
images.body.src = "static/body.png";
images.hand = new Image();
images.hand.src = "static/hand.png";
images.stickman = new Image();
images.stickman.src = "static/stickman.png";
images.bg = new Image();
images.bg.src = "static/bg_test.png";
images.inventClose = new Image();
images.inventClose.src = "static/inventClose.png";
images.inventOpen = new Image();
images.inventOpen.src = "static/inventOpen.png";
images.fishArea = new Image();
images.fishArea.src = "static/fishArea.png";
images.fishingIcon = new Image();
images.fishingIcon.src = "static/fishingIcon.png";
images.fishingRod = new Image();
images.fishingRod.src = "static/fishingRod.png";
images.shop = new Image();
images.shop.src = "static/shop.png";
images.shopIcon = new Image();
images.shopIcon.src = "static/shopIcon.png";
images.collision = new Image();
images.collision.src = "static/collision.png";


var gameTick;
var debug;
var localPList;   // Server state
var pList = {};   // Array of all the players
var chatHistory;

// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.font = "20px Arial";
ctx.lineWidth = 2;


// Receive update on pList
socket.on('updateState', function(data) {
	localPList = data;
});

// Receive update on chat history
socket.on('updateChat', function(data) {
	chatHistory = data;
});


// Player clicked on screen
document.getElementById('ui').addEventListener("click", function(event) {

	// Send position to server
	socket.emit('movement', {
		clickX: event.offsetX,
		clickY: event.offsetY
	});
	document.getElementById('chatbox').focus();
});

// Handling key presses
document.onkeypress = function(event) {

	switch (event.keyCode) {

		// Press enter to send a message
		case 13:
			var msg = document.getElementById("chatbox").value;
			if (msg != "") {
				socket.emit('chat', msg);
				document.getElementById("chatbox").value = "";
			}
			break;
	}
}




// Testing entities
var fishArea = entity(890, 550, images["fishArea"].width, images["fishArea"].height, images["fishArea"]);
var shop = entity(465, 430, images["shop"].width, images["shop"].height, images["shop"]);






// Game loop
function gameLoop() {

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(images["bg"], 0, 0);

	fishArea.update();
	shop.update();


	for (var i in localPList) {
		// Add the player to the local state
		if (!(i in pList)) {
			var temp = localPList[i];
			debugMsg(temp.x + "-" + temp.y);
			var p = Player(temp.x, temp.y, temp.name, temp.xDes, temp.yDes, temp.speed, temp.facing, temp.head, temp.body, temp.hand, temp.invent, temp.intent, temp.state, temp.money);
			pList[i] = p;

		// Update the existing player's state
		} else {
			pList[i].x = localPList[i].x;
			pList[i].y = localPList[i].y;
			pList[i].width = localPList[i].width;
			pList[i].height = localPList[i].height;
			pList[i].name = localPList[i].name;
			pList[i].xDes = localPList[i].xDes;
			pList[i].yDes = localPList[i].yDes;
			pList[i].speed = localPList[i].speed;
			pList[i].facing = localPList[i].facing;
			pList[i].head = localPList[i].head;
			pList[i].body = localPList[i].body;
			pList[i].hand = localPList[i].hand;
			pList[i].invent = localPList[i].invent;
			pList[i].intent = localPList[i].intent
			pList[i].state = localPList[i].state;
			pList[i].money = localPList[i].money;
			pList[i].lastMsg = localPList[i].lastMsg;
			pList[i].lastMsgTime = localPList[i].lastMsgTime;
		}
	}

	// Remove a player thats gone
	for (var i in pList) {
		if (!(i in localPList)) {
			delete pList[i];
		}
	}


	// Draw all the players
	for (var i in pList) {
		pList[i].update();
	}

	// Draw the chat to the screen
	var string = "";
	for (var i = chatHistory.length-1; i >= 0; i--) {
		if (chatHistory[i].name != "") {
			string += chatHistory[i].name+": "+chatHistory[i].msg+"<br/>";
		}
	}
	document.getElementById('chatHistory').innerHTML = string;


	// Update the player number HUD & name
	document.getElementById('playerNum').innerHTML = "Players online: " + Object.keys(pList).length;
    document.getElementById('playerName').innerHTML = pList[socket.id].name;
}


// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}
