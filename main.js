/*********************************************\
|*  Matthew Cles                             *|
|*                                           *|
|*  Bubble Wars!!                            *|
|*                                           *|
|*  How it Works:                            *|
|*  At the start, there are 14 individually  *|
|*  colored bases. These bases can spawn     *|
|*  minions to attack other bases or capture *|
|*  command points that will spawn minions   *|
|*  for whatever color controls it. Minions  *|
|*  can attack other minions, flee from      *|
|*  other minions, attack enemy bases,       *|
|*  capture command points, attack command   *|
|*  points, repair its colors base, and      *|
|*  repair its colors command points. The    *|
|*  last color standing wins...              *|
|*  Until you click refresh...               *|
|*  Enjoy!                                   *|
\*********************************************/

var AM = new AssetManager();

const HIVE = 0;
const MINION = 1;
const RESOURCEPOINT = 2;
const SMALL = 0;
const MEDIUM = 1; 
const LARGE = 2;
const MAP_HEIGHT = 650;
const MAP_WIDTH = 1300;
const ATTACKER = 0;
const DEFENDER = 1;
const ASSASSIN = 2;
const GATHERER = 3;
const BUFFER = 2.4;
const MINION_SPAWN_TIME = .1;
const SCALEING = 5;
const MAX_VELOCITY = 150;
const ACCELERATION = 1000000 / SCALEING;
const VISUAL_RANGE = 80 * SCALEING;
const VISUAL_RANGE_BOOST = 1000000;
const JOIN_RATIO = 1 / 30;
const HIVE_RATIO = 1 / 50;
const HIVE_RANGE = 3;
const MAX_MINIONS = 500;
const REPAIR_RATE = .5;//.35;
const NUM_START_HIVES = 14;
const NUM_RESOURCE_POINTS = 10;
const MIN_NUM_RESOURCES = 5;
const MAX_NUM_RESOURCES = 22;

var socket = io.connect("http://76.28.150.193:8888");
var gameEngine = new GameEngine();
    
socket.on("load", function (data) {
    console.log(data.data);
	gameEngine.entities = [];
	for (var i = 0; i < data.data.length; i++) {
		var item = data.data[i];
		switch (item.dataType) {
			case HIVE:
				var hive = new Hive(gameEngine, item.color, "White", item.playerNumber);
				//color, playerNumber, mass, type, dataType, masterID, x, y, xVel, yVel
				hive.mass = item.mass;
				hive.type = item.type;
				hive.dataType = item.dataType;
				hive.x = item.x;
				hive.y = item.y;
				gameEngine.addEntity(hive);
				break;
			case MINION:
				var minion = new Minion(gameEngine, item.color, item.playerNumber, ATTACKER, item.x, item.y);
				minion.mass = item.mass;
				minion.type = item.type;
				minion.dataType = item.dataType;
				minion.velocity.x = item.xVel;
				minion.velocity.y = item.yVel;
				gameEngine.addEntity(minion);
				break;
			case RESOURCEPOINT:
				var rp = new ResourcePoint(gameEngine, item.size);
				//color, playerNumber, mass, type, dataType, masterID, x, y, xVel, yVel
				rp.color = item.color;
				rp.player = item.playerNumber;
				rp.mass = item.mass;
				rp.type = item.type;
				rp.dataType = item.dataType;
				rp.x = item.x;
				rp.y = item.y;
				rp.percentHeld = item.percentHeld;
				rp.captured = item.captured;
				console.log(rp);
				gameEngine.addEntity(rp);
				break;
		}
	}
	console.log("Loaded Data");
});

