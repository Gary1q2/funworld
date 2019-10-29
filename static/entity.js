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
	}

	self.draw = function() {
		ctx.drawImage(self.img, self.x-(self.width/2), self.y-(self.height/2));
	}

	// Return if collision (true or false)
	self.checkCollision = function(other) {
		var rect1 = {
			x: self.x - self.width/2,
			y: self.y - self.height/2,
			width: self.width,
			height: self.height
		};
		var rect2 = {
			x: other.x - other.width/2,
			y: other.y - other.height/2,
			width: other.width,
			height: other.height
		};
		return testCollisionRectRect(rect1, rect2);
	}

	return self;
}


/* Player entity
 */
player = function() {
	var self = entity(300, 300, images["stickman"].width, images["stickman"].height, images["stickman"]);
	self.name = "";
	self.xDes = -1;
	self.yDes = -1;
	self.speed = 8;
	self.facing = "right";
	self.head = -1;
	self.body = -1;
	self.hand = -1;
	self.invent = [];
	self.intent = -1;
	self.state = -1;
	self.money = 0;

	var super_update = self.update;
	self.update = function() {
		super_update();
	}

	// Update player's movement
	self.updateMovement = function() {
		if (self.xDes != -1 && self.yDes != -1) {
			let moveAngle = getMoveAngle(self.x, self.xDes, self.y, self.yDes);
			let tempX = calculateXPos(self.x, self.xDes, self.speed, moveAngle);
			let tempY = calculateYPos(self.y, self.yDes, self.speed, moveAngle);

			// need to add COLLISION with boudary
			//===================================
			
			self.x = tempX;
			self.y = tempY;

			// Back to normal state
			if (self.state != -1) {
				self.state = -1;
				debugMsg("BACK TO NORMAL STATE");
				socket.emit("fishing", false);
			}

			// Player reached destination, so stop moving
			if (self.x == self.xDes && self.y == self.yDes) {
				self.xDes = -1;
				self.yDes = -1;

				//=================================
				//Need to do JUST STOPPED RIGHT HERE
			}
		}
	}


	return self;
}