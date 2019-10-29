
// Setting values for item array
var items = {};
setItem(0, "lollypop", "hand", 50, "static/lollypop.png");
setItem(1, "helmet", "head", 100, "static/helmet.png");
setItem(2, "armour", "body", 89, "static/armour.png");

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

var socket = io();

// Local variables
var shutdown = false;             // Indicates if server is shutting down
var initialised = false;          // Indicates if player has initialised his name

// Local player variable
var player = {
	name: "",            // set by client from setName
	xPos: 750,           // client side prediction pos
	yPos: 350,           // ...
	xDes: -1,            // client side prediction des
	yDes: -1,            // ...
	facing: "right",     // client side prediction facing
	head: -1,
	body: -1,
	hand: -1,
	invent: [],
	intent: -1,
	state: -1,
	money: 0
};


var chatMessage = "";
var playerCollision = false;
var playerMoveAngle = 0;

var localPList;               // Local array containing other player's position

var chatHistoryLen = 10;
var displayChat = 0;                              // Display local player's chat?
var otherChat = {};                               // Store's other player's chats to be rendered
var chatHistory = Array(chatHistoryLen).fill(""); // Displays past chat history


var playerSpeed;
var gameTick;

var debug = false;

var inventOpen = false;   // if inventory is opened or not

var stickColW = 40;
var stickColH = 100;

var fishArea_x = 890;  // Coordinates of fishing area
var fishArea_y = 550;

var invent_x = 625;  // Coordinates and length of inventory button
var invent_y = 700;
var invent_len = 100;

var shop_x = 465; // Coordinates of shop
var shop_y = 430;

var shopHud_x = 200;  // Coordinates of shop hud
var shopHud_y = 200;
var shopHud_w = 700;
var shopHud_h = 400;

var canFishTick = true;

var mouseIcon = "none"   // Stores what the mouse icon should display

// Focus the username field
document.getElementById('userInput').focus();



// Initialising the canvas variable
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
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


// Receive update on pList
socket.on('updateState', function(data) {
	localPList = data;

	// Update client's own player
	player.head = data[socket.id].head;
	player.body = data[socket.id].body;
	player.hand = data[socket.id].hand;
	player.invent = data[socket.id].invent;

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

	// Add chat to history
	addChatHistory(data.msg, data.id);

	// Make the text stop showing
	setTimeout(function() {
		otherChat[data.id].displayChat--;
	}, 5000)
});

// Mouse over different objects
document.getElementById('ui').addEventListener("mousemove", function(event) {
	if (initialised) {

		// Update the mouse coordinates
		var rect = canvas.getBoundingClientRect();
		mouse_x = event.clientX - rect.left;
		mouse_y = event.clientY - rect.top;

		// Mouse over the fishArea -> display fishing icon
		if (event.offsetX >= fishArea_x-images["fishArea"].width/2 && event.offsetX <= fishArea_x+images["fishArea"].width/2
			&& event.offsetY >= fishArea_y-images["fishArea"].height/2 && event.offsetY <= fishArea_y+images["fishArea"].height/2) {
			mouseIcon = "fishing";

		// Mouse over shop -> display shop icon
		} else if (event.offsetX >= shop_x-images["shop"].width/2 && event.offsetX <= shop_x+images["shop"].width/2
			&& event.offsetY >= shop_y-images["shop"].height/2 && event.offsetY <= shop_y+images["shop"].height/2) {
			mouseIcon = "shop";

		// Draw nothing
		} else {
			mouseIcon = "none";
		}
	}
})