function save () {
	var save = [];
	console.log(gameEngine.entities.length);
	for (var i = 0; i < gameEngine.entities.length; i++) {
		var item = gameEngine.entities[i];
		var vx = 0;
		var vy = 0;
		if (item.dataType === MINION) {
			vx = item.velocity.x;
			vy = item.velocity.y;
		}
		var percentHeld = 0;
		var captured = false;
		if (item.dataType ===RESOURCEPOINT) {
			percentHeld = item.percentHeld;
			captured = item.captured;
		}
		save.push(new Storage(item.color, item.player, item.mass, item.type, item.dataType, item.x, item.y, vx, vy, item.size, percentHeld, captured));
		console.log(save[i]);
	}
	socket.emit("save", { studentname: "Matthew Cles", statename: "saveData", data: save });
	console.log("Saved: " + save);
}

function Storage(color, playerNumber, mass, type, dataType, x, y, xVel, yVel, size, percentHeld, captured){
	this.color = color;
	this.playerNumber = playerNumber;
	this.mass = mass;
	this.type = type;
	this.dataType =dataType;
	this.x = x;
	this.y = y;
	this.xVel = xVel;
	this.yVel = yVel;
	this.size = size;
	this.percentHeld = percentHeld;
	this.captured = captured
}

function load () {
	socket.emit("load", { studentname: "Matthew Cles", statename: "saveData" });
}

function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function Hive(game, color, outlineColor, playerNumber) {
	this.type = HIVE;
	this.dataType = HIVE;
	this.mass = 50;
	this.maxMass = 300;
	this.radius = this.mass/SCALEING;
    this.x = this.maxMass/SCALEING + Math.floor(Math.random() * ((MAP_WIDTH - 2 * this.maxMass/SCALEING)/(this.maxMass/SCALEING * BUFFER))) * (this.maxMass/SCALEING * BUFFER);
    this.y = this.maxMass/SCALEING + Math.floor(Math.random() * ((MAP_HEIGHT - 2 * this.maxMass/SCALEING)/(this.maxMass/SCALEING * BUFFER))) * (this.maxMass/SCALEING * BUFFER);
	this.color = color;
	this.outlineColor = outlineColor
	this.player = playerNumber;
    this.game = game;
	this.spawnDecicions = new Array();
	this.spawnDecicions[ATTACKER] = 100;
	this.spawnDecicions[DEFENDER] = 100;
	this.spawnDecicions[ASSASSIN] = 100;
	this.spawnDecicions[GATHERER] = 100;
    this.ctx = game.ctx;
}

Hive.prototype.draw = function () {
	ctx = this.ctx;
	if (this.radius < 0) this.radius = 0;
	ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
	ctx.beginPath();
    ctx.strokeStyle = this.outlineColor;
	ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.closePath();
    Entity.prototype.update.call(this);
}

Hive.prototype.update = function () {	
	this.radius = this.mass/SCALEING;
	addMinion(this);
    if (this.mass <= 0) {
	   this.die();
    }
}

function addMinion (hive) {
	var minion = new Minion(hive.game, hive.color, hive.player, ATTACKER, hive.x, hive.y, hive);
	hive.game.addEntity(minion);
}

function ResourcePoint (game, size) {
	this.radius = 150 / SCALEING;
	this.type = RESOURCEPOINT;
	this.dataType = RESOURCEPOINT;
	if (size == SMALL) {
		this.radius = 50 / SCALEING;
	} else if (size == MEDIUM) {
		this.radius = 100 / SCALEING;
	} else if (size == LARGE) {
		this.radius = 150 / SCALEING;
	}
	this.x = 300/SCALEING + Math.floor(Math.random() * ((MAP_WIDTH - 2 * 300/SCALEING)/(300/SCALEING * BUFFER))) * (300/SCALEING * BUFFER);
    this.y = 300/SCALEING + Math.floor(Math.random() * ((MAP_HEIGHT - 2 * 300/SCALEING)/(300/SCALEING * BUFFER))) * (300/SCALEING * BUFFER);
	this.color = -999;
	//this.master = -999;
	this.size = size;
	this.sizeForCapture = size * 50;
	this.caputured = false;
	this.percentHeld = 0;
	this.game = game;
    this.ctx = game.ctx;
}

