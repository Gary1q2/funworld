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

	var super_update = self.update;
	self.update = function() {
		super_update();
		self.debugDraw();
	}

	// Draw stickman character
	self.draw = function() {
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

	// Draw debug variables
	self.debugDraw = function() {
		ctx.fillText("["+Math.round(self.x)+","+Math.round(self.y)+"]", self.x, self.y+70);
		ctx.fillText(self.name, self.x,self.y+90);
		ctx.fillText("state="+self.state,self.x,self.y+110);
		ctx.fillText("$"+self.money,self.x,self.y+130);
		ctx.fillText("intent="+self.intent,self.x,self.y+150);		
	}
	return self;
}