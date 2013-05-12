
function drawCircle(context, pos, radius, color) {
    context.beginPath();
    context.arc(pos[0], pos[1], radius, 0, 2 * Math.PI, true);
    context.fillStyle = color;
    context.fill();
}
function drawRect(context, x, y, width, height, color) {
    context.fillStyle = color;
    context.fillRect(x, y, width, height);
}
function drawText(context, text, font, style, x, y) {
    context.font = font;
    context.fillStyle = style;
    context.fillText(text, x, y);
}

function chooseFromArray(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(minimum, maximum) {
    rand = minimum + Math.floor(Math.random() * (maximum - minimum + 1));
    return rand;
}

function calc_hypotenuse_length(a, b) {
    return Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
}
function calc_distance(pos1, pos2) {
    xdiff = pos1[0] - pos2[0];
    ydiff = pos1[1] - pos2[1];
    return calc_hypotenuse_length(xdiff, ydiff);
}
function normalize_vector(xlength, ylength) {
    //Scale the vector down to 0-1
    hypotenuse = calc_hypotenuse_length(xlength, ylength);
    return [xlength/hypotenuse, ylength/hypotenuse];
}
function calc_vel(pos, destination, totalvel) {
    xdiff = destination[0] - pos[0];
    ydiff = destination[1] - pos[1];
    
    vel = normalize_vector(xdiff, ydiff);
    vel[0] *= totalvel;
    vel[1] *= totalvel;
    
    return vel;
}

function calc_time() {
    return Math.floor((gCurrentTime - gStartTime) / 1000);
}

function pos_to_draw_pos(pos, radius) {
    return [pos[0] - radius, pos[1] - radius];
}

//http://ejohn.org/blog/simple-javascript-inheritance/#postcomment
/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false, fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
 
  // The base Class implementation (does nothing)
  this.Class = function(){};
 
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);        
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function Class() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    Class.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;
 
    // And make this class extendable
    Class.extend = arguments.callee;
   
    return Class;
  };
})();

MyRoundSprite = Class.extend({
    init: function(pos, vel, maxradius, startradius) {
        this.pos = pos;
        this.vel = vel;
        this.maxradius = maxradius;
        this.currentradius = startradius;
        
        this.age = 0;
        this.lifespan = Infinity;
    },
    update: function(dt) {
        this.age += dt;
        
        this.pos[0] += (this.vel[0] * dt);
        this.pos[1] += (this.vel[1] * dt);
    },
    is_offscreen: function() {
        return this.pos[0] < 0 || this.pos[0] > gSettings.width || this.pos[1] < 0 || this.pos[1] > gSettings.height;
    },
    is_old: function() {
        return this.age > this.lifespan;
    }
});

TheWorld = MyRoundSprite.extend({
    init: function() {
        
        pos = [gSettings.width/2, gSettings.height/2];
        this._super(pos, [0, 0], gSettings.planetradius, gSettings.planetradius);
    },
    draw: function(context) {
         context.drawImage(gImage.getImage('planet'), this.pos[0] - this.currentradius, this.pos[1] - this.currentradius);
    }
});

MissileState = {
    FLYING : 1,
    EXPLODING : 2,
    COLLAPSING : 3
}

Missile = MyRoundSprite.extend({
	init: function(pos, vel, color, blastspeed) {
	    this.state = MissileState.FLYING;
        this.color = color;
        this.blastspeed = blastspeed;

        this._super(pos, vel, gSettings.blastradius, gSettings.missileradius);
	},
	//size : {x:0,y:0},
	update : function(dt) {
        this._super(dt);
        
        if (this.is_offscreen()) {
            this.kill();
        }
        
        if (this.state == MissileState.EXPLODING) {
            this.radius_float += (this.blastspeed * dt);
            this.currentradius = Math.floor(this.radius_float);
            if (this.currentradius > this.maxradius) {
                this.state = MissileState.COLLAPSING;
            }
        } else if (this.state == MissileState.COLLAPSING) {
            this.radius_float -= (this.blastspeed * dt);
            this.currentradius = Math.round(this.radius_float);
            if (this.currentradius < 0) {
                this.kill();
                return;
            }
        }
    },
    draw: function(context) {
        drawCircle(context, this.pos, this.currentradius, this.color);
    },
    explode: function() {
        if (this.state == MissileState.FLYING) {
            this.state = MissileState.EXPLODING;
            this.radius_float = this.currentradius;
            this.vel = [0,0];
            gSound.play('explosion');
        }
    },
    kill: function() {
        var index = gMissiles.indexOf(this);
        gMissiles.splice(index, 1);
    }
});