ResourcePoint.prototype.draw = function() {
	ctx = this.ctx;
	var rad = this.radius * this.percentHeld / this.sizeForCapture;
	if (rad < 0) rad = 0;
	if (this.color != -999) {
		ctx.beginPath();
		ctx.fillStyle = this.color;
		ctx.arc(this.x, this.y, rad, 0, Math.PI * 2, false);
		ctx.fill();
		ctx.closePath();
	}
	ctx.beginPath();
    ctx.strokeStyle = "White";
	ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.closePath();
	if (this.captured) {
		ctx.beginPath();
		ctx.strokeStyle = this.color;
		ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2, false);
		ctx.stroke();
		ctx.closePath();
	}
    Entity.prototype.update.call(this);
}

ResourcePoint.prototype.update = function () {
	if (this.captured && this.color != -999) {
		var minion = new Minion(this.game, this.color, 0, ATTACKER, this.x, this.y/*, this.master*/);
		this.game.addEntity(minion);
	}
}

ResourcePoint.prototype.capture = function (capt) {
	var newOwner = false;
	 if (this.color == -999) {
		 this.color = capt.color.slice(0, [capt.color.length]);
		 //this.master = capt.master;
		 newOwner = true;
	 } else if (this.color == capt.color) {
		 if (this.percentHeld < this.sizeForCapture) {
			 this.percentHeld += REPAIR_RATE;
		 }
		 if (this.percentHeld >= this.sizeForCapture) {
			 this.captured = true;
		 }
	 } else if (this.color != capt.color) {
		 this.percentHeld -= 1;
	 }
	 if (!newOwner && this.percentHeld <= 0) {
		 this.color = -999;
		 this.captured = false;
		 //this.master = -999;
		 this.percentHeld = 0;
	 }
}

function Minion(game, color, playerNumber, type, x, y/*, master*/) {
	this.type = MINION;
	this.dataType = MINION;
	this.mass = 5;
	this.maxMass = 100;
	this.radius = this.mass/SCALEING;
	var joinable = Math.floor(Math.random() * 3);
	if (joinable) {
		this.joinable = true;
	} else {
		this.joinable = false;
	}
	this.visualRadius = VISUAL_RANGE;
    this.x = x
    this.y = y
	this.xSpeed = Math.random() * 2 * MAX_VELOCITY - MAX_VELOCITY;
	this.ySpeed = Math.random() * 2 * MAX_VELOCITY - MAX_VELOCITY;
	this.color = color;
	this.player = playerNumber;
    this.game = game;
	this.type = type;
	var rand = Math.floor(Math.random() * 5);
	if (!rand) this.type = DEFENDER;
	//this.master = master;
    this.ctx = game.ctx;
	
    this.velocity = { x: Math.random() * 2 * MAX_VELOCITY - MAX_VELOCITY, y: Math.random() * 2 * MAX_VELOCITY - MAX_VELOCITY };
    var speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    if (speed > MAX_VELOCITY) {
        var ratio = MAX_VELOCITY / speed;
        this.velocity.x *= ratio;
        this.velocity.y *= ratio;
    }
}

Minion.prototype.draw = function () {
	ctx = this.ctx;
	if (this.radius < 0) this.radius = 0;
	ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
    Entity.prototype.update.call(this);
}

Minion.prototype.update = function () {
   var outOfBounds = false;
   if (this.mass > this.maxMass) {
	   this.mass == this.maxMass;
   }
   this.radius = this.mass/SCALEING;
   this.x += this.velocity.x * this.game.clockTick;
   this.y += this.velocity.y * this.game.clockTick;
   if (this.x < 0 || this.x > MAP_WIDTH || this.y < 0 || this.y > MAP_HEIGHT) {
	   this.visualRadius = VISUAL_RANGE_BOOST;
	   nudgeInward(this);
	   outOfBounds = true;
   } else {
	   this.visualRadius = VISUAL_RANGE;
   }
   collide(this);
   if (!outOfBounds) {
	   if (this.type == ATTACKER) droneAdjustPath(this);
	   else builderAdjustPath(this);
   }
   if (this.mass <= 0) {
	   this.die();
   }
}

