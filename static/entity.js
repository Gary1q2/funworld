/* Basic entity that literally does nothing
   -coordinates (x, y) are at the center of the image
   -width & height are the collision bounds
 */
entity = function(x, y, width, height, img) {
	var self = {
		x: x,
		y: y,
		width: width,
		height: height,
		img: img
	};
	
	self.update = function() {
		self.draw();
		if (debug) {
			self.debugDraw();
		}
	}

	self.draw = function() {
		ctx.drawImage(self.img, self.x-(self.width/2), self.y-(self.height/2));
	}

	// Draw debug values
	self.debugDraw = function() {
		ctx.beginPath();
		ctx.rect(self.x-self.width/2,self.y-self.height/2,self.width,self.height);
		ctx.stroke();

		ctx.fillText("["+Math.round(self.x)+", "+Math.round(self.y)+"]", self.x, self.y+self.height/2 + 20);
	}

	// Return if mouse over (true or false)
	self.mouseOver = function(mouseX, mouseY) {
		return (mouseX >= self.x - self.width/2 && mouseX <= self.x + self.width/2 && 
			    mouseY >= self.y - self.height/2 && mouseY <= self.y + self.height/2);
	}

	return self;
}

animation = function(x, y, width, height, img, frameRow, frameCol) {
	var self = entity(x, y, width, height, img);
	self.frameRow = frameRow;
	self.frameCol = frameCol;
	self.frameCounter = 0;
	self.delay = 4;

	var super_update = self.update;
	self.update = function() {
		super_update();
		self.draw();
	}

	self.draw = function() {

		ctx.drawImage(self.img, (self.frameCounter%self.frameCol)*(self.width/self.frameCol), 
					 (self.frameCounter%self.frameRow)*(self.height/self.frameRow), 
					  self.width/self.frameCol, self.height/self.frameRow, self.x, self.y,
					  self.width/self.frameCol, self.height/self.frameRow);
		if (self.delay > 0) {
			self.delay--;
		} else {
			self.delay = 4;
			self.frameCounter++;
			if (self.frameCounter == 5) {
				self.frameCounter = 0;
			}
		}


	}
	return self;
}

text = function(x, y, msg, dieTime) {
	var self = {
		x: x,
		y: y,
		msg: msg,
		dieTime: dieTime
	};

	self.update = function() {
		self.draw();

		if (self.dieTime > 0) {
			self.dieTime--;
		}
	}

	self.draw = function() {
		if (self.dieTime >= 0) {
			ctx.fillText(self.msg, self.x-ctx.measureText(self.msg).width/2, self.y);
		}
	}

	return self;
}

movingText = function(x, y, hspd, vspd, msg, dieTime) {
	var self = text(x, y, msg, dieTime);
	self.hspd = hspd;
	self.vspd = vspd;

	var super_update = self.update;
	self.update = function() {
		super_update();
		self.updatePosition();
	}

	self.updatePosition = function() {
		self.x += self.hspd;
		self.y += self.vspd;
	}

	return self;
}


/* Player entity
 */
