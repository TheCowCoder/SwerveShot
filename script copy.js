const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to match the screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Planck.js physics setup
const planck = window.planck;
const { Vec2 } = planck;

const world = new planck.World(Vec2(0, 0)); // No gravity since it's a top-down game

// Constants
const SCALE = 30; // Scale factor for rendering (pixels per meter)
const FIELD_WIDTH = 50;  // Field width in meters
const FIELD_HEIGHT = 25; // Field height in meters
const BALL_RADIUS = 0.5;  // Ball radius in meters
const CAR_WIDTH = 2;      // Car width in meters
const CAR_HEIGHT = 2.5;     // Car height in meters
const TURN_SPEED = 5;    // Turn speed
const DRIVE_FORCE = 50;   // Drive force
const BOOST_FORCE = 100;
const DAMPING = 1;      // Linear damping for both car and ball


// #region Gamestate collection

const NORMALIZATION_RANGES = {
    position: { min: -FIELD_WIDTH / 2, max: FIELD_WIDTH / 2 },
    velocity: { min: -30, max: 30 }, // Assume max velocity of 30 m/s
    angle: { min: 0, max: 2 * Math.PI }, // Angle in radians normalized to [0, 2π]
    angularVelocity: { min: -5, max: 5 }, // Assume max angular velocity
    boost: { min: 0, max: 1 }, // Boost is binary (0 or 1)
    distance: { min: 0, max: Math.sqrt(FIELD_WIDTH ** 2 + FIELD_HEIGHT ** 2) }, // Max distance is diagonal of the field
    relativeAngle: { min: 0, max: 2 * Math.PI } // Angle between car and ball
};


// Normalize a value between a given range
function normalize(value, min, max) {
    return (value - min) / (max - min); // Normalized to [0, 1]
}

// Denormalize a value (optional, reverse normalization)
function denormalize(value, min, max) {
    return value * (max - min) + min;
}

function collectValues() {
    const carPos = car.getPosition();
    const carVel = car.getLinearVelocity();
    let carAngle = car.getAngle();
    const carAngularVel = car.getAngularVelocity();

    // Normalize car angle to the range [0, 2 * PI)
    carAngle = carAngle % (2 * Math.PI);
    if (carAngle < 0) {
        carAngle += 2 * Math.PI;
    }

    const ballPos = ball.getPosition();
    const ballVel = ball.getLinearVelocity();

    // Calculate offset values
    const offsetX = ballPos.x - carPos.x;
    const offsetY = ballPos.y - carPos.y;

    // Compute distance from car to ball
    const ballDist = Math.sqrt(offsetX ** 2 + offsetY ** 2);

    // Compute angle from car to ball
    let angleToBall = Math.atan2(offsetY, offsetX);

    angleToBall = angleToBall % (2 * Math.PI);
    if (angleToBall < 0) {
        angleToBall += 2 * Math.PI;
    }


    // Prepare values
    const values = {
        carPosX: carPos.x,
        carPosY: carPos.y,
        carVelX: carVel.x,
        carVelY: carVel.y,
        carAngle,
        carAngularVel,
        
        ballPosX: ballPos.x,
        ballPosY: ballPos.y,
        ballVelX: ballVel.x,
        ballVelY: ballVel.y,
        
        ballDist,
        angleToBall
    };

    return values;
}

function normalizeValues(values) {
    return {
        carPosX: normalize(values.carPosX, NORMALIZATION_RANGES.position.min, NORMALIZATION_RANGES.position.max),
        carPosY: normalize(values.carPosY, NORMALIZATION_RANGES.position.min, NORMALIZATION_RANGES.position.max),
        carVelX: normalize(values.carVelX, NORMALIZATION_RANGES.velocity.min, NORMALIZATION_RANGES.velocity.max),
        carVelY: normalize(values.carVelY, NORMALIZATION_RANGES.velocity.min, NORMALIZATION_RANGES.velocity.max),
        carAngle: normalize(values.carAngle, NORMALIZATION_RANGES.angle.min, NORMALIZATION_RANGES.angle.max),
        carAngularVel: normalize(values.carAngularVel, NORMALIZATION_RANGES.angularVelocity.min, NORMALIZATION_RANGES.angularVelocity.max),
        
        ballPosX: normalize(values.ballPosX, NORMALIZATION_RANGES.position.min, NORMALIZATION_RANGES.position.max),
        ballPosY: normalize(values.ballPosY, NORMALIZATION_RANGES.position.min, NORMALIZATION_RANGES.position.max),
        ballVelX: normalize(values.ballVelX, NORMALIZATION_RANGES.velocity.min, NORMALIZATION_RANGES.velocity.max),
        ballVelY: normalize(values.ballVelY, NORMALIZATION_RANGES.velocity.min, NORMALIZATION_RANGES.velocity.max),
        
        ballDist: normalize(values.ballDist, NORMALIZATION_RANGES.distance.min, NORMALIZATION_RANGES.distance.max),
        angleToBall: normalize(values.angleToBall, NORMALIZATION_RANGES.angle.min, NORMALIZATION_RANGES.angle.max)
    };
}

function getGamestate() {
    let gamestate = collectValues();
    gamestate = normalizeValues(gamestate);
}


// Display raw and normalized values on the canvas
function displayValues(rawValues, normalizedValues) {
    const x = 10;
    let y = 20;

    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';

    ctx.fillText('Raw Values:', x, y);

    y += 20;
    for (const [key, value] of Object.entries(rawValues)) {
        ctx.fillText(`${key}: ${value.toFixed(2)}`, x, y);
        y += 20;
    }

    y += 20; // Add spacing
    ctx.fillText('Normalized Values:', x, y);
    y += 20;
    for (const [key, value] of Object.entries(normalizedValues)) {
        ctx.fillText(`${key}: ${value.toFixed(2)}`, x, y);
        y += 20;
    }
}