EnemyMissile = Missile.extend({
    init: function() {
        pos = Array(2);
        if (chooseFromArray([0, 1]) == 0) {
            // left or right side
            pos[0] = chooseFromArray([0, gSettings.width]);
            pos[1] = getRandomInt(0, gSettings.height);
        } else {
            // top or bottom edge
            pos[0] = getRandomInt(0, gSettings.width);
            pos[1] = chooseFromArray([0, gSettings.height]);
        }
        vel = calc_vel(pos, [gSettings.width/2, gSettings.height/2], gSettings.missilevelocity);
    
        this._super(pos, vel, 'red', gSettings.blastspeed);
    },
    kill: function() {
        this._super();
        gEnemyCount--;
    }
});

FriendlyMissile = Missile.extend({
    init: function(destination) {
        this.center = [gSettings.width/2, gSettings.height/2];
        this.targetrange = calc_distance(this.center, destination);
        
        // use center as start pos so we can figure out vel vector
        vel = calc_vel(this.center, destination, gSettings.missilevelocity * 2);
        
        vector = normalize_vector(vel[0], vel[1]);
        h = gSettings.planetradius + gSettings.missileradius + 1;
        x = gSettings.width/2 + (vector[0] * h);
        y = gSettings.height/2 + (vector[1] * h);
        pos = [Math.round(x), Math.round(y)];
        
        this._super(pos, vel, 'white', gSettings.blastspeed);
        
        gSound.play('launch');
    },
    update: function(dt) {
        this._super(dt);
        
        if (this.targetrange < calc_distance(this.pos, this.center)) {
            this.explode();
        }
    }
});

SoundManager = Class.extend({
    clips: [],
    enabled: true,
    init: function() {
        try {
            this._context = new webkitAudioContext();
            
            this.clips['launch'] = new Audio("sfx_fly.ogg");
            this.clips['explosion'] = new Audio("DeathFlash.ogg");
            this.clips['music'] = new Audio("DST-AngryRobotIII.mp3");
        } catch(e) {
            alert("Web Audio not supported");
        }
    },
    play: function(name) {
        if (this.enabled) {
            this.clips[name].currentTime = 0;
            this.clips[name].play();
        }
    },
    stop: function(name) {
        if (this.enabled) {
            this.clips[name].pause();
        }
    }
});
var gSound = new SoundManager();

function onImageLoad() {
    gImage.numImagesLoaded++;
}
ImageManager = Class.extend({
    numImagesToLoad: 1,
    numImagesLoaded: 0,
    images: [],
    init: function() {            
        this.images['planet'] = new Image();
        this.images['planet'].onload = onImageLoad;
        this.images['planet'].src = 'terre.png';
    },
    getImage: function(name) {
        if (this.numImagesToLoad == this.numImagesLoaded) {
            return this.images[name];
        } else {
            return null;
        }
    }
});
var gImage = new ImageManager();

function onMouseClick(event) {
    if (gState == State.INGAME) {
        gMissiles.push(new FriendlyMissile([event.x, event.y]));
    }
}
function onKeyPress(event) {
    // if there's no game in progress and they press space, start a game
    if (gState == State.PREGAME || gState == State.ENDGAME) {
        if (event.keyCode == 32) {
            newGame();
        }
    }
}

function drawPixel (x, y, r, g, b, a) {
    var index = (x + y * gCanvas.width) * 4;

    gCanvasData.data[index + 0] = r;
    gCanvasData.data[index + 1] = g;
    gCanvasData.data[index + 2] = b;
    gCanvasData.data[index + 3] = a;
}
function updateCanvas() {
    gContext.putImageData(gCanvasData, 0, 0);
}

var gCanvas = document.getElementById('blueballdefendercanvas');
gCanvas.addEventListener('click', onMouseClick);
window.addEventListener('keypress', onKeyPress, false);
var gContext = gCanvas.getContext('2d');
var gCanvasData = gContext.getImageData(0, 0, gCanvas.width, gCanvas.height);

gStartTime = 0;
gCurrentTime = 0;

State = {
    PREGAME: 1,
    INGAME: 2,
    ENDGAME: 3
}
gState = State.PREGAME;

gSettings = {
    width: gCanvas.width,
    height: gCanvas.height,
    
    missilevelocity: 25,
    missileradius: 2,
    
    blastspeed: 12,
    blastradius: 70,
    
    planetradius: 16,
    
    splashBackgroundColor: "#0A0A0A",

    splashTextColor: "#88CEFA",
    bigFont: '24pt Arial',
    smallFont: '18pt Arial'
}
gTheWorld = new TheWorld();
gMissiles = [];
gStars = [];
gEnemyCount = 0;
var ONE_FRAME_TIME = 1000 / 60;

function newGame() {
    gMissiles = [];
    gEnemyCount = 0;
    gStartTime = Date.now();
    gState = State.INGAME;
    gSound.play('music');
}
function endGame() {
    gState = State.ENDGAME;
    gSound.stop('music');
}

