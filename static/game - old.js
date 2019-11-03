var canFishTick = true;

var mouseIcon = "none"   // Stores what the mouse icon should display








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