Player = function(x, y, name, xDes, yDes, speed, facing, head, body, hand, invent, intent, state, money) {
	var self = entity(x, y, images["stickman"].width, images["stickman"].height, images["stickman"]);
	self.name = name;
	self.speed = speed;
	self.facing = facing;
	self.head = head;
	self.body = body;
	self.hand = hand;
	self.invent = invent;
	self.intent = intent;
	self.state = state;
	self.money = money;

	self.lastMsg = "";
	self.lastMsgTime = 0;

	var super_update = self.update;
	self.update = function() {
		super_update();

		// Only draw equipment if player is not "dead"
		if (self.state != "dead") {
			self.drawEquip();
		}
		self.drawName();
		self.drawChatHead();

		if (debug) {
			self.debugDraw();
		}		
	}

	// Draw stickman character
	self.draw = function() {

		// Dead after being punched
		if (self.state == "dead") {
			ctx.drawImage(images["dead"], self.x, self.y);

		// Draw stickman normally
		} else {
			if (self.facing == "right") {
				ctx.drawImage(self.img, self.x-self.width/2, self.y-self.height/2);	
			} else {
				ctx.translate(self.x+self.width/2, self.y-self.height/2)
				ctx.scale(-1, 1);
				ctx.drawImage(self.img, 0, 0);
				ctx.setTransform(1, 0, 0, 1, 0, 0)
			}

			// Draw fishing rod when fishing
			if (self.state == "fish") {
				if (self.x <= fishArea.x) {
					ctx.drawImage(images["fishingRod"], self.x-self.width/2+20, self.y-self.height/2-30);
				} else {
					ctx.translate(self.x+self.width/2-20, self.y-self.height/2-30);
					ctx.scale(-1, 1);
					ctx.drawImage(images["fishingRod"], 0, 0);
					ctx.setTransform(1, 0, 0, 1, 0, 0)
				}
			}
		}
	}

	// Draw items equipped by player
	self.drawEquip = function() {
		if (self.head != -1) {
			var image = images[(items.getItem(self.head)).name];
			if (self.facing == "left") {
				ctx.drawImage(image, self.x-image.width/2, self.y-27-image.height/2);
			} else {
				ctx.translate(self.x+image.width/2, self.y-27-image.height/2);
				ctx.scale(-1, 1);
				ctx.drawImage(image, 0, 0);
				ctx.setTransform(1, 0, 0, 1, 0, 0);
			}
		}
		if (self.body != -1) {
			var image = images[(items.getItem(self.body)).name];
			ctx.drawImage(image, self.x-image.width/2, self.y-image.height/2+4);
		}
		if (self.hand != -1 && self.state != "fish") {
			var image = images[(items.getItem(self.hand)).name];
			if (self.facing == "right") {
				ctx.drawImage(image , self.x+image.width/2-20, self.y-image.height/2);
			} else {
				ctx.translate(self.x-image.width/2+20, self.y-image.height/2);
				ctx.scale(-1, 1);
				ctx.drawImage(image, 0, 0);
				ctx.setTransform(1, 0, 0, 1, 0, 0);		
			}
		}		
	}

	// Draw chat messages above head
	self.drawChatHead = function() {
		if (self.lastMsgTime > 0) {
			ctx.fillText(self.lastMsg, self.x-ctx.measureText(self.lastMsg).width/2, self.y - self.height/2 - 20);
		}
	}

	// Draw player's name
	self.drawName = function() {
		ctx.fillText(self.name, self.x-ctx.measureText(self.name).width/2, self.y+self.height/2+20);
	}


	// Draw debug variables
	self.debugDraw = function() {
		ctx.fillText("["+Math.round(self.x)+","+Math.round(self.y)+"]", self.x, self.y+90);
		ctx.fillText("state="+self.state,self.x,self.y+110);
		ctx.fillText("$"+self.money,self.x,self.y+130);
		ctx.fillText("intent="+self.intent,self.x,self.y+150);		
	}
	return self;
}

/* Displays the inventory
 */
