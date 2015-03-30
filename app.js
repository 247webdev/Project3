// entry point when server starts

// setup env
var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    redis = require("redis"),
    client = redis.createClient(),
    methodOverride = require("method-override"),
    roomNumber=1,
    playerPair=0,
    bodyParser = require("body-parser"),
    waitingRoom =[], 
    gameRooms=[]; 

// allows us to use ejs instead of html
app.set("view engine", "ejs");

// more middleware  Christian added this... found in my class examples... do we need? body parser to get the player's name from the form withing the modal. method override for the routes that add to redis. wondering about this one since we already are emitting the moves, I'm thinking the controller would handle the action based on that.
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method')); // probably not needed.
 
// location for static files
app.use(express.static(__dirname + '/public'));

// root route
app.get('/', function(req, res){
  res.render("index.ejs");
});

// player's name route
app.get('/player', function(req, res){
  //removed variables that were already handled by socketIO on connection
  //need to discuss matchmaking, we can set up game id for an actual pair, vs attaching player 1 to game id
  client.HSETNX("gameIDs", gameObj.playerID, gameObj.gameID); // this is like a data dictionary. playerID may be their game's ID if they were the first player, or they get associated with the game's ID
  client.HSETNX("opponent", gameObj.playerID, gameObj.opponentID); // Christian needs answer from Will===> Are the socket.io IDs unique? HSETNX sets the opponent player's ID only if this hash's key doesn't already exist otherwise, it is not set. AKA, no overwrite
  //they are unique. need to discuss matchmaking or can i grab your code and run with it - will

  // what if this route doesn't render or redirect? 
  res.redirect("/");  // redirects are to routes while renders are to views
  res.render("index.ejs"); // thinking not to redirect since modal will show again. need this to be ajaxified
});

// shot fired route 
app.get('/shot/shotObj', function(req, res){
  // gameID is the first player's socket.io ID stored in hash "gameID"
  // gameID 
  if( HEXISTS("gameIDs", gameObj.playerID) && shotObj ){
    var gameID = client.HGET("gameIDs", gameObj.playerID); // This gets the game's ID from the data dictionary

    // check if shot is a hit or miss  should be game prototyped?
    if( HEXISTS("opponent", gameObj.playerID) ){
      var opponentID = client.HGET("opponent", gameObj.playerID); // this gets the opponent player's ID from the opponent dictionary

      if( HEXISTS("ships", gameObj.opponentID) ){
        var opponentsShips = client.HGETALL("ships"); // this gets the opponent player's ship placements
        if( opponentsShips.contains(shotObj.shot) ){ // Christian needs answer from Christian ===> syntax?? is the shot contained within the opponentsShips array?
          // shot is a hit

          if (1){ // Christian needs answer from ???===>HOW TO check if the ship is sunk!!
            // the ship is sunk
            // flash message ship sunk
            // do something

          } else {
            // ship hit but NOT sunk!
            // flash message a hit
            // do something
          } // END if ship sunk

        } else {
          // shot is a miss
          // do something
        } // END if shot hit

        client.RPUSH(gameID, gameObj.playerID, shotObj ); // WHAT DATA FORMAT SHOULD I USE???? Here, RPUSH adds the info to the end otherwise, LPUSH I would have to reverse the shotObj with playerID. I think I need to consider the socket.io ID as the list's key for the data, then I should use SET?  
        gameObj.currentPlayerID = ( gameObj.currentPlayerID === gameObj.gameID ) ? gameObj.player1ID : gameObj.player2ID;
      } else {
        // no opponent ships found??? what to do
      } // END if( opponentsShips.contains(shotObj.shot) 

    } else {
      // no opponent found. what to do???
    }// END if( HEXISTS("opponent", playerID)

    // render or redirect???
  }
});

// about us route
app.get('/about', function(req, res){
  res.render("about.ejs");
});

// game instructions route
app.get('/instructions', function(req, res){
  res.render("instructions.ejs");
});

// game communication
io.on('connection', function(socket){
  socket.join(roomNumber);
  console.log(roomNumber);
  
  console.log('a user connected');

  socket.on('playerJoined', function(player) {
    socket.nickname=player;
    client.HSETNX("playersName", socket.id, player);
    waitingRoom.push(socket.nickname);
    playerPair++;
    //assign a game, roomNumber, and reset queue when two players are in the waiting room
    if (playerPair===2){
      gameRooms.push(GameObj.new(waitingRoom[0],waitingRoom[1],roomNumber));
      waitingRoom=[];
      roomNumber++;
      playerPair=0;
    }
  });

  socket.on('shot', function(shotObj){
    io.emit('shot', shotObj);
    client.LPUSH("shotFired", shotObj); //needs to merge with shot html route
    console.log(shotObj);
  });

  socket.on('disconnect', function(){
    console.log(socket.nickname + " disconnected");
    if (!socket.nickname) return;              
  });

});

function checkTwoPlayers() {
  console.log("Start Game check");

  client.LRANGE('playerList', 0, -1, function(err, reply) {
      console.log(reply);
      if (reply.length === 2) {
        startGame(reply);
      }
  });
}

function GameObj (player1,player2,player1name,player2name,id){
  this.player1=player1;  //socket
  this.player1name=player1name; //name
  this.player2=player2;
  this.player2name=player2name;
  this.id=id;
  gameOver=false; 
  //need to reset game if they want to play again, how to put player(s) back into waiting queue
  //function (--==somePlayerObject==--=) {
  //  boatArray.each
  //}
}

// load our server
http.listen(3000, function(){
  console.log('listening on *:3000');
});




