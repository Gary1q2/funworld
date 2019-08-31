// Moves the player x location on the x axis
// Given the player's current x position, destination x postion & speed
function calculateXPos(xPos, xPosDes, speed, angle) {
	if (Math.abs(xPosDes - xPos) > speed*Math.cos(angle)) {
		if (xPos < xPosDes) {
			return (xPos + (speed*Math.cos(angle)));
		} else if (xPos > xPosDes) {
			return (xPos - (speed*Math.cos(angle)));
		}
	} else if (Math.abs(xPosDes - xPos) > 0) {
		return xPosDes;
	} else {
		return xPos;
	}
}

// Moves the player y location on the y axis
// Given the player's current y position, destination y postion & speed
function calculateYPos(yPos, yPosDes, speed, angle) {
	if (Math.abs(yPosDes - yPos) > speed*Math.sin(angle)) {
		if (yPos < yPosDes) {
			return (yPos + (speed*Math.sin(angle)));
		} else if (yPos > yPosDes) {
			return (yPos - (speed*Math.sin(angle)));
		}
	} else if (Math.abs(yPosDes - yPos) > 0) {
		return yPosDes;
	} else {
		return yPos;
	}
}

// Calculate the move angle given the player's current position and destination
function getMoveAngle(xPos, xPosDes, yPos, yPosDes) {
	return Math.abs(Math.atan((Math.abs(yPosDes-yPos)/(xPosDes-xPos))));
}