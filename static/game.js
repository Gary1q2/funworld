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
images.dead = new Image();
images.dead.src = "static/dead.png";
images.shopThanks = new Image();
images.shopThanks.src = "static/shopThanks.png";

images.lollypop = new Image();
images.lollypop.src = "static/lollypop.png";
images.helmet = new Image();
images.helmet.src = "static/helmet.png";
images.armour = new Image();
images.armour.src = "static/armour.png";
images.glove = new Image();
images.glove.src = "static/glove.png";
images.gloveAnim = new Image();
images.gloveAnim.src = "static/gloveAnim.png";


var gameTick;
var debug;
var localPList;   // Server state
var items;
var chatHistory;


var pList = {};   // Dictionary of all the players

var displayHUD = [];  // Array of all HUD displays

var shutdown = false;
var inventOpen = false;
var canMove = true;       // Determine if player will move or not (double clicking buttons)


var shop;


// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.font = "20px Arial";
ctx.lineWidth = 2;

// Disconnect from the server GRACEFULLY
function disconnect() {
	debugMsg("Requesting to disconnect...");
	socket.disconnect();
}


// Server shutting down, prevent new actions
socket.on('shutdown', function() {
	shutdown = true;

	/*
	shutdown = true (should negate anymore actions that the player makes)
	*/
});

// Receive update on pList
socket.on('updateState', function(data) {
	localPList = data
});

// Receive update on chat history
socket.on('updateChat', function(data) {
	chatHistory = data;
});

socket.on('shopThank', function(data) {
	shop.thankTimer = data;
});

socket.on('money', function(data) {
	var player = pList[socket.id];

	// Override moneys HUDs that already died otherwise push
	var died = false;
	for (var i = 0; i < displayHUD.length; i++) {
		if (displayHUD[i].dieTime == 0) {
			died = true;
			break;
		}
	}
	if (died) {
		displayHUD[i] = movingText(player.x, player.y, 0, -2, "+$"+data, gameTick * 2);
	} else {
		displayHUD.push(movingText(player.x, player.y, 0, -2, "+$"+data, gameTick * 2));
	}

});


// Mouse over different objects
document.getElementById('ui').addEventListener("mousemove", function(event) {

	// Only run this after playerList initialised
	if (pList.length > 0) {

		var mouseX = event.pageX-100;
		var mouseY = event.pageY-20;

		if (fishArea.mouseOver(mouseX, mouseY)) {
			debugMsg("over fisharea");
			document.getElementById('ui').style.cursor = "pointer";
		} else if (shop.mouseOver(mouseX, mouseY)) {
			document.getElementById('ui').style.cursor = "pointer";

		// Mousing over players with boxing glove
		} else if (pList[socket.id].hand == 3 && mouseOverPlayers(mouseX, mouseY)) {
			document.getElementById('ui').style.cursor = "crosshair";
		} else {
			document.getElementById('ui').style.cursor = "alias";
		}
	}
});

// Player clicked on screen
document.getElementById('ui').addEventListener("click", function(event) {

	// Only move if they didn't click a button
	if (canMove && pList[socket.id].state != "dead") {

		// Send position to server
		socket.emit('movement', {
			clickX: event.pageX-100,
			clickY: event.pageY-20
		});
	} else {
		canMove = true;
	}
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
var inventory = Inventory();


var testAnim = animation(300, 200, images["gloveAnim"].width, images["gloveAnim"].height, images["gloveAnim"], 1, 5);

// Game loop
function gameLoop() {


	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(images["bg"], 0, 0);

	//testAnim.update();


	fishArea.update();
	shop.update();



	// Extract player list from server
	for (var i in localPList) {
		// Add the player to the local state
		if (!(i in pList)) {
			var temp = localPList[i];
			pList[i] = Player(temp.x, temp.y, temp.name, temp.xDes, temp.yDes, temp.speed, temp.facing, temp.head, temp.body, temp.hand, temp.invent, temp.intent, temp.state, temp.money);

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

			var same = true;
			if (pList[i].invent.length != localPList[i].invent.length) {
				same = false;
			} else {
				for (var j = 0; j < pList[i].invent.length; j++) {
					if (pList[i].invent[j] != localPList[i].invent[j]) {
						same = false;
						break;
					}
				}
			}

			if (same == false) {
				debugMsg("just updated YAYYYY");
				pList[i].invent = localPList[i].invent;
				inventory.justUpdated = true;
			}

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





	inventory.update();   // Update inventory



	// Draw the display moeny stuff
	for (var i = 0; i < displayHUD.length; i++) {
		displayHUD[i].update();
	}


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


// Clicked the inventory button
function switchInvent() {

	// Prevent player moving after clicking inventory
	canMove = false;

	// Change inventory display
	if (inventory.display) {
		inventory.setDisplay(false);
	} else {
		inventory.setDisplay(true);
	}
}

// Clicked to add equip
function equip(itemID) {
	debugMsg("equiped = " + itemID);
	socket.emit('equip', itemID);
	canMove = false;
}


// Clicked to remove equip
function removeEquip(equip) {
	debugMsg("removed = " + equip);
	socket.emit('removeEquip', equip);
	canMove = false;
}

// Checks if mouse is over any players or not
function mouseOverPlayers(mouseX, mouseY) {
	for (var i in pList) {
		if (i != socket.id) {
			if (pList[i].mouseOver(mouseX, mouseY)) {
				return true;
			}
		}
	}
	return false;
}

// Asks server to buy item from shop
function buyItem(name) {
	socket.emit('buyItem', name);
	canMove = false;
}