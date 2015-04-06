// entry point when server starts

// setup env
require('dotenv').load();
var express = require('express'),
app = express(),
http = require('http').Server(app),
io = require('socket.io')(http),
redis = require("redis"),
url = require('url'),
redisURL = url.parse(process.env.REDISCLOUD_URL),
client = redis.createClient(redisURL.port, redisURL.hostname, {no_ready_check: true});
client.auth(redisURL.auth.split(":")[1]);
// client = redis.createClient(),
var methodOverride = require("method-override"),
roomNumber=1,
playerPair=0,
bodyParser = require("body-parser"),
waitingRoom =[], 
gameRooms=[],
drydockA=[], 
drydockB=[]; 
// allows us to use ejs instead of html
app.set("view engine", "ejs");

console.log(process.env.REDISCLOUD_URL);

// more middleware  Christian added this... found in my class examples... do we need? body parser to get the player's name from the form withing the modal. method override for the routes that add to redis. wondering about this one since we already are emitting the moves, I'm thinking the controller would handle the action based on that.
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride('_method')); // probably not needed.

// location for static files
app.use(express.static(__dirname + '/public'));

// root route
app.get('/', function(req, res){
  res.render("index.ejs");
});

// about us route
app.get('/about', function(req, res){
  res.render("about.ejs");
});

// game instructions route
app.get('/instructions', function(req, res){
  res.render("instructions.ejs");
});

// game communication. ALL game emit events need to be handled within this block
io.on('connection', function(socket){  //step #1 connection
  socket.join(roomNumber);
  console.log(roomNumber);
  console.log(socket.id + " connected");
 
  socket.on('playerName', function(playerName) { 
    socket.nickname=playerName;
  });
  //SAVE USERNAME FROM playername TO REDIS FOR WIN/LOSS KEEPING, ALSO SESSION KEEPING use SOCKET.ID FOR THAT PART
  //client.HSETNX("playersName", socket.id, socket.id);  //this is the socket has not the actual user name
  //client.HSETNX("gameIDs", socket.id, socket.id);  //connecting the first player as a game id ref point 
  waitingRoom.push(socket);
  playerPair++;
  //assign a game, roomNumber, and reset queue when two players are in the waiting room
  if (playerPair===2){
    //client.HSETNX("opponent", socket.id, socket.id);  ? will we still need this...since player is being saved above as a player with session?
    // in case line above doesn't work client.HSETNX("opponent", gameObj.playerID, gameObj.opponentID); 
    
    gameRooms.push(new Game(waitingRoom[0],waitingRoom[1],roomNumber));
    waitingRoom=[];
    roomNumber++;
    playerPair=0;
  }

  socket.on('disconnect', function(){
    console.log(socket.id + " disconnected");            
  });

});

