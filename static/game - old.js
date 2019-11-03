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


		// Draw mouse icon
		drawMouseIcon();
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