function droneAdjustPath (ent) {
	for (var i = 0; i < ent.game.entities.length; i++) {
		var other = ent.game.entities[i];
		if (ent != other && distance(ent, other) < ent.visualRadius + other.radius) {
            var dist = distance(ent, other);
            if ((other.type == HIVE || other.type == MINION) && /**/other.color != ent.color && dist > ent.radius + other.radius) {
                var difX = (other.x - ent.x)/dist;
                var difY = (other.y - ent.y)/dist;
				if (ent.mass >= other.mass) {
					ent.velocity.x += difX * ACCELERATION / (dist * dist);
					ent.velocity.y += difY * ACCELERATION / (dist * dist);
                } else if (other.type == HIVE && distance(ent, other) < ent.visualRadius / HIVE_RANGE + other.radius) {
					ent.velocity.x += difX * ACCELERATION / (dist * dist) * (HIVE_RATIO);
					ent.velocity.y += difY * ACCELERATION / (dist * dist) * (HIVE_RATIO);
				}else {
					ent.velocity.x -= difX * ACCELERATION / (dist * dist);
					ent.velocity.y -= difY * ACCELERATION / (dist * dist);
				}
				var speed = Math.sqrt(ent.velocity.x*ent.velocity.x + ent.velocity.y*ent.velocity.y);
                if (speed > MAX_VELOCITY) {
                    var ratio = MAX_VELOCITY / speed;
                    ent.velocity.x *= ratio;
                    ent.velocity.y *= ratio;
                }
            }else if (ent.joinable && other.color == ent.color && dist > ent.radius + other.radius && ent.mass <= other.mass && other.mass != other.maxMass) {
                var difX = (other.x - ent.x)/dist;
                var difY = (other.y - ent.y)/dist;
				ent.velocity.x += (difX * ACCELERATION / (dist * dist)) * (JOIN_RATIO);
				ent.velocity.y += (difY * ACCELERATION / (dist * dist)) * (JOIN_RATIO);
				var speed = Math.sqrt(ent.velocity.x*ent.velocity.x + ent.velocity.y*ent.velocity.y);
                if (speed > MAX_VELOCITY) {
                    var ratio = MAX_VELOCITY / speed;
                    ent.velocity.x *= ratio;
                    ent.velocity.y *= ratio;
                }
            }
        }
	}
}

function builderAdjustPath (ent) {
	for (var i = 0; i < NUM_START_HIVES + MAX_NUM_RESOURCES; i++) {
		var other = ent.game.entities[i];
		if (ent != other && distance(ent, other) < ent.visualRadius * 5 + other.radius) {
            var dist = distance(ent, other);
            if (other.type == RESOURCEPOINT && (other.percentHeld < other.sizeForCapture || other.color != ent.color) && dist > ent.radius/2 + other.radius/4) {
                var difX = (other.x - ent.x)/dist;
                var difY = (other.y - ent.y)/dist;
				ent.velocity.x += difX * ACCELERATION / (dist * dist);
				ent.velocity.y += difY * ACCELERATION / (dist * dist);
                
				var speed = Math.sqrt(ent.velocity.x*ent.velocity.x + ent.velocity.y*ent.velocity.y);
                if (speed > MAX_VELOCITY) {
                    var ratio = MAX_VELOCITY / speed;
                    ent.velocity.x *= ratio;
                    ent.velocity.y *= ratio;
                }
            }
        }
	}
}

