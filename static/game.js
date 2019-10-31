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
var localPList;

// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
ctx.font = "20px Arial";
ctx.lineWidth = 2;


// Receive update on pList
socket.on('updateState', function(data) {
	localPList = data;

	// Update client's own player
	//player.head = data[socket.id].head;
	//player.body = data[socket.id].body;
	//player.hand = data[socket.id].hand;
	//player.invent = data[socket.id].invent;
});



// Player clicked on screen
document.getElementById('ui').addEventListener("click", function(event) {

	// Setting intent
	//if (fishArea.checkClick(event.offsetX, event.offsetY)) {
	//	player.intent = "fish";
	//} else if (shop.checkClick(event.offsetX, event.offsetY)) {
	//	player.intent = "shop";
	//} else {	
	//	player.intent = "none";
	//}


	debugMsg("intent = " + player.intent);


	// ========================================
	// Should client side check here

	//player.xDes = event.offsetX;
	//player.yDes = event.offsetY;

	if (player.xDes - player.x >= 0) {
		player.facing = "right";
	} else {
		player.facing = "left";
	}

	// Send position to server
	socket.emit('movement', {
		xDes: player.xDes,
		yDes : player.yDes,
		facing: player.facing
	});

	document.getElementById('chatbox').focus();
});





// Testing entities
var fishArea = entity(890, 550, images["fishArea"].width, images["fishArea"].height, images["fishArea"]);
var shop = entity(465, 430, images["shop"].width, images["shop"].height, images["shop"]);
var player = Player(750, 350, "unknown", -1, -1, -1,
			          "right", -1, -1, -1, [], -1, -1, 0);


// Other players
var playerList = {};

// Collision array
var collisions = [];
collisions.push(entity(1252+150, 231+150, 300, 300, images["collision"]));
collisions.push(entity(714+350, 507+200, 700, 400, images["collision"]));
collisions.push(entity(182+400, 689+200, 800, 400, images["collision"]));

// Game loop
function gameLoop() {

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(images["bg"], 0, 0);

	fishArea.update();
	shop.update();
	player.update();

	for (var i in localPList) {

		// Add the player to the local state
		if (!(i in playerList)) {
			var temp = localPList[i];
			debugMsg(temp.x + "-" + temp.y);
			var p = Player(temp.x, temp.y, temp.name, temp.xDes, temp.yDes, temp.speed, temp.facing, temp.head, temp.body, temp.hand, temp.invent, temp.intent, temp.state, temp.money);
			playerList[i] = p;

		// Update the existing player's state
		} else {
			playerList[i].x = localPList[i].x;
			playerList[i].y = localPList[i].y;
			playerList[i].xDes = localPList[i].xDes;
			playerList[i].yDes = localPList[i].yDes;
		}
	}


	// Draw other players
	for (var i in playerList) {
		//if (i != socket.id) {
			playerList[i].update();
			//debugMsg(playerList[i].x + "-" + playerList[i].y);
		//}
	}

	for (let i = 0; i < collisions.length; i++) {
		collisions[i].update();
	}

}








// Functions

// Checks if two rectangles have a collision (true or false)
function testCollisionRectRect(rect1, rect2) {
	return rect1.x <= rect2.x + rect2.width 
		&& rect2.x <= rect1.x + rect1.width
		&& rect1.y <= rect2.y + rect2.height
		&& rect2.y <= rect1.y + rect1.height;
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


// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}
