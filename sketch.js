/*

(Project Name: Egg Basket)

*/

////////// Initial Variables //////////////

/* initialization of character, wall positions and item drop array, the key game actors */


let character, leftWallX, rightWallX; 
let drops = []; // Array to hold falling items

/* Core Variable Definitions

- eggImage = regular green egg when caught, adds 1+ point excluding any additional bonuses, and when missed deducts health slightly

- supereggImage = larger purple egg when caught, adds 50+ points and deducts health moderately when missed

- carrierImage = main character or basket to catch any drops

- healPUP = healing power up drop image, which recovers health when caught

- bgSound = background sound during gameplay

- crackedSFX = when regular egg misses

- supercrackedSFX = when super egg misses

- levelUpSFX = when level is passed

- pupSFX = when power up is acquired

*/

let eggImage, supereggImage, carrierImage,
    healPUP,
    lMove, rMove;
let bgSound, crackedSFX, supercrackedSFX, levelUpSFX,
    pupSFX;

// initial states and values

let gameState = 'start';
let score = 0;
let currentLevel = 1;

let fallSpeed = 2; // rate of fall speed
let laneWidth = 200; // region of fall space
let scoreIncrement = 1; // bonus increments
let lastBonusUpdateTime = 0; // check for extra points for being in higher health
let levelBonus = 0; // extra points for being in higher level
let pointsRequired = 500; // points to level up

// Highest score earned after a game over

let highScore = 0;

// Key Press States

let keyStates = {
  LEFT: false,
  RIGHT: false
};

let leftButton, rightButton;

const levelThresholds = [0, 10, 20, 40, 80, 160, 320, 640, 1280, 2560]; // thresholds for levels 1-10, const used as this isn't meant to change in future


/////// General P5 Functions ////////// 

function preload() {
  
  //Preloading images and sounds
  
  carrierImage = loadImage('images/basket.png');
  eggImage = loadImage('images/egg_n.png');
  supereggImage = loadImage('images/egg_s.png');
  healPUP = loadImage('images/heal.png');
  lMove = loadImage('images/larrow.png');
  rMove = loadImage('images/rarrow.png');
  
  bgSound = loadSound('sounds/horror_bgm.mp3');
  bgSound.setVolume(0.4);
  
  crackedSFX = loadSound('sounds/cracked.mp3');
  supercrackedSFX = loadSound('sounds/supercracked.mp3');
  levelUpSFX = loadSound('sounds/levelup.mp3');
  pupSFX = loadSound('sounds/pup.mp3');
  pupSFX.setVolume(0.3);
}

function setup() {
  createCanvas(800, 600);
  character = new Character();
  //bgSound.loop();
  leftButton = { x: 110,
                y: height - 200,
                width: 80,
                height: 70 };
  rightButton = { x: width - 180,
                 y: height - 200,
                 width: 80,
                 height: 70 };

}


// State Based Programming where sketch loops to different states of the canvas such as start menu, paused menu, gameOver menu and playing menu


function draw() {
  background(0);
  if (gameState === 'start') {
    drawStartButton();
  }
  else if (gameState === 'playing' || gameState === 'paused') {
    // The main game loop logic
    if (gameState === 'playing') {
      drawWalls(); // walls are barriers that determine the space where the eggs or items drop
      
      //image(lMove,
      //      leftButton.x,
      //      leftButton.y,
      //      leftButton.width,
      //      leftButton.height);
      //image(rMove,
      //      rightButton.x,
      //      rightButton.y,
      //      rightButton.width,
      //      rightButton.height);
      
      updateLevel();
       
      // Creation of new egg objs
      
      if (frameCount % 60 === 0) {
        if (currentLevel > 5 && random() < 0.2) { 
            drops.push(new SuperEgg());
        } else {
            drops.push(new Egg());
        }
        if (currentLevel > 6 && random() < 0.1) {
            drops.push(new HealPUP());
        }
    }
      
      // To check for egg height as its falling
      
      for (let i = drops.length - 1; i >= 0; i--) {
        drops[i].update();
        drops[i].display();
        if (drops[i].y > height) {
          if (drops[i].powerUp === 'none') {
              if (drops[i].isSuperEgg === true) {
                character.missSuperEgg();
              }
              else {              
                character.missEgg();
              }
            }                  
          drops.splice(i, 1); // Egg missed            
        }
        else if (character.catchEgg(drops[i])) {
          if (drops[i].powerUp === 'none') {
            if (drops[i].isSuperEgg === true) {
              score += 50;
            }
            else {
              score += scoreIncrement;
            }
          }
          else
            {
              if (drops[i].powerUp === 'heal') {
                drops[i].power(character);
              }
            }
          drops.splice(i, 1); // Remove egg if caught
        }
      }
      character.move();
    }

    character.display();
    displayLevel(); // Show current level
    displayScore(); // Show current score
    updateBonusScore();
    
    if (gameState === 'paused') {
      displayPaused(); // Display the "Paused" message
    }

    // Check for game over condition
    if (character.healthWidth <= 0) {
      updateHighScore();
      gameState = 'gameOver';
      displayGameOver();
    }
  } else if (gameState === 'gameOver') {
    displayGameOver();
  }
}