// #endregion

// Create the walls (edges of the field)
const createWall = (x1, y1, x2, y2) => {
    const wall = world.createBody();
    wall.createFixture(planck.Edge(Vec2(x1, y1), Vec2(x2, y2)), { density: 0, friction: 0, restitution: 1 });
};
createWall(-FIELD_WIDTH / 2, -FIELD_HEIGHT / 2, FIELD_WIDTH / 2, -FIELD_HEIGHT / 2); // Top wall
createWall(FIELD_WIDTH / 2, -FIELD_HEIGHT / 2, FIELD_WIDTH / 2, FIELD_HEIGHT / 2);  // Right wall
createWall(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, -FIELD_WIDTH / 2, FIELD_HEIGHT / 2);  // Bottom wall
createWall(-FIELD_WIDTH / 2, FIELD_HEIGHT / 2, -FIELD_WIDTH / 2, -FIELD_HEIGHT / 2); // Left wall

// Create the ball at the center of the world (in meters)
const ball = world.createDynamicBody(Vec2(0, 0));
ball.createFixture(planck.Circle(BALL_RADIUS), { density: 0.5, friction: 0, restitution: 1 });
ball.setLinearDamping(DAMPING);
ball.setBullet(true);

// Create the car at the center of the world (in meters)
const car = world.createDynamicBody(Vec2(0, 0));
car.createFixture(planck.Box(CAR_WIDTH / 2, CAR_HEIGHT / 2), { density: 0.5, friction: 0, restitution: 1 });
car.setLinearDamping(DAMPING);
car.setAngularDamping(5.0); // Prevent uncontrolled spinning

// Player controls
let playerInputs = { left: false, right: false, up: false, down: false, boost: false };

// Game loop variables
const TIME_STEP = 1 / 60; // 60 FPS


// Game loop
function gameLoop() {


    handleInputs();
    world.step(TIME_STEP);

    renderWorld();

    let gamestate = collectValues();
    let normalGamestate = normalizeValues(gamestate);

    displayValues(gamestate, normalGamestate);

    // Loop
    requestAnimationFrame(gameLoop);
}


// Handle player inputs (keyboard controls)
function handleInputs() {
    let carAngle = car.getAngle() - Math.PI / 2;
    const forward = Vec2(Math.cos(carAngle), Math.sin(carAngle));

    if (playerInputs.boost) {
        // Apply boost force if space is pressed
        car.applyForceToCenter(forward.mul(BOOST_FORCE));
    } else {
        // Apply normal drive force
        if (playerInputs.up) car.applyForceToCenter(forward.mul(DRIVE_FORCE));
        if (playerInputs.down) car.applyForceToCenter(forward.mul(-DRIVE_FORCE));
    }

    // Handle turning
    if (playerInputs.left) car.setAngularVelocity(-TURN_SPEED);
    else if (playerInputs.right) car.setAngularVelocity(TURN_SPEED);
    else car.setAngularVelocity(0); // Stop rotation when left or right is released
}


// Render the world to the canvas
function renderWorld() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set background color to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert physics world coordinates to canvas coordinates (screen origin is at the center)
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    // Render the field (walls)
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(
        offsetX - (FIELD_WIDTH / 2) * SCALE,
        offsetY - (FIELD_HEIGHT / 2) * SCALE,
        FIELD_WIDTH * SCALE,
        FIELD_HEIGHT * SCALE
    );
    ctx.stroke();

    // Ball
    const ballPos = ball.getPosition();
    ctx.beginPath();
    ctx.arc(ballPos.x * SCALE + offsetX, ballPos.y * SCALE + offsetY, BALL_RADIUS * SCALE, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();

    // Car
    const carPos = car.getPosition();
    ctx.save();
    ctx.translate(carPos.x * SCALE + offsetX, carPos.y * SCALE + offsetY);
    ctx.rotate(car.getAngle());
    ctx.fillStyle = "blue";
    ctx.fillRect(-CAR_WIDTH * SCALE / 2, -CAR_HEIGHT * SCALE / 2, CAR_WIDTH * SCALE, CAR_HEIGHT * SCALE);
    ctx.restore();

    // Draw boost effect (red circle at the rear of the car)
    if (playerInputs.boost) {
        let carAngle = car.getAngle() + Math.PI / 2;
        const backward = Vec2(Math.cos(carAngle), Math.sin(carAngle));
        const boostPos = car.getPosition().add(backward.mul(CAR_HEIGHT / 2)); // Position at the rear of the car
        ctx.beginPath();
        ctx.arc(boostPos.x * SCALE + offsetX, boostPos.y * SCALE + offsetY, 0.5 * SCALE, 0, 2 * Math.PI); // Small circle for boost effect
        ctx.fillStyle = "red";
        ctx.fill();
    }
}



// Listen for keyboard inputs
document.addEventListener('keydown', async (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            playerInputs.left = true;
            break;
        case 'ArrowRight':
            playerInputs.right = true;
            break;
        case 'ArrowUp':
            playerInputs.up = true;
            break;
        case 'ArrowDown':
            playerInputs.down = true;
            break;
        case " ":
            playerInputs.boost = true;
            break;
        
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key) {
        case 'ArrowLeft':
            playerInputs.left = false;
            break;
        case 'ArrowRight':
            playerInputs.right = false;
            break;
        case 'ArrowUp':
            playerInputs.up = false;
            break;
        case 'ArrowDown':
            playerInputs.down = false;
            break;
        case " ":
            playerInputs.boost = false;
            break;
    }
});

// Start the game loop
gameLoop();
