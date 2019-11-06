// Deals with logging into the game

// Focus the username field
document.getElementById('userInput').focus();

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

    // Notify server to setup new player
	socket.emit('new player', document.getElementById('userInput').value);
}

// User didn't enter a name
socket.on('nullName', function() {
	var toChange = document.getElementById('login').childNodes[0];
	toChange.nodeValue = 'Enter your name: User must not be null';
    document.getElementById('userInput').focus();
});


// Let player know we have been initialised properly
socket.on('initDone', function(data) { 
    gameTick = data.tick;
    debug = data.debug;
   

    debugMsg("initing");

    // Extracting items 
    items = Items();
    for (var i = 0; i < data.items.array.length; i++) {
        var obj = data.items.array[i];
        items.addItem(obj.itemID, obj.name, obj.equip);
    }

    // Extract shop from here trying
    shop = Shop(data.shop.x, data.shop.y, data.shop.width, data.shop.height, images["shop"]);
    for (var i = 0; i < data.shop.inventory.length; i++) {
        shop.addItem(data.shop.inventory[i].itemID, data.shop.inventory[i].price);
    }

    // Remove login form
    document.getElementById('login').style.display = "none";
    document.getElementById('hud').style.display = "block";
    //document.getElementById('playerNum').style.display = "block";
    document.getElementById('playerName').style.display = "block";
    document.getElementById('chatbox').style.display = "block";
    document.getElementById('inventButton').style.visibility = "visible";
    document.getElementById('chatHistory').style.visibility = "visible";
    document.getElementById('chatBubble').style.visibility = "visible";
    document.getElementById('moneyPic').style.visibility = "visible";

    // Extract the PList
    for (var i in localPList) {
        var temp = localPList[i];
        pList[i] = Player(temp.x, temp.y, temp.name, temp.xDes, temp.yDes, temp.speed, temp.facing, temp.head, temp.body, temp.hand, temp.invent, temp.intent, temp.state, temp.money);
    }

    // Start the main loop
    setInterval(gameLoop, 1000/gameTick);
});