function one_second_update() {
    if (gState == State.INGAME) {
        spawn_enemy_missile();
    }
}
function spawn_enemy_missile() {
    gCurrentTime = Date.now();
    
    // Raise max number of missiles by 1 every 10 seconds
    gameTime = gCurrentTime - gStartTime;
    enemies = Math.floor(gameTime / 10000) + 1;
    
    if (gEnemyCount < enemies) {
        m = new EnemyMissile();
        gMissiles.push(m);
        gEnemyCount++;
    }
}

function updateGame() {
    for (var i = 0; i < gMissiles.length; i++) {
        gMissiles[i].update(dt);
    }
}
function checkCollisions() {
    for (var i = 0; i < gMissiles.length; i++) {
        
        distance = calc_distance(gMissiles[i].pos, gTheWorld.pos);
        if (distance < (gMissiles[i].currentradius + gTheWorld.currentradius)) {
            gMissiles[i].explode();
            endGame();
        }
        
        for (var j = 0; j < gMissiles.length; j++) {
            if (i == j) {
                continue;
            }
            distance = calc_distance(gMissiles[i].pos, gMissiles[j].pos);
            if (distance < (gMissiles[i].currentradius + gMissiles[j].currentradius)) {
                
                gMissiles[i].explode();
                gMissiles[j].explode();
            }
        }
    }
}
function drawSplashPregame(context) {
    splashWidth = gSettings.width * (2/3);
    splashHeight = gSettings.height * (2/3);
    splashX = (gSettings.width - splashWidth) / 2;
    splashY = (gSettings.height - splashHeight) / 2;

    drawRect(context, splashX, splashY, splashWidth, splashHeight, gSettings.splashBackgroundColor);

    text = "Blue Ball Defender";
    x = splashX + 10;
    y = splashY + 50;
    drawText(context, text, gSettings.bigFont, gSettings.splashTextColor, x, y);
    
    text = "Our fragile blue planet is under attack";
    x = splashX + 10;
    y = splashY + 150;
    drawText(context, text, gSettings.smallFont, gSettings.splashTextColor, x, y);
    
    text = "Use the mouse to target missiles";
    x = splashX + 10;
    y = splashY + 200;
    drawText(context, text, gSettings.smallFont, gSettings.splashTextColor, x, y);
    
    text = "Press the space bar to begin";
    x = splashX + 10;
    y = splashY + 250;
    drawText(context, text, gSettings.smallFont, gSettings.splashTextColor, x, y);
}
function drawSplashEndgame(context) {
    splashWidth = gSettings.width * (2/3);
    splashHeight = gSettings.height * (2/3);
    splashX = (gSettings.width - splashWidth) / 2;
    splashY = (gSettings.height - splashHeight) / 2;
    
    drawRect(context, splashX, splashY, splashWidth, splashHeight, gSettings.splashBackgroundColor);
    
    text = "You lasted " + calc_time() + " seconds";
    x = splashX + 10;
    y = splashY + 50;
    drawText(context, text, gSettings.bigFont, gSettings.splashTextColor, x, y);
    
    text = "Press the space bar to try again";
    x = splashX + 10;
    y = splashY + 100;
    drawText(context, text, gSettings.smallFont, gSettings.splashTextColor, x, y);
}
function drawGame() {
    gContext.fillStyle = "black";
    gContext.fillRect(0 , 0, gCanvas.width, gCanvas.height);
    //context.clearRect(0, 0, canvas.width, canvas.height);
    
    //draw stars
    if (gStars.length == 0) {
        for (var i = 0; i < 100; i++) {
            xpos = getRandomInt(0, gSettings.width);
            ypos = getRandomInt(0, gSettings.height);
            gStars.push([xpos,ypos]);
            //drawPixel(x, y, 255, 255, 255, 255);
        }
        //updateCanvas();
        //gStars = true;
    }
    
    for (var i = 0; i < gStars.length; i++) {
        //gContext.fillRect(gStars[i][0], gStars[i][1], 1, 1);
        drawRect(gContext, gStars[i][0], gStars[i][1], 1, 1, 'white');
    }

    gTheWorld.draw(gContext);
    for (var i = 0; i < gMissiles.length; i++) {
        gMissiles[i].draw(gContext);
    }
    
    if (gState == State.PREGAME) {
        drawSplashPregame(gContext);
    } else if (gState == State.ENDGAME) {
        drawSplashEndgame(gContext);
    }
}

gOldTime = Date.now();
var mainloop = function() {
    newtime = Date.now();
    dt = (newtime - gOldTime)/1000;
    gOldTime = newtime;
    
    updateGame();
    checkCollisions();
    drawGame();
};

setInterval( mainloop, ONE_FRAME_TIME );
setInterval( one_second_update, 1000 );

// To stop the game, use the following:
//clearInterval(Game._intervalId);


