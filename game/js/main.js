/*
 * game v1.0
 * © joyrex 2016
 * 
 */

// basic mobile detection

var isMobile = {
    Android: function() {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function() {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function() {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function() {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function() {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function() {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

// define stage, fit to screen if mobile or due to the nature of the game leave some space if not

var stageWidth;
var stageHeight;

if (isMobile.any()) {
    stageWidth = window.innerWidth;
    stageHeight = window.innerHeight;
} else {
    stageHeight = window.innerHeight - 40;
    stageWidth = stageHeight / 1.2;
}

// setup pixi shortcuts

var Container           = PIXI.Container,
    autoDetectRenderer  = PIXI.autoDetectRenderer,
    loader              = PIXI.loader,
    resources           = PIXI.loader.resources,
    Rectangle           = PIXI.Rectangle,
    Text                = PIXI.Text,
    TextureCache        = PIXI.utils.TextureCache,
    Texture             = PIXI.Texture,
    Sprite              = PIXI.Sprite;

// create container and setup renderer to be centered on screen

var stage = new Container(),
    renderer = autoDetectRenderer(
    stageWidth, stageHeight,
    {antialias: false, transparent: false, resolution: 1}
);
renderer.view.style.display = "block";
renderer.autoResize = true;
renderer.backgroundColor = 0xffffff;
document.body.appendChild(renderer.view);
renderer.view.style.position = "absolute";
renderer.view.style.left = '50%';
renderer.view.style.top = '50%';
renderer.view.style.transform = 'translate3d( -50%, -50%, 0 )';

// load assets

loader
    .add("img/projectile1.png")
    .add("img/character1.png")
    .add("img/bg.jpg")
    .add("img/reload.png")
    .load(setup);

// setup all global variables

var startScene,                            
    gameScene, 
    endScene;
var gameState;                             
var bgStart,                                        // sprites
    bgGame,
    bgEnd, 
    character, 
    projectiles;
var character_speed;                                // define character velocity
var difficulty_coefficient,                         // the difficulty multiplier
    projectile_countdown,                           // counter variable to determine activation time
    projectile_delay,                               // interval at which to shoot projectiles
    min_projectile_delay,                           // defines the min/max interval to wait between shots being fired
    max_projectile_delay,
    min_projectile_velocity,                        // defines the min/max velocity of projectiles
    max_projectile_velocity,
    min_concurrent_num_projectiles,                 // defines the min/max number of projectiles to be shot
    max_concurrent_num_projectiles,
    generation_count;                               // current shoot count, used to determine level
var character_txr,                                  // textures
    projectile_txr, 
    reload_txr,
    bg_txr;
var reload_btn;
var title_txt, 
    start_txt, 
    score_txt, 
    over_txt, 
    overscore_txt;
var score = 0;

/* 
 *  initialize variables and starting objects
 *
 */

function init() {
    score = 0;
    difficulty_coefficient = 2;
    projectile_countdown = 0;
    character_speed = 20;
    projectile_delay = 30;
    min_projectile_delay = 15;
    max_projectile_delay = 60;
    min_projectile_velocity = 10;
    max_projectile_velocity = 25;
    min_concurrent_num_projectiles = 2;
    max_concurrent_num_projectiles = 10;
    generation_count = 0;

    if (projectiles != undefined) {
        for (var i = projectiles.length; i--;) {
            gameScene.removeChild(projectiles[i]);
            projectiles.splice(i, 1);
        }
    }

    if (score_txt != undefined) {
        score_txt.text = "Score: " + score;
    }

    if (character != undefined) {
        character.position.x = (stageWidth/2)-(character.width/2);
    }
}

/*
 * setup the game
 * 
 */

function setup() {
    init();

    // controls

    stage.interactive = true;
    stage.touchstart = mainAction; 
    stage.touchend = function(touchData) {
        character.vx = 0;
    }
    stage.click = mainAction;
 
    var keyRight = keyboard(39),
        keyLeft = keyboard(37),
        keyReload = keyboard(82);

    keyRight.press = function() {
        character.vx = character_speed;
    }
    keyRight.release = function() {
        if (!keyLeft.isDown) {
            character.vx = 0;
        }
    }
    keyLeft.press = function() {
        character.vx = -character_speed;
    }
    keyLeft.release = function() {
        if (!keyRight.isDown) {
            character.vx = 0;
        }
    }
    keyReload.release = function() {
        init();
        endScene.visible = false;
        gameScene.visible = true;
        gameState = play;
    }

    // start scene setup

    startScene = new Container();
    stage.addChild(startScene);
    
    bg_txr = TextureCache["img/bg.jpg"];

    bgStart = new PIXI.TilingSprite(bg_txr, stageWidth, stageHeight);
    startScene.addChild(bgStart);

    title_txt = new Text("Game", {font: "84px Futura", fill: "white"});
    title_txt.x = stageWidth / 2 - title_txt.width / 2;
    title_txt.y = stageHeight / 2 - title_txt.height * 2;
    startScene.addChild(title_txt);

    start_txt = new Text("Tap or click to Start", {font: "58px Futura", fill: "white"});
    start_txt.x = stageWidth / 2 - start_txt.width / 2;
    start_txt.y = stageHeight / 2 - start_txt.height / 2;
    startScene.addChild(start_txt);

    // game scene setup

    gameScene = new Container();
    stage.addChild(gameScene);
    gameScene.visible = false;

    bgGame = new PIXI.TilingSprite(bg_txr, stageWidth, stageHeight)
    gameScene.addChild(bgGame);

    character_txr = TextureCache["img/character1.png"];
    character = new Sprite(character_txr);
    character.scale.x = 1;
    character.scale.y = 1;
    character.vx = 0;
    character.position.x = (stageWidth/2)-(character.width/2);
    character.position.y = 20;
    gameScene.addChild(character);

    projectile_txr = TextureCache["img/projectile1.png"];
    projectiles = [];

    score_txt = new Text("Score: " + score, {font: "40px Futura", fill: "white"});
    score_txt.x = 10;
    score_txt.y = stageHeight - score_txt.height - 10;
    gameScene.addChild(score_txt);

    // end scene setup

    endScene = new Container();
    stage.addChild(endScene);
    endScene.visible = false;

    bgEnd = new PIXI.TilingSprite(bg_txr, stageWidth, stageHeight)
    endScene.addChild(bgEnd);

    reload_txr = TextureCache["img/reload.png"];
    reload_btn = new Sprite(reload_txr);
    reload_btn.scale.x = 0.5;
    reload_btn.scale.y = 0.5;
    reload_btn.position.x = stageWidth/2 - reload_btn.width/2;
    reload_btn.position.y = stageHeight/2 - reload_btn.height/2 + reload_btn.height + 30;
    endScene.addChild(reload_btn);

    reload_btn.interactive = true;
    reload_btn.tap = function(e) {
        init();
        
        startScene.visible = false;
        gameScene.visible = true;
        endScene.visible = false;
        
        gameState = play;
    }

    over_txt = new Text("Game Over.", {font: "64px Futura", fill: "white"});
    over_txt.x = stageWidth/2 - over_txt.width/2;
    over_txt.y = stageHeight/2 - over_txt.height*2;
    endScene.addChild(over_txt);

    overscore_txt = new Text("Your Score: " + score, {font: "70px Futura", fill: "white"});
    overscore_txt.x = stageWidth/2 - overscore_txt.width/2;
    overscore_txt.y = over_txt.y + over_txt.height + 10;
    endScene.addChild(overscore_txt);

    // game loop

    gameState = start;
    gameLoop();
}

/* 
 * handle user input
 * 
 */

function keyboard(keyCode) {
    var key = {};
    key.code = keyCode;
    key.isDown = false;
    key.isUp = false;
    key.press = undefined;
    key.release = undefined;

    key.downHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isUp && key.press) key.press();
            key.isDown = true;
            key.isUp = false;
        }

        event.preventDefault();
    }

    key.upHandler = function(event) {
        if (event.keyCode === key.code) {
            if (key.isDown && key.release) key.release();
            key.isDown = false;
            key.isUp = true;
        }

        event.preventDefault();
    }

    window.addEventListener("keydown", key.downHandler.bind(key), false);
    window.addEventListener("keyup", key.upHandler.bind(key), false);

    return key;
}
 
/* 
 * main game loop, decides what should be playing
 * 
 */

function gameLoop() {
    requestAnimationFrame(gameLoop);

    gameState();

    renderer.render(stage);
}

/*
 * start function, empty, character selection/other stuff should be here
 * 
 */

function start() { }

/*
 * main game function, generates projectiles and moves character
 * 
 */

function play() {
    projectile_countdown++;
    if (projectile_countdown >= projectile_delay) {
        generateProjectile();
        projectile_countdown = 0;
        
        projectile_delay = randomInt(min_projectile_delay, max_projectile_delay);
        generation_count++;

        if ((generation_count % 4) == 0) {
            raise_difficulty();
        }
    }

    character.x += character.vx;

    if (projectiles.length > 0) {
        projectiles.forEach(function(projectile) {
            projectile.y -= projectile.vy;

            var projectile_hits_wall = contain(projectile, {x: 0, y: 0, width: stageWidth, height: stageHeight});

            if (projectile_hits_wall === "top") {
                score++;
                score_txt.text = "Score: " + score;
                remove_projectile(projectile);
            }

            if (hitTestRectangle(character, projectile)) {
                renderer.backgroundColor = 0x000000;
                gameState = end;
            }
        });
    }

    var character_hits_wall = contain(character, {x: 0, y: 20, width: stageWidth, height: 20 + character.height});
    if (character_hits_wall === "left" || character_hits_wall === "right") {
        character.vx = 0;
    }
}

/*
 * when the game is over...
 *
 */

function end() {
    startScene.visible = false;
    gameScene.visible = false;
    endScene.visible = true;

    overscore_txt.text = "Your Score: " + score;
    overscore_txt.x = stageWidth/2 - overscore_txt.width/2;
}

/*
 * generates projectiles based on a RNG determined by several factors 
 * 
 */

function generateProjectile() {
    for (var i = min_concurrent_num_projectiles; i < randomInt(min_concurrent_num_projectiles, max_concurrent_num_projectiles); i++) {
        var projectile = new Sprite(projectile_txr);
        var px = randomInt(0, stageWidth-projectile.width);
        var py = stageHeight - projectile.height;
        projectile.scale.x = 1.2;
        projectile.scale.y = 1.2;
        projectile.x = px;
        projectile.y = py;
        projectile.vy = randomInt(min_projectile_velocity, max_projectile_velocity);

        projectiles.push(projectile);
        gameScene.addChild(projectile);
    }
}

/*
 * when the projectile has run its course
 * 
 */

function remove_projectile(projectile) {
    for (var i = projectiles.length; i--;) {
        if (projectiles[i] === projectile) {
            gameScene.removeChild(projectile);
            projectiles.splice(i, 1);
        }
    }
}

/* 
 * generic: contains the object movement to the stage
 * 
 */

function contain(sprite, container) {
    var collision = undefined;

    if (sprite.x < container.x) {
        sprite.x = container.x;
        collision = "left";
    }

    if (sprite.y < container.y) {
        sprite.y = container.y;
        collision = "top";
    }

    if (sprite.x + sprite.width > container.width) {
        sprite.x = container.width - sprite.width;
        collision = "right";
    }

    if (sprite.y + sprite.height > container.height) {
        sprite.y = container.height - sprite.height;
        collision = "bottom";
    }

    return collision;
}

/*
 * generic: check if the object is hit by another object 
 * 
 */

function hitTestRectangle(r1, r2) {
    var hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

    hit = false;

    r1.centerX = r1.x + r1.width / 2;
    r1.centerY = r1.y + r1.height / 2;
    r2.centerX = r2.x + r2.width / 2;
    r2.centerY = r2.y + r2.height / 2;

    r1.halfWidth = r1.width / 2;
    r1.halfHeight = r1.height / 2;
    r2.halfWidth = r2.width / 2;
    r2.halfHeight = r2.height / 2;

    vx = r1.centerX - r2.centerX;
    vy = r1.centerY - r2.centerY;

    combinedHalfWidths = r1.halfWidth + r2.halfWidth;
    combinedHalfHeights = r1.halfHeight + r2.halfHeight;

    if (Math.abs(vx) < combinedHalfWidths) {
        if (Math.abs(vy) < combinedHalfHeights) {
            hit = true;
        } else {
            hit = false;
        }
    } else {
        hit = false;
    }

    return hit;
}

/*
 * up the difficulty factor to make the game harder as it progresses
 * 
 */

function raise_difficulty() {
    if (min_projectile_delay-1 >= 1) {
        min_projectile_delay-=difficulty_coefficient;
    }

    if (max_projectile_delay-1 >= 3) {
        max_projectile_delay-=difficulty_coefficient;
    }

    min_projectile_velocity+=difficulty_coefficient;
    max_projectile_velocity+=difficulty_coefficient;
    min_concurrent_num_projectiles+=difficulty_coefficient;
    max_concurrent_num_projectiles+=difficulty_coefficient;

    console.log("mpd: " + min_projectile_delay +"->" + max_projectile_delay + ", mpv: " + min_projectile_velocity + "->" + max_projectile_velocity + ", mnp: " + min_concurrent_num_projectiles + "->" + max_concurrent_num_projectiles);
}

/*
 * main click action, does different things based on gameState
 * 
 */

function mainAction(touchData) {
    if (gameState === start) {
        startScene.visible = false;
        gameScene.visible = true;
        endScene.visible = false;

        gameState = play;
    } else if (gameState === play) {
        if (touchData.data.getLocalPosition(stage).x > stageWidth/2) {
            character.vx = character_speed;
        } else {
            character.vx = -character_speed;
        }
    } else if (gameState === end) {
        init();

        startScene.visible = false;
        gameScene.visible = true;
        endScene.visible = false;

        gameState = play;
    }
}

/*
 * simple RNG function 
 * 
 */

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}