/////////// Classes ////////////

class Character {
  constructor() {
    
    //character init
    
    this.x = width / 2;
    this.y = height - 100;
    this.size = 70;
    this.speed = 5.1; // movement speed, will manipulate in future for power ups
    this.healthWidth = width / 2; // Health starts at 50%
    this.maxHealthWidth = width; // Max health = Canvas Width
    this.healthDecreaseRate = width * 0.05; // when egg cracks
    this.healthIncreaseRate = width * 0.02; // when egg !crack
  }

  display() {
    image(carrierImage, this.x, this.y, this.size, this.size);
    this.displayHealth();
  }
  
  // Keyboard Pressed Movement
  
  move() {
    if (keyStates.LEFT) {
        this.x -= this.speed;
    }
    else if (keyStates.RIGHT) {
        this.x += this.speed;
    }
    this.x = constrain(this.x, 0, width - this.size);
  }

  // Logic for when egg is caught
  
  catchEgg(egg) {
    let d = dist(this.x + this.size / 2,
                 this.y + this.size / 2,
                 egg.x,
                 egg.y);
    
    if (d < this.size / 2 + egg.size / 2) {
      score += scoreIncrement;
      this.healthWidth += this.healthIncreaseRate; 
      
      // Ensure health doesn't exceed max width
      this.healthWidth = min(this.healthWidth,
                             this.maxHealthWidth); 
      

      return true; // Egg was caught
    }
    return false; // Egg wasn't caught
  }
  
  // Logic for when egg is missed
  
  missEgg() {
    crackedSFX.play();  
    this.healthWidth -= this.healthDecreaseRate;
    this.healthWidth = max(this.healthWidth, 0);
  }
  
  // Logic for when super egg is missed
  
  missSuperEgg() {
    supercrackedSFX.play();  
    this.healthWidth -= this.healthDecreaseRate * 4;
    this.healthWidth = max(this.healthWidth, 0);
  }
  
  // Breakpoints for the different colors based on health width

  displayHealth() {
  
  let redLimit = this.maxHealthWidth * 0.2; // 20%
  let orangeLimit = this.maxHealthWidth * 0.5; // 50%
  let yellowLimit = this.maxHealthWidth * 0.8; // 80%

  // Red portion
  fill(255, 0, 0);
  let redWidth = min(this.healthWidth, redLimit);
  rect(0, height - 30, redWidth, 20);

  // Orange portion
  if (this.healthWidth > redLimit) {
    fill(255, 165, 0);
    let orangeWidth = min(this.healthWidth - redLimit, orangeLimit - redLimit);
    rect(redLimit, height - 30, orangeWidth, 20);
  }

  // Yellow portion
  if (this.healthWidth > orangeLimit) {
    fill(255, 255, 0);
    let yellowWidth = min(this.healthWidth - orangeLimit, yellowLimit - orangeLimit);
    rect(orangeLimit, height - 30, yellowWidth, 20);
  }

  // Green portion
  if (this.healthWidth > yellowLimit) {
    fill(0, 255, 0);
    let greenWidth = this.healthWidth - yellowLimit;
    rect(yellowLimit, height - 30, greenWidth, 20);
  }
}

}


class Egg {
  constructor() {    
    //Egg Init
    
    this.x = random(leftWallX + 20,
                    rightWallX - 10); // fall range
    this.y = 0; //falls steadily down
    this.size = 30; // size of regular egg
    this.speed = fallSpeed; // 
    this.isSuperEgg = false; // super egg or not super egg
    this.powerUp = 'none'; // power up type
  }
  