Inventory = function() {
	var self = {
		display: false,
		justUpdated: true
	};

	// Update the inventory HUD
	self.update = function() {
		if (self.display) {
			document.getElementById("inventory").style.visibility = "visible";
			document.getElementById("equipment").style.visibility = "visible";

			document.getElementById("equipHead").style.visibility = "visible";
			document.getElementById("equipBody").style.visibility = "visible";
			document.getElementById("equipHand").style.visibility = "visible";


			// Display the equipped items
			if (pList[socket.id].head != -1) {
				document.getElementById("equipHead").style.background = "url('"+images[(items.getItem(pList[socket.id].head)).name].src+"') no-repeat center center #D3AE60";
			} else {
				document.getElementById("equipHead").style.background = "#D3AE60 url('static/head.png') no-repeat center center";
			}
			if (pList[socket.id].body != -1) {
				document.getElementById("equipBody").style.background = "url('"+images[(items.getItem(pList[socket.id].body)).name].src+"') no-repeat center center #D3AE60";
			} else {
				document.getElementById("equipBody").style.background = "#D3AE60 url('static/body.png') no-repeat center center";
			}
			if (pList[socket.id].hand != -1) {
				document.getElementById("equipHand").style.background = "url('"+images[(items.getItem(pList[socket.id].hand)).name].src+"') no-repeat center center #D3AE60";
			} else {
				document.getElementById("equipHand").style.background = "#D3AE60 url('static/hand.png') no-repeat center center";
			}

			//debugMsg("im gay  just updated = " + self.justUpdated);

			// Display the inventory
			if (self.justUpdated) {
				debugMsg("just updated inventory");
				var string = "";
				for (var i = 0; i < pList[socket.id].invent.length; i++) {
					string += "<button onclick=\"equip("+pList[socket.id].invent[i]+")\" style=\"cursor: pointer; border: 2px solid black; height: 100px; width: 100px;background:#D3AE60 url('"+images[(items.getItem(pList[socket.id].invent[i])).name].src+"') no-repeat center center;\"></button>";
				}

				string += "<div style=\"bottom:0px;position:absolute;font-size:20px;\">Inventory</div>";

				document.getElementById("inventory").innerHTML = string;
				self.justUpdated = false;
			}

			// Show opened inventory button
			document.getElementById("inventButton").style.background = "url('static/inventOpen.png') no-repeat center center";
	
		// Hide everything
		} else {
			document.getElementById("inventory").style.visibility = "hidden";
			document.getElementById("equipment").style.visibility = "hidden";

			document.getElementById("equipHead").style.visibility = "hidden";
			document.getElementById("equipBody").style.visibility = "hidden";
			document.getElementById("equipHand").style.visibility = "hidden";

			document.getElementById("inventButton").style.background = "url('static/inventClose.png') no-repeat center center";
		}
	}

	// Set the inventory to display or not
	self.setDisplay = function(bool) {
		self.display = bool;
	}

	return self;
}



/* Shop is entity with an inventory + price
 */
Shop = function(x, y, width, height, img) {
	var self = entity(x, y, width, height, img);
	self.inventory = [];
	self.displayShop = false;

	self.thankTimer = 0;

	var super_update = self.update;
	self.update = function() {
		super_update();
		self.draw();
		self.drawHUD();
	}	

	// Add item to inventory
	self.addItem = function(itemID, price) {
		self.inventory.push({
			itemID: itemID,
			name: (items.getItem(itemID)).name,
			price: price
		});
	}

	// Return item price
	self.getPrice = function(itemID) {
		for (var i = 0; i < self.inventory.length; i++) {
			if (self.inventory[i].itemID == itemID) {
				return self.inventory[i].price;
			}
		}
		return -1;
	}

	self.draw = function() {
		if (self.thankTimer > 0) {
			ctx.drawImage(images["shopThanks"], self.x-self.width/2, self.y-self.height/2);
		} else {
			ctx.drawImage(images["shop"], self.x-self.width/2, self.y-self.height/2);
		}
	}

	// Draw the HUD if player is shopping
	self.drawHUD = function() {

		// Display shop HUD if player is shopping
		if (pList[socket.id].state == "shop" && self.displayShop == false) {
			self.displayShop = true;
			document.getElementById('shop').style.visibility = "visible";

			var string = "";
			for (var i = 0; i < self.inventory.length; i++) {
				string += "<button style=\"cursor: pointer; border: 2px solid black; height: 100px; width: 100px; background:#D3AE60  url('"+images[(items.getItem(i)).name].src+
				"')  no-repeat center center;\" onclick=\"buyItem("+i+")\">"+self.getPrice(i)+"</button>";
			}

			string += "<div style=\"bottom:0px;position:absolute;font-size:20px;\">Shop</div>";
			document.getElementById('shop').innerHTML = string;
		}

		// Turn off shop GUI 
		if (pList[socket.id].state != "shop" && self.displayShop == true) {
			self.displayShop = false;
			document.getElementById('shop').style.visibility = "hidden";
		}
	}

	return self;
}

/* Item properties
 */
Items = function() {
	var self = {
		array: []
	};

	self.addItem = function(itemID, name, equip) {
		self.array.push({
			itemID: itemID,
			name: name,
			equip: equip
		});
	}

	// Return item when given name, return -1 if not found
	self.getItem = function(itemID) {

		for (var i = 0; i < self.array.length; i++) {
			if (self.array[i].itemID == itemID) {
				return self.array[i];
			}
		}
		return -1;
	}

	return self;
}