// Player clicked on the screen
document.getElementById('ui').addEventListener("click", function(event) {
	if (initialised) {

		// Clicked the inventory button on or off
		if (event.offsetX >= invent_x-invent_len/2 && event.offsetX <= invent_x+invent_len/2 && event.offsetY >= invent_y-invent_len/2 && event.offsetY <= invent_y+invent_len/2) {
			inventOpen = !inventOpen;	
			debugMsg("inventory opened = " + inventOpen);

		} else {
			var itemClicked = inventItemClicked(event.offsetX, event.offsetY);
			//debugMsg("CLICKED ON ITEM = " + itemClicked);

			var equipClicked = equipItemClicked(event.offsetX, event.offsetY);
			//debugMsg("CLICKED on EQUIPMENT = " + equipClicked);		


			// Clicked the inventory or equipment
			if (inventOpen && ((itemClicked != -1) || (equipClicked != -1))) {

				// Assign the item clicked to player's equipped item
				if (itemClicked != -1) {
					if (items[itemClicked].equip == "head") {
						player.head = itemClicked;
					} else if (items[itemClicked].equip == "body") {
						player.body = itemClicked;
					} else if (items[itemClicked].equip == "hand") {
						player.hand = itemClicked;
					}

					// Tell server equipped an item
					socket.emit('equipItem', itemClicked);

				} else if (equipClicked != -1) {
					if (equipClicked == "head") {
						player.head = -1;
					} else if (equipClicked == "body") {
						player.body = -1;
					} else if (equipClicked == "hand") {
						player.hand = -1;
					}

					// Tell server unequipped an item
					socket.emit('unequipItem', equipClicked);
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

				// Clicked the fishing area
				if (event.offsetX >= fishArea_x-images["fishArea"].width/2 && event.offsetX <= fishArea_x+images["fishArea"].width/2
					&& event.offsetY >= fishArea_y-images["fishArea"].height/2 && event.offsetY <= fishArea_y+images["fishArea"].height/2) {
					player.intent = "fishing";
					debugMsg("intent = FISHING");

				// Clicked the shop
				} else if (event.offsetX >= shop_x-images["shop"].width/2 && event.offsetX <= shop_x+images["shop"].width/2
					&& event.offsetY >= shop_y-images["shop"].height/2 && event.offsetY <= shop_y+images["shop"].height/2) {
					player.intent = "shop";
					debugMsg("intent = SHOP");

				// Clicked nothing
				} else {
					player.intent = "none";
					debugMsg("intent = NONE");
				}

				player.xDes = event.offsetX;
				player.yDes = event.offsetY;
				playerMoveAngle = getMoveAngle(player.xPos, player.xDes, player.yPos, player.yDes);
				//debugMsg("I want to move to [" + player.xDes + " , " + player.yDes + "]   Angle = " 
				//	                                    + Math.round(playerMoveAngle*180/Math.PI) + " degs");

				// Set the facing direction
				if (player.xDes - player.xPos >= 0) {
					player.facing = "right";
					//debugMsg("right");
				} else {
					//debugMsg("left");
					player.facing = "left";
				}
				//debugMsg("player facing = " + player.facing);

				document.getElementById('chatbox').focus();
			}
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

				// Prepare chat to be rendered
				chatMessage = text;
				displayChat++;
				setTimeout(function() {
					displayChat--;
				}, 5000);

				// Push player chat to chat history
				addChatHistory(text, socket.id);
			}
		    break;
    }
};



// Client game loop
function mainLoop() {
	if (initialised) {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(images["bg"], 0, 0);
		playerCollision = checkCollision(player.xPos, player.yPos);

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
		drawChatHistory();

		// Draw equipped items for ALL players
		drawEquipped();
		drawOtherEquipped();

		// Draw environment
		drawFishArea();
		drawShop();

		// Draw fishing
		drawFishing();
		drawOtherFishing();

		// Display shopHUD
		if (player.state == "shop") {
			ctx.fillStyle = "#cc8540";
			ctx.fillRect(shopHud_x, shopHud_y, shopHud_w, shopHud_h);
			ctx.fillStyle = "#000000";

			var itemSize = 50;
			var gap = 20;

			// Draw the items in the shop
			var count = 0;
			for (i in items) {
				ctx.beginPath();
				ctx.lineWidth = "2";
				ctx.rect(shopHud_x+(count*itemSize)+(count*gap), shopHud_y, itemSize, itemSize);
				ctx.stroke();
				ctx.drawImage(items[i].img, shopHud_x+(count*itemSize)+(count*gap), shopHud_y);
				count++;
			}
		}

		// Player making $10 every 5 seconds from fishing
		if (player.state == "fishing" && canFishTick == true) {
			setTimeout(function() {
				debugMsg("yay got $10....");
				socket.emit("money", 10);
				player.money += 10;		

				canFishTick = true;
			}, 1000);
			canFishTick = false;
		}

		// Draw mouse icon
		drawMouseIcon();

		// Draw inventory (if opened)
		if (inventOpen) {
			drawInventory();
			ctx.drawImage(images["inventOpen"], invent_x-invent_len/2, invent_y-invent_len/2, invent_len, invent_len);
		} else {
			ctx.drawImage(images["inventClose"], invent_x-invent_len/2, invent_y-invent_len/2, invent_len, invent_len);
		}

		// Draw inventory on/off button rectangle
		ctx.beginPath();
		ctx.lineWidth = "2";
		ctx.rect(invent_x-invent_len/2, invent_y-invent_len/2, invent_len, invent_len);
		ctx.stroke();

		// Draw money
		ctx.fillText("Money: "+player.money, invent_x + 100, invent_y);

		// Some debugging stuff
		if (debug) { 
			drawCollisions(); 
			ctx.fillText("[" + mouse_x + "," + mouse_y + "]", 50, 50);
		}



		// Testing entities
		fishArea.update();
		shop.update();
	}
}


// Testing entities
var fishArea = entity(200, 200, images["fishArea"].width, images["fishArea"].height, images["fishArea"]);
var shop = entity(500, 370, images["shop"].width, images["shop"].height, images["shop"]);

// Checks if two rectangles have a collision (true or false)
function testCollisionRectRect(rect1, rect2) {
	return rect1.x <= rect2.x + rect2.width 
		&& rect2.x <= rect1.x + rect1.width
		&& rect1.y <= rect2.y + rect2.height
		&& rect2.y <= rect1.y + rect1.height;
}


// Draw other players fishing
function drawOtherFishing() {
	for (i in localPList) {
		if (i != socket.id) {

			// Draw fishing pole when fishing
			if (localPList[i].state == "fishing") {

				// Draw fishing pole direction
				if (localPList[i].xPos <= fishArea_x) {
					ctx.drawImage(images["fishingRod"], localPList[i].xPos-stickColW/2+20, localPList[i].yPos-stickColH/2-30);
				} else {
					ctx.translate(Math.round(localPList[i].xPos+images["stickman"].width/2)-20, Math.round(localPList[i].yPos-images["stickman"].height/2)-30)
					ctx.scale(-1, 1);
					ctx.drawImage(images["fishingRod"], 0, 0);
					ctx.setTransform(1, 0, 0, 1, 0, 0)
				}
			}
		}	
	}
}

// Draw the player fishing
function drawFishing() {
	// Draw fishing pole when fishing
	if (player.state == "fishing") {

		// Draw pole direction
		if (player.xPos <= fishArea_x) {					
			ctx.drawImage(images["fishingRod"], player.xPos-stickColW/2+20, player.yPos-stickColH/2-30);
		} else {
			ctx.translate(Math.round(player.xPos+images["stickman"].width/2-20), Math.round(player.yPos-images["stickman"].height/2-30))
			ctx.scale(-1, 1);
			ctx.drawImage(images["fishingRod"], 0, 0);
			ctx.setTransform(1, 0, 0, 1, 0, 0)
		}
	}
}

// Perform actions after stopping
function justStopped() {
	var fishImage = images["fishArea"];
	if (player.intent == "fishing" && 
		((((player.xPos+stickColW/2 >= fishArea_x - fishImage.width/2 && player.xPos+stickColW/2 <= fishArea_x + fishImage.width/2) ||
           (player.xPos-stickColW/2 >= fishArea_x - fishImage.width/2 && player.xPos-stickColW/2 <= fishArea_x + fishImage.width/2)) &&
	      ((player.yPos+stickColH/2 >= fishArea_y - fishImage.height/2 && player.yPos+stickColH/2 <= fishArea_y + fishImage.height/2) ||
	       (player.yPos-stickColH/2 >= fishArea_y - fishImage.height/2 && player.yPos-stickColH/2 <= fishArea_y + fishImage.height/2))))) {
		player.state = "fishing";
		debugMsg("FISHING STATE ON - collsion boundary");

		// Tell server
		socket.emit("fishing", true);
	} else if (player.intent == "shop" && 
		((((player.xPos+stickColW/2 >= shop_x - fishImage.width/2 && player.xPos+stickColW/2 <= shop_x + fishImage.width/2) ||
           (player.xPos-stickColW/2 >= shop_x - fishImage.width/2 && player.xPos-stickColW/2 <= shop_x + fishImage.width/2)) &&
	      ((player.yPos+stickColH/2 >= shop_y - fishImage.height/2 && player.yPos+stickColH/2 <= shop_y + fishImage.height/2) ||
	       (player.yPos-stickColH/2 >= shop_y - fishImage.height/2 && player.yPos-stickColH/2 <= shop_y + fishImage.height/2))))) {
		player.state = "shop";
		debugMsg("SHOP STATE ON - collision boundary");

		var str = "";
		for (var i = 0; i < 5; i++) {
			str += "<button style=\"left:"+i*200+"px;\" class=\"shopButton\" onclick=\"console.log('fuck')\">hehe</button>";
		}

		document.getElementById("ui").innerHTML = str;

	}
}

// Draw mouse icon
function drawMouseIcon() {
	if (mouseIcon == "fishing") {
		ctx.drawImage(images["fishingIcon"], mouse_x, mouse_y);
	} else if (mouseIcon == "shop") {
		ctx.drawImage(images["shopIcon"], mouse_x, mouse_y);
	}
}

// Draw shop
function drawShop() {
	var image = images["shop"];
	ctx.drawImage(image, shop_x-image.width/2, shop_y-image.height/2);
}


// Draw fishing areas
function drawFishArea() {
	var image = images["fishArea"];
	ctx.drawImage(image, fishArea_x-image.width/2, fishArea_y-image.height/2);
}

// Push the word to the chat history array
function addChatHistory(message, userID) {
	for (var i = chatHistoryLen-1; i > 0; i--) {
		chatHistory[i] = chatHistory[i-1];
	}
	chatHistory[0] = localPList[userID].name + ": " + message;
}

// Draw the chat history
function drawChatHistory() {

	var chatHistory_x = 1000;
	var chatHistory_y = 700;
	var gap = 30;
	var padding = 10;

	// Draw the chat history background
	ctx.fillStyle = "#cc8540";
	ctx.fillRect(chatHistory_x-padding, chatHistory_y - (chatHistoryLen * gap) - padding, 400+(2*padding), (chatHistoryLen*gap) + (2*padding))
	ctx.fillStyle = "#000000";

	// Draw the text
	for (var i = 0; i < chatHistoryLen; i++) {
		ctx.fillText(chatHistory[i], chatHistory_x, chatHistory_y - padding - (i * gap));
	}
}

// Initialise item property inside items{}
function setItem(itemID, name, bodyPart, price, fileLoc) {
	var object = {
		name: name,
		equip: bodyPart,
		price: price,
		img: new Image()
	}
	object.img.src = fileLoc;
	items[itemID] = object;
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
		ctx.drawImage(items[player.head].img, player.xPos-stickColW/2, player.yPos-stickColH/2 - 10);
	}
	if (player.body != -1) {
		ctx.drawImage(items[player.body].img, player.xPos-stickColW/2, player.yPos-stickColH/2+20);
	}
	if (player.hand != -1) {
		ctx.drawImage(items[player.hand].img, player.xPos-stickColW/2+20, player.yPos-stickColH/2);
	}	
}

// Draw other player's equipped items
function drawOtherEquipped() {
	for (i in localPList) {
		if (i != socket.id) {
			var obj = localPList[i];
			if (obj.head != -1) {
				ctx.drawImage(items[obj.head].img, obj.xPos-stickColW/2, obj.yPos-stickColH/2 - 10);
			}
			if (obj.body != -1) {
				ctx.drawImage(items[obj.body].img, obj.xPos-stickColW/2, obj.yPos-stickColH/2+20);
			}
			if (obj.hand != -1) {
				ctx.drawImage(items[obj.hand].img, obj.xPos-stickColW/2+20, obj.yPos-stickColH/2);
			}
		}	
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
		ctx.drawImage(items[player.invent[i]].img, xLoc, yLoc + (i * itemH));
	}

	var equipX = 1000;
	var equipY = 100;
	var len = 60;

	// Draw the equipment screen background
	ctx.drawImage(images["head"], equipX-len/2, equipY-len/2, len, len);
	ctx.drawImage(images["body"], equipX-len/2, equipY+len-len/2, len, len);
	ctx.drawImage(images["hand"], equipX-len-len/2, equipY+len-len/2, len, len);

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
		ctx.drawImage(items[player.head].img, equipX-len/2, equipY-len/2);
	}
	if (player.body != -1) {
		ctx.drawImage(items[player.body].img, equipX-len/2, equipY+len-len/2);
	} 
	if (player.hand != -1) {
		ctx.drawImage(items[player.hand].img, equipX-len-len/2, equipY+len-len/2);
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

		var tempX = calculateXPos(player.xPos, player.xDes, speed, playerMoveAngle);
		var tempY = calculateYPos(player.yPos, player.yDes, speed, playerMoveAngle);

		// Stop moving if we reached collision boundary
		if (checkCollision(tempX, tempY)) {
			player.xDes = -1;
			player.yDes = -1;

			justStopped();	

		// No collision, so keep going :D
		} else {
			player.xPos = tempX;
			player.yPos = tempY;

			// Back to normal state
			if (player.state != -1) {
				player.state = -1;
				debugMsg("BACK TO NORMAL STATE");

				socket.emit("fishing", false);
			}

			// Player reached destination, stop moving
			if (player.xPos == player.xDes && player.yPos == player.yDes) {
				player.xDes = -1;
				player.yDes = -1;

				justStopped();
			}
		}

	}
}

// Draw the current player
function drawPlayer() {
	if (player.facing == "right") {
		ctx.drawImage(images["stickman"], Math.round(player.xPos-images["stickman"].width/2), Math.round(player.yPos-images["stickman"].height/2));	
	} else {
		ctx.translate(Math.round(player.xPos+images["stickman"].width/2), Math.round(player.yPos-images["stickman"].height/2))
		ctx.scale(-1, 1);
		ctx.drawImage(images["stickman"], 0, 0);
		ctx.setTransform(1, 0, 0, 1, 0, 0)
	}


	drawStickVar(player.name, player.xPos, player.yPos + 40);

	// Debugging variables
	if (debug) {
		drawStickVar("xPos: " + Math.round(player.xPos), player.xPos, player.yPos + 70);
		drawStickVar("yPos: " + Math.round(player.yPos), player.xPos, player.yPos + 90);
		drawStickVar("facing: " + player.facing, player.xPos, player.yPos + 110);
		drawStickVar("collision: " + playerCollision, player.xPos, player.yPos + 130);
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
				ctx.drawImage(images["stickman"], Math.round(localPList[i].xPos-images["stickman"].width/2), Math.round(localPList[i].yPos-images["stickman"].height/2));	
			} else {
				ctx.translate(Math.round(localPList[i].xPos+images["stickman"].width/2), Math.round(localPList[i].yPos-images["stickman"].height/2));
				ctx.scale(-1, 1);
				ctx.drawImage(images["stickman"], 0, 0);
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
		ctx.fillText(chatMessage, Math.round(player.xPos-images["stickman"].width/2), Math.round(player.yPos-images["stickman"].height/2-30));
	}
}

// Draw chat for other players
function drawOtherChat() {
	for (key in otherChat) {
		if (otherChat[key].displayChat != 0) {
			//debugMsg("key = " + key + " xPos = " + Math.round(localPList[key].xPos) + "yPos = " + Math.round(localPList[key].yPos));
			ctx.fillText(otherChat[key].chat, Math.round(localPList[key].xPos-images["stickman"].width/2), Math.round(localPList[key].yPos-images["stickman"].height/2-30));
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
	ctx.fillText(string, Math.round(xPos-images["stickman"].width/2), Math.round(yPos+images["stickman"].height/2));
}


// Print debug messages only if debug mode is true
function debugMsg(string) {
	if (debug) {
		console.log(string);
	}
}