//game logic 
function Game (player1,player2,gameId){  
  //Game Setup
  this.player1=player1;
  this.player2=player2;
  this.gameId=gameId;  //gameroom
  var gameOver=false,
  player1ReadyStatus=false,
  player2ReadyStatus=false,
  readyToPlay=false;
  
  console.log(gameId + " game #");
  console.log("matchmaking complete, waiting for player ready and ship lockdown");
  
  // function shipMover (playersocket,docklocation){  //DO NOT TOUCH!
  //   playersocket.on('place_ship', function(placedShipObj){  
  //     var name=placedShipObj.name;
  //     var firstLocation = placedShipObj.cell.charAt(0);
  //     var secondLocation = placedShipObj.cell.charAt(1);
  //     var rotation=placedShipObj.rotation;
  //     if (name==="AircraftCarrier"){ 
  //       var carrier=[]; 
  //       carrier[0]=placedShipObj.cell;
  //       if (rotation===0){
  //         for (var i = 0; i < 4; i++) {
  //           secondLocation++; 
  //           newloc=firstLocation+secondLocation; 
  //           carrier.push(newloc);
  //         }
  //       }
  //       if (rotation===90){
  //         for (var l = 0; l < 4; l++) {
  //           firstLocation=nextLetter(firstLocation); 
  //           newloc=firstLocation+secondLocation; 
  //           carrier.push(newloc);
  //         }
  //         console.log(carrier);
  //       }
  //       docklocation[0]=carrier;
  //     }
  //     if (name==="Battleship"){ 
  //       var battleship=[]; 
  //       battleship[0]=placedShipObj.cell;
  //       if (rotation===0){
  //         for (var j = 0; j < 3; j++) {
  //           secondLocation++;
  //           newloc=firstLocation+secondLocation; 
  //           battleship.push(newloc);
  //         }
  //       }
  //       if (rotation===90)
  //       {
  //         for (var m = 0; m < 3; m++) {
  //           firstLocation=nextLetter(firstLocation); 
  //           newloc=firstLocation+secondLocation; 
  //           battleship.push(newloc);
  //         }
  //       }
  //       docklocation[1]=battleship;
  //     }
  //     if (name==="Submarine"){ 
  //       var submarine=[]; 
  //       submarine[0]=placedShipObj.cell;
  //       if (rotation===0){
  //         for (var k = 0; k < 2; k++) {
  //           secondLocation++; 
  //           newloc=firstLocation+secondLocation; 
  //           submarine.push(newloc);
  //         }
  //       }
  //       if (rotation===90){
  //         for (var n = 0; n < 2; n++) {
  //           firstLocation=nextLetter(firstLocation); 
  //           newloc=firstLocation+secondLocation; 
  //           submarine.push(newloc);
  //         }
  //         console.log(submarine);
  //       }
  //     docklocation[2]=submarine;
  //   }
  //   if (name==="Destroyer"){ 
  //     var destroyer=[]; 
  //     destroyer[0]=placedShipObj.cell;
  //     if (rotation===0){
  //       for (var p = 0; p < 2; p++) {
  //         secondLocation++;
  //         newloc=firstLocation+secondLocation; 
  //         destroyer.push(newloc);
  //       }
  //     }
  //     if (rotation===90){
  //       for (var o = 0; o < 2; o++) {
  //         firstLocation=nextLetter(firstLocation); 
  //         newloc=firstLocation+secondLocation; 
  //         destroyer.push(newloc);
  //       }
  //       console.log(destroyer);
  //     }
  //     docklocation[3]=destroyer;
  //   }
  //   if (name==="PtBoat"){ 
  //     var ptboat=[]; 
  //     ptboat[0]=placedShipObj.cell;
  //     if (rotation===0){
  //       secondLocation++; 
  //       newloc=firstLocation+secondLocation; 
  //       ptboat.push(newloc);
  //     }
  //     if (rotation===90){
  //       firstLocation=nextLetter(firstLocation); 
  //       newloc=firstLocation+secondLocation; 
  //       ptboat.push(newloc);
  //     }
  //     docklocation[4]=ptboat;
  //   }
  // });
  // }

player1.on('place_ship', function(placedShipObj){  
      var name=placedShipObj.name;
      var firstLocation = placedShipObj.cell.charAt(0);
      var secondLocation = placedShipObj.cell.charAt(1);
      var rotation=placedShipObj.rotation;
      if (name==="AircraftCarrier"){ 
        var carrier=[]; 
        carrier[0]=placedShipObj.cell;
        if (rotation===0){
          for (var i = 0; i < 4; i++) {
            secondLocation++; 
            newloc=firstLocation+secondLocation; 
            carrier.push(newloc);
          }
        }
        if (rotation===90){
          for (var l = 0; l < 4; l++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            carrier.push(newloc);
          }
          console.log(carrier);
        }
        drydockA[0]=carrier;
      }
      if (name==="Battleship"){ 
        var battleship=[]; 
        battleship[0]=placedShipObj.cell;
        if (rotation===0){
          for (var j = 0; j < 3; j++) {
            secondLocation++;
            newloc=firstLocation+secondLocation; 
            battleship.push(newloc);
          }
        }
        if (rotation===90)
        {
          for (var m = 0; m < 3; m++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            battleship.push(newloc);
          }
        }
        drydockA[1]=battleship;
      }
      if (name==="Submarine"){ 
        var submarine=[]; 
        submarine[0]=placedShipObj.cell;
        if (rotation===0){
          for (var k = 0; k < 2; k++) {
            secondLocation++; 
            newloc=firstLocation+secondLocation; 
            submarine.push(newloc);
          }
        }
        if (rotation===90){
          for (var n = 0; n < 2; n++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            submarine.push(newloc);
          }
          console.log(submarine);
        }
      drydockA[2]=submarine;
    }
    if (name==="Destroyer"){ 
      var destroyer=[]; 
      destroyer[0]=placedShipObj.cell;
      if (rotation===0){
        for (var p = 0; p < 2; p++) {
          secondLocation++;
          newloc=firstLocation+secondLocation; 
          destroyer.push(newloc);
        }
      }
      if (rotation===90){
        for (var o = 0; o < 2; o++) {
          firstLocation=nextLetter(firstLocation); 
          newloc=firstLocation+secondLocation; 
          destroyer.push(newloc);
        }
        console.log(destroyer);
      }
      drydockA[3]=destroyer;
    }
    if (name==="PtBoat"){ 
      var ptboat=[]; 
      ptboat[0]=placedShipObj.cell;
      if (rotation===0){
        secondLocation++; 
        newloc=firstLocation+secondLocation; 
        ptboat.push(newloc);
      }
      if (rotation===90){
        firstLocation=nextLetter(firstLocation); 
        newloc=firstLocation+secondLocation; 
        ptboat.push(newloc);
      }
      drydockA[4]=ptboat;
    }
  });
  

player2.on('place_ship', function(placedShipObj){  
      var name=placedShipObj.name;
      var firstLocation = placedShipObj.cell.charAt(0);
      var secondLocation = placedShipObj.cell.charAt(1);
      var rotation=placedShipObj.rotation;
      if (name==="AircraftCarrier"){ 
        var carrier=[]; 
        carrier[0]=placedShipObj.cell;
        if (rotation===0){
          for (var i = 0; i < 4; i++) {
            secondLocation++; 
            newloc=firstLocation+secondLocation; 
            carrier.push(newloc);
          }
        }
        if (rotation===90){
          for (var l = 0; l < 4; l++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            carrier.push(newloc);
          }
          console.log(carrier);
        }
        drydockB[0]=carrier;
      }
      if (name==="Battleship"){ 
        var battleship=[]; 
        battleship[0]=placedShipObj.cell;
        if (rotation===0){
          for (var j = 0; j < 3; j++) {
            secondLocation++;
            newloc=firstLocation+secondLocation; 
            battleship.push(newloc);
          }
        }
        if (rotation===90)
        {
          for (var m = 0; m < 3; m++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            battleship.push(newloc);
          }
        }
        drydockB[1]=battleship;
      }
      if (name==="Submarine"){ 
        var submarine=[]; 
        submarine[0]=placedShipObj.cell;
        if (rotation===0){
          for (var k = 0; k < 2; k++) {
            secondLocation++; 
            newloc=firstLocation+secondLocation; 
            submarine.push(newloc);
          }
        }
        if (rotation===90){
          for (var n = 0; n < 2; n++) {
            firstLocation=nextLetter(firstLocation); 
            newloc=firstLocation+secondLocation; 
            submarine.push(newloc);
          }
          console.log(submarine);
        }
      drydockB[2]=submarine;
    }
    if (name==="Destroyer"){ 
      var destroyer=[]; 
      destroyer[0]=placedShipObj.cell;
      if (rotation===0){
        for (var p = 0; p < 2; p++) {
          secondLocation++;
          newloc=firstLocation+secondLocation; 
          destroyer.push(newloc);
        }
      }
      if (rotation===90){
        for (var o = 0; o < 2; o++) {
          firstLocation=nextLetter(firstLocation); 
          newloc=firstLocation+secondLocation; 
          destroyer.push(newloc);
        }
        console.log(destroyer);
      }
      drydockB[3]=destroyer;
    }
    if (name==="PtBoat"){ 
      var ptboat=[]; 
      ptboat[0]=placedShipObj.cell;
      if (rotation===0){
        secondLocation++; 
        newloc=firstLocation+secondLocation; 
        ptboat.push(newloc);
      }
      if (rotation===90){
        firstLocation=nextLetter(firstLocation); 
        newloc=firstLocation+secondLocation; 
        ptboat.push(newloc);
      }
      drydockB[4]=ptboat;
    }
  });


player1.on("game_status",function(){  //can be refactored in v2
  if(drydockA.length===5){
    player1ReadyStatus=true;
    player1Fleet = new Fleet(drydockA[0],drydockA[1],drydockA[2],drydockA[3],drydockA[4]);
    console.log(player1Fleet);
    console.log("player1 "+player1.nickname+" is ready");
  }
});

player2.on("game_status", function(){
  if(drydockB.length===5){
    player2ReadyStatus=true;
    player2Fleet = new Fleet(drydockB[0],drydockB[1],drydockB[2],drydockB[3],drydockB[4]);
    console.log(player2Fleet);
    console.log("player2"+ player2.nickname+" is ready");
   // player1turn=true;
  }
});

  //firing mechanism
 
  //if (player1turn===true){
  player1.on('shot', function(shotObj){
    shotObj.player=player1.nickname;
    shotObj.hitORmiss=false;
    hitOrMiss(shotObj,player2Fleet.carrier,player2Fleet);
    hitOrMiss(shotObj,player2Fleet.battleship,player2Fleet);
    hitOrMiss(shotObj,player2Fleet.submarine,player2Fleet);
    hitOrMiss(shotObj,player2Fleet.ptboat,player2Fleet);
    hitOrMiss(shotObj,player2Fleet.destroyer,player2Fleet);
    io.emit('shot',shotObj);
    console.log(shotObj);
 //   player2.emit('turn',true);
 //   player1.emit('turn',false);
  });
  //}
  
  //if (player2turn===true)
  player2.on('shot', function(shotObj){  
    shotObj.player=player2.nickname;
    shotObj.hitORmiss=false;
    hitOrMiss(shotObj,player1Fleet.carrier,player1Fleet); //can be cleaned up
    hitOrMiss(shotObj,player1Fleet.battleship,player1Fleet);
    hitOrMiss(shotObj,player1Fleet.submarine,player1Fleet);
    hitOrMiss(shotObj,player1Fleet.ptboat,player1Fleet);
    hitOrMiss(shotObj,player1Fleet.destroyer,player1Fleet);
    io.emit('shot',shotObj);
    console.log(shotObj);
 //   player1.emit('turn',true);
 //   player2.emit('turn',false);
  }); 
  //}

function hitOrMiss(shotObj,ship,fleet){  
  if (ship!==[]){
    if (ship.indexOf(shotObj.id)!==-1){
      if(ship.length===1){ //last hit sinks ship
        console.log(ship.length);
        fleet.shipcount--; //why was -- not working, good question...
        console.log(fleet.shipcount);
        console.log(ship+" ship sunk at "+shotObj.id);
        if(fleet.shipcount===0)
        {
         gameOver=true;
         io.emit("game_status",gameOver); 
         console.log("gameover");
        }
      }
      hitFinder=ship.indexOf(shotObj.id);
      ship.splice(hitFinder,1); //removes from ship's working "length"
      shotObj.hitORmiss=true;
      console.log("hit detected at "+ shotObj.id); 
    }
  }
}
// function hitOrMiss(shotObj,fleet,shipcount){  
//   var hitFinder;
//   for(var i=0;i<fleet.length;i++){
//     if (fleet[i]!==[]){
//       for (var j = 0; j < fleet[i][j].length; j++) {
//         if (fleet[i][j].indexOf(shotObj)!==-1){
//           if(fleet[i][j].length===1){ //last hit sinks ship
//             shipcount--;
//           }
//           hitFinder=fleet[i][j].indexOf(shotObj);
//           fleet[i][hitFinder]=''; 
//           return true;
//         }
//       }
//     }
//   }
//   return false;
// }

function Fleet (carrier,battleship,submarine,destroyer,ptboat){
  this.carrier=carrier;
  this.battleship=battleship;
  this.submarine=submarine;
  this.destroyer=destroyer;
  this.ptboat=ptboat;
  this.shipcount=5;
} 


function nextLetter(str) {
  return str.replace(/[a-j]/, function(c){
    return String.fromCharCode(c.charCodeAt(0)+1);
  });
}

} //game object ending

// load our server with port switching for local or production
http.listen((process.env.PORT || 3000), function(){
  console.log('listening on *:3000');
});