  update() {
    this.y += this.speed; // speed manipulation
  }
  
  display() {
    image(eggImage,
          this.x,
          this.y,
          this.size,
          this.size);
  }
}


//Extended Super Egg class from Egg with now displaying a larger sized purple egg

class SuperEgg extends Egg {
    constructor() {
        super();
        this.size = 50;
        this.speed = fallSpeed - 1;
        this.isSuperEgg = true
    }
  
    // Override the display method to use the Super Egg image
    display() {
        image(supereggImage,
              this.x,
              this.y,
              this.size,
              this.size);
    }

}

class HealPUP extends Egg {
  constructor() {
    super();
    this.size = 35;
    this.speed = fallSpeed - 0.5;
    this.powerUp = 'heal'
  }
  // Override the display method to use Heal Power Up Image
  display() {
      image(healPUP,
            this.x,
            this.y,
            this.size,
            this.size);
  }
  
  power(char) {
    char.healthWidth += 50; 
    char.healthWidth = min(char.healthWidth,
                           char.maxHealthWidth);
    pupSFX.play();
  }

}

////// Built-in Event Handlers or User Interactables //////


// When Left or Right Arrow Keys are pressed

function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    keyStates.LEFT = true;
  }
  else if (keyCode === RIGHT_ARROW) {
    keyStates.RIGHT = true;
  }
  else if (keyCode === 32) { // 32 is the keyCode for SPACEBAR
    if (gameState === 'playing') {
      gameState = 'paused';
      noLoop(); // Pauses the draw loop
    } else if (gameState === 'paused') {
      gameState = 'playing';
      loop(); // Resumes the draw loop
    }
  }
}

// When Left or Right Arrow Keys are held / let go

function keyReleased() {
  if (keyCode === LEFT_ARROW) {
    keyStates.LEFT = false;
  }
  else if (keyCode === RIGHT_ARROW) {
    keyStates.RIGHT = false;
  }
}


function mouseClicked() {
  if ((gameState === 'start' || gameState === 'gameOver')) {
    startGame();
  }

  else if (gameState === 'paused') {
    // Resume the game
    gameState = 'playing';
    loop(); // Resume the draw loop
  }
}

function mousePressed() {
  if (overButton(leftButton)) {
    keyStates.LEFT = true;
  }
  else if (overButton(rightButton)) {
    keyStates.RIGHT = true;
  }
}

function mouseReleased() {
  keyStates.LEFT = false;
  keyStates.RIGHT = false;
  
  
  /*
  if (gameState === 'playing') {
    if (!overButton(leftButton) && !overButton(rightButton))     {
      gameState = 'paused';
      noLoop(); // Stop the draw loop to pause the game  
    }
  }
  */
  
}

// !!! Replace with native button classes later !!!

function overButton(button) {
  // Check if the mouse is over the given button area
  return mouseX > button.x && mouseX < button.x + button.width &&
         mouseY > button.y && mouseY < button.y + button.height;
}


// Starts/Restarts the Game

function startGame() {
  // Re-initialize variables or start playing state loop
  
  gameState = 'playing';  
  character = new Character();
  drops = []; // Clear any existing drops
  currentLevel = 1; // Reset level to 1
  fallSpeed = 2;
  leftWallX = width / 2 - laneWidth / 2;
  rightWallX = width / 2 + laneWidth / 2;
  score = 0; // Reset score
  
  // Reset lane width and wall positions
  laneWidth = 150;
  leftWallX = width / 2 - laneWidth / 2;
  rightWallX = width / 2 + laneWidth / 2;
  
  lastScoreUpdateTime = millis(); // Reset bonus score
  loop(); // Start the draw loop again
}



////////// Visuals ////////////

function drawStartButton() {
  fill(255);
  rect(width / 2 - 50, height / 2 - 25, 100, 50);
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(20);
  text('Play', width / 2, height / 2);
}

function displayScore() {
  fill(255);
  textSize(32);
  textAlign(RIGHT, TOP);
  text(`Score: ${score}`, width - 20, 20);
  text(`High Score: ${highScore}`, width - 20, 60);
  
}

