var inventOpen = false;   // if inventory is opened or not

var stickColW = 40;
var stickColH = 100;


var invent_x = 625;  // Coordinates and length of inventory button
var invent_y = 700;
var invent_len = 100;


var canFishTick = true;

var mouseIcon = "none"   // Stores what the mouse icon should display






// Disconnect from the server GRACEFULLY
function disconnect() {
	debugMsg("Requesting to disconnect...");
	socket.disconnect();
}


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






// Draw mouse icon
function drawMouseIcon() {
	if (mouseIcon == "fishing") {
		ctx.drawImage(images["fishingIcon"], mouse_x, mouse_y);
	} else if (mouseIcon == "shop") {
		ctx.drawImage(images["shopIcon"], mouse_x, mouse_y);
	}
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