function nudgeInward (ent) {
	var dist = distance(ent, {x: MAP_WIDTH/2, y: MAP_HEIGHT/2});
	var difX = (MAP_WIDTH/2 - ent.x)/dist;
	var difY = (MAP_HEIGHT/2 - ent.y)/dist;
	ent.velocity.x += difX * ACCELERATION / dist;
	ent.velocity.y += difY * ACCELERATION / dist;
	
	var speed = Math.sqrt(ent.velocity.x*ent.velocity.x + ent.velocity.y*ent.velocity.y);
	if (speed > MAX_VELOCITY) {
		var ratio = MAX_VELOCITY / speed;
		ent.velocity.x *= ratio;
		ent.velocity.y *= ratio;
	}
}

function collide(ent) {
	for (var i = 0; i < ent.game.entities.length; i++) {
		var other = ent.game.entities[i];
		if (ent != other && distance(ent, other) <= ent.radius + other.radius) {
			if (other.type == RESOURCEPOINT) {
				if (other.color == -999 || other.color != ent.color || other.percentHeld < 100) {
					ent.mass -= 1;
					other.capture(ent);
				}
			}else if (ent.color != other.color) {
				ent.mass -= 1;
				other.mass -= 1;
			} else  if (/*ent.master == other/**/other.dataType == HIVE && ent.color == other.color && other.mass < other.maxMass) {
				ent.mass -= 1;
				other.mass += REPAIR_RATE;
			} else {
				if (ent.mass < ent.maxMass && ent.mass > other.mass) {
					ent.mass++;
					other.mass--;
				} else if (other.mass < other.maxMass){
					other.mass++;
					ent.mass--;
				}
			}
		}
	}
}

Minion.prototype.die = function() {
	var index = this.game.entities.indexOf(this);
	if (index > -1) this.game.entities.splice(index, 1);
	this.delete;
}

Hive.prototype.die = function() {
	var index = this.game.entities.indexOf(this);
	if (index > - 1) this.game.entities.splice(index, 1);
	this.delete;
}

function overlapEntity(entities, thisEntity) {
	for (var i = 0; i < entities.length; i ++) {
		if (entities[i].x == thisEntity.x && entities[i].y == thisEntity.y) {
			return true;
		}
	}
	return false;
}

function newGame() {
	gameEngine.entities = [];
	startGame(gameEngine.ctx);
}

function startGame(ctx) {
	var colors =        ["Blue",  "Red",   "Green", "Pink", "Grey",   "Yellow", "DarkOrange", "Maroon", "LightSkyBlue", "Indigo", "Purple", "Teal", "Gold", "DarkBlue"];
	var outlineColors = ["White", "White", "White", "White", "White",  "White",  "White", "White", "White", "White", "White", "White",  "White",  "White"];
	for (var i = 0; i < colors.length; i++) {
		var h = new Hive(gameEngine, colors[i], outlineColors[i], i);
		while (overlapEntity(gameEngine.entities, h)) {
			h = new Hive(gameEngine, colors[i], outlineColors[i], i);
		}
		gameEngine.addEntity(h);
	}
	for (var i = 0; i < Math.floor(Math.random() * (MAX_NUM_RESOURCES - MIN_NUM_RESOURCES) + MIN_NUM_RESOURCES); i++) {
		var r = new ResourcePoint(gameEngine, Math.floor(Math.random() * 2 + 1));
		var tries = 0;
		while (overlapEntity(gameEngine.entities, r) || tries > 1000) {
			r = new ResourcePoint(gameEngine, Math.floor(Math.random() * 2 + 1));
			tries += 1;
		}
		gameEngine.addEntity(r);
	}
}

AM.queueDownload("./img/But_I_don't_need_any_files..._Oh_well_here_is_a_weird_little_face_.png");

AM.downloadAll(function () {
    var canvas = document.getElementById("gameWorld");
    var ctx = canvas.getContext("2d");
    gameEngine.init(ctx);
	startGame(ctx);
	console.log(gameEngine.entities);
	gameEngine.start();
});