function displayGameOver() {
  displayScore();
  
  textAlign(CENTER);
  
  if (currentLevel == 100)
    {
      textSize(35);
      text("Congratulations", width / 2, height / 2 - 10);
    }
  

  textSize(32);
  fill(255);
  text("Game Over", width / 2, height / 2 - 20);
  textSize(20);

  text('Click to Restart', width / 2, height / 2 + 25);
}

function displayLevel() {
  fill(255);
  textSize(32);
  textAlign(LEFT, TOP);
  text(`Level: ${currentLevel}`, 20, 20);
}


function displayPaused() {
  fill(255);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("Paused", width / 2, height / 2);
}

function drawWalls() {
  fill(204,82,122); // Example wall color
  rect(leftWallX, 0, 10, height - 100); // Left wall
  rect(rightWallX - 10, 0, 10, height - 100); // Right wall
}

/////////// Gameplay/Level Logic //////////

// New scenarios for new levels, can get really creative here..

function updateLevel() {
  if (currentLevel < 10) {
    for (let i = 0; i < levelThresholds.length; i++) {
      if (score >= levelThresholds[i] && currentLevel === i) {
        currentLevel++;
        levelUpSFX.play();
        break; 
      }
    }
      if (currentLevel == 2) {
        fallSpeed = 2.5;
      }        
      if (currentLevel == 3) {                
        fallSpeed = 2.8;
        leftWallX = max(0,
            width / 2 - laneWidth / 2) + 200;
        rightWallX = min(width,
            width / 2 + laneWidth / 2) - 200;
        
      }    
      if (currentLevel == 4) {        
        fallSpeed = 3.2;
        levelBonus = 10;
        
      }    
      if (currentLevel == 5) {
        
        fallSpeed = 3.5;
                leftWallX = max(0,
                    width / 2 - laneWidth / 2) + 350;
        rightWallX = min(width,
                    width / 2 + laneWidth / 2) - 350;  
        
      }    
      if (currentLevel == 6) {
        fallSpeed = 3.7;

      
      }
      if (currentLevel == 7) {
        fallSpeed = 4.2;  
        leftWallX = max(0,
                    width / 2 - laneWidth / 2) + 400;
        rightWallX = min(width,
                    width / 2 + laneWidth / 2) - 400;        
      }    
      if (currentLevel == 8) {
        fallSpeed = 4.9;
        levelBonus = 100; 
      }    
      if (currentLevel == 9) {        
        fallSpeed = 5.8;
        character.speed = 5.5;
      }    
      if (currentLevel == 10) {
        fallSpeed = 6.9;        
        leftWallX = max(0,
            width / 2 - laneWidth / 2) + 420;
        rightWallX = min(width,
            width / 2 + laneWidth / 2) - 420; 
      }   
  }
  else if (currentLevel >= 10 && currentLevel < 100) {
    // After level 10
    if (score >= levelThresholds[9] + pointsRequired * (currentLevel - 9)) {
      currentLevel++;
      fallSpeed += 0.5;
      levelBonus += 50;
      if (character.speed < 8){ // ensures a speed cap
        character.speed += 0.1;  
      }        
      levelUpSFX.play();
      pointsRequired += 1.1 * (levelBonus/2);
    }
  }
  else if (currentLevel === 100) {
    // Handle the game over or victory condition
    gameState = 'gameOver';
  }
}

// Update high score if higher than previous one

function updateHighScore() {
  if (score > highScore) {
    highScore = score;
  } 
}


// High Health Score Bonus

function updateBonusScore() {
  let healthPercentage = (character.healthWidth / character.maxHealthWidth) * 100;

  // Determine the bonus increment based on health percentage
  let bonusIncrement = 0;
  if (healthPercentage > 80) {
    bonusIncrement = 3 + levelBonus; // Green zone
  } else if (healthPercentage > 50) {
    bonusIncrement = 1 + levelBonus / 2; // Yellow zone
  } // Red/Orange zone has no bonus increment

  // Apply bonus increment per second
  if (millis() - lastBonusUpdateTime >= 1000) {
    score += bonusIncrement;
    lastBonusUpdateTime = millis();
  }
}

////// Extra Stuff or WIP ///////
  
// Gamepad Implementation

let connectedPads = [];

// Touch Screen Controls

// Bigger Basket Power Up

// Faster Basket Power Up

// Explosive Bomb (Takes Out Half Life)

// Poisonous Bad Egg (Causes Slow Down)

// Instructions/Controls Page

// Proper Button Implementations

  