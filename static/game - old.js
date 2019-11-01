
// Setting values for item array
var items = {};
setItem(0, "lollypop", "hand", 50, "static/lollypop.png");
setItem(1, "helmet", "head", 100, "static/helmet.png");
setItem(2, "armour", "body", 89, "static/armour.png");




// Local variables
var shutdown = false;             // Indicates if server is shutting down



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


var inventOpen = false;   // if inventory is opened or not

var stickColW = 40;
var stickColH = 100;


var invent_x = 625;  // Coordinates and length of inventory button
var invent_y = 700;
var invent_len = 100;


var shopHud_x = 200;  // Coordinates of shop hud
var shopHud_y = 200;
var shopHud_w = 700;
var shopHud_h = 400;

var canFishTick = true;

var mouseIcon = "none"   // Stores what the mouse icon should display







var collisions = [];
var rect = {x: 1252, y: 231, h: 300, w: 300};
collisions.push(rect);
var rect = {x: 714,	y: 507,	h: 400,	w: 700};
collisions.push(rect);
var rect = {x: 182,	y: 689,	h: 400,	w: 800};
collisions.push(rect);


var mouse_x = -1;
var mouse_y = -1;



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

		playerCollision = checkCollision(player.xPos, player.yPos);


		// Draw player position
		updateOtherPlayers();
		drawOtherPlayers();
		
		// Draw chat
		drawPlayerChat();
		drawOtherChat();
		drawChatHistory();

		// Draw equipped items for ALL players
		drawEquipped();
		drawOtherEquipped();

		// Draw fishing
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
	}
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





// Draw mouse icon
function drawMouseIcon() {
	if (mouseIcon == "fishing") {
		ctx.drawImage(images["fishingIcon"], mouse_x, mouse_y);
	} else if (mouseIcon == "shop") {
		ctx.drawImage(images["shopIcon"], mouse_x, mouse_y);
	}
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




// Draws text starting from the origin of the given stickman position
function drawStickVar(string, xPos, yPos) {
	ctx.fillText(string, Math.round(xPos-images["stickman"].width/2), Math.round(yPos+images["stickman"].height/2));
}

