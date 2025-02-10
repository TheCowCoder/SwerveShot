import Renderer from "./Renderer.js";
import * as Const from "../shared/CONSTANTS.js";
import planck from "planck-js";
import { Vec2 } from "../shared/Vec2.js";
import * as CONSTANTS from "../shared/CONSTANTS.js";

function generateFourLetterString() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


function circleRectIntersection(cx, cy, radius, x1, y1, x2, y2, enclosed = false) {
    // Ensure x1, y1 is the top-left and x2, y2 is the bottom-right
    const rectLeft = Math.min(x1, x2);
    const rectRight = Math.max(x1, x2);
    const rectTop = Math.min(y1, y2);
    const rectBottom = Math.max(y1, y2);

    if (enclosed) {
        // Check if the circle is fully enclosed within the rectangle
        return (
            cx - radius >= rectLeft &&
            cx + radius <= rectRight &&
            cy - radius >= rectTop &&
            cy + radius <= rectBottom
        );
    } else {
        // Check for intersection
        // Find the closest point on the rectangle to the circle center
        const closestX = Math.max(rectLeft, Math.min(cx, rectRight));
        const closestY = Math.max(rectTop, Math.min(cy, rectBottom));

        // Calculate the distance from the circle center to the closest point
        const distanceX = cx - closestX;
        const distanceY = cy - closestY;

        // If the distance is less than or equal to the radius, they intersect
        return (distanceX ** 2 + distanceY ** 2) <= radius ** 2;
    }
}

function degToRad(deg) {
    return deg * (Math.PI / 180);
}



export default class Game {
    static instances = {};

    constructor(io, botManager, privateMatch) {
        this.botManager = botManager;
        this.privateMatch = privateMatch;
        this.id = Math.random().toString(36).substr(2, 9);
        this.code = generateFourLetterString();

        Game.instances[this.id] = this;

        this.io = io;
        this.VELOCITY_ITER = 10;
        this.POSITION_ITER = 6;
        this.FPS = 60;

        this.world = new planck.World(Vec2(0, 0));


        this.objects = {};
        this.players = {};

        this.walls = null;
        this.ball = null;

        this.TURN_SPEED = 5 * 0.75;    // Turn speed
        this.POWERSLIDE_TURN_SPEED = 7.5;
        // this.DRIVE_FORCE = 75 * 0.75;   // Drive force
        this.DRIVE_FORCE = 1.5 * (0.75 + 0.125);
        this.LATERAL_FORCE = 1.5 * (0.75 + 0.125);
        // this.BOOST_FORCE = 125;
        this.BOOST_FORCE = 3 * 0.75 + 0.125;

        this.CAR_DAMPING = 1.75;      // Linear damping for both car and ball
        this.BALL_DAMPING = 1.5;
        this.FLIP_FORCE = 75 * 0.75 * (0.75 + 0.125);


        this.CAR_WIDTH = CONSTANTS.CAR_WIDTH;      // Car width in meters
        this.CAR_HEIGHT = CONSTANTS.CAR_HEIGHT;     // Car height in meters
        this.CAR_DENSITY = 0.37;
        this.CAR_FRICTION = 0;
        // this.CAR_RESTITUTION = 1;
        this.CAR_RESTITUTION = 0;

        this.BALL_DENSITY = 0.5 - 0.125;
        this.BALL_FRICTION = 0;
        this.BALL_RESTITUTION = 1.1;

        this.WALL_DENSITY = 0;
        this.WALL_FRICTION = 0;
        // this.WALL_RESTITUTION = 0.5;
        this.WALL_RESTITUTION = 1;

        this.WALL_CORNER_RADIUS = 5 * 1.5;
        this.WALL_CORNER_SEGMENTS = 25 * 1.5;




        this.createField();


        this.world.on("begin-contact", this.onBeginContact.bind(this));
        this.world.on("pre-solve", this.onPreSolve.bind(this));
        this.world.on("post-solve", this.onPostSolve.bind(this));
        this.world.on("end-contact", this.onEndContact.bind(this));

        this.renderer = new Renderer(this, this.FPS);

        this.running = false;

        this.gameStats = null;

        this.preset = "default";
    }

    applyPreset(preset) {
        this.preset = preset;
        if (preset == "arrowKeysF") {

        } else if (preset == "keyboardControls") {

        } else if (preset == "mouseControls") {

        }
    }

    pauseTimer() {
        clearInterval(this.gameTimer);
    }
    startTimer() {
        this.gameTimer = setInterval(this.gameTimerFunc.bind(this), 1000);
    }
    stopGame() {
        clearInterval(this.gameTimer);
        this.running = false;
        this.io.to(this.id).emit("game timer", 0);
        this.io.to(this.id).emit("game stats", this.gameStats);
        this.gameStats = null;

        for (let id in this.players) {
            if (id in this.botManager.bots) {
                this.botManager.bots[id].stop();
            }
        }
    }

    gameTimerFunc() {
        this.remainingSeconds--;
        if (this.remainingSeconds === 0) {
            this.stopGame();
        } else {
            this.io.to(this.id).emit("game timer", this.remainingSeconds);
        }
    }

    end() {
        this.stopGame();
    }

    start(initial = false) {
        if (initial) {
            this.running = true;
            this.io.to(this.id).emit("game start");
            this.gameStats = {
                type: null,
                players: {}
            };
            let playerNum = Object.keys(this.players).length
            if ((playerNum == 1 || playerNum == 2)) {
                this.gameStats.type = "1v1";
            } else if ((playerNum == 3 || playerNum == 4)) {
                this.gameStats.type == "2v2";
            } else if ((playerNum == 5 || playerNum == 6)) {
                this.gameStats.type == "3v3";
            } else {
                this.gameStats.type == "Swerve Party";
            }

            for (let id in this.players) {
                this.gameStats.players[id] = {
                    username: this.players[id].settings.username,
                    goals: 0,
                    boostUsed: 0,
                    flipsUsed: 0,
                    ballTouches: 0,
                    team: this.players[id].team
                }

                if (this.players[id].bot) {
                    for (let botId in this.botManager.bots) {
                        if (id == botId) {
                            this.botManager.bots[botId].start();
                        }
                    }
                }
            }

        }


        let leftPlayerIds = Object.values(this.players).filter(p => p.team === "blue").map(obj => obj.id);
        let rightPlayerIds = Object.values(this.players).filter(p => p.team === "red").map(obj => obj.id);


        function removeRandomItem(arr) {
            if (arr.length === 0) return [null, arr]; // Return null if the array is empty

            const randomIndex = Math.floor(Math.random() * arr.length);
            const removedItem = arr[randomIndex];
            const newArray = [...arr.slice(0, randomIndex), ...arr.slice(randomIndex + 1)];

            return [removedItem, newArray];
        }


        let playerSpawns = {};


        if (
            (leftPlayerIds.length == 0 && rightPlayerIds.length == 1) ||
            (leftPlayerIds.length == 1 && rightPlayerIds.length == 0) ||
            (leftPlayerIds.length == 1 && rightPlayerIds.length == 1)
        ) {
            // 1v1
            let [spawns, _] = removeRandomItem(["left right", "top left bottom right", "bottom left top right"]);
            if (spawns === "left right") {
                let leftId;
                [leftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[leftId] = CONSTANTS.farLeft;
                let rightId;
                [rightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[rightId] = CONSTANTS.farRight;
            } else if (spawns === "top left bottom right") {
                let topLeftId;
                [topLeftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[topLeftId] = CONSTANTS.topLeft;
                let bottomRightId;
                [bottomRightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[bottomRightId] = CONSTANTS.bottomRight;
            } else if (spawns == "bottom left top right") {
                let bottomLeftId;
                [bottomLeftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[bottomLeftId] = CONSTANTS.bottomLeft;
                let topRightId;
                [topRightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[topRightId] = CONSTANTS.topRight;
            }


        } else if (
            (leftPlayerIds.length == 0 && rightPlayerIds.length == 2) ||
            (leftPlayerIds.length == 1 && rightPlayerIds.length == 2) ||
            (leftPlayerIds.length == 2 && rightPlayerIds.length == 2) ||
            (leftPlayerIds.length == 2 && rightPlayerIds.length == 0) ||
            (leftPlayerIds.length == 2 && rightPlayerIds.length == 1)
        ) {
            // 2v2
            let [spawns, _] = removeRandomItem(["left right tl br", "left right bl tr"]);

            if (spawns === "left right tl br") {
                let leftId;
                [leftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[leftId] = CONSTANTS.farLeft;
                let tlId;
                [tlId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[tlId] = CONSTANTS.topLeft;

                let rightId;
                [rightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[rightId] = CONSTANTS.farRight;
                let brId;
                [brId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[brId] = CONSTANTS.bottomRight;
            } else if (spawns === "left right bl tr") {
                let leftId;
                [leftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[leftId] = CONSTANTS.farLeft;
                let blId;
                [blId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[blId] = CONSTANTS.bottomLeft;

                let rightId;
                [rightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[rightId] = CONSTANTS.farRight;
                let trId;
                [trId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[trId] = CONSTANTS.topRight;
            }
        } else if (
            (leftPlayerIds.length == 0 && rightPlayerIds.length == 3) ||
            (leftPlayerIds.length == 1 && rightPlayerIds.length == 3) ||
            (leftPlayerIds.length == 2 && rightPlayerIds.length == 3) ||
            (leftPlayerIds.length == 3 && rightPlayerIds.length == 3) ||
            (leftPlayerIds.length == 3 && rightPlayerIds.length == 0) ||
            (leftPlayerIds.length == 3 && rightPlayerIds.length == 1) ||
            (leftPlayerIds.length == 3 && rightPlayerIds.length == 2)
        ) {
            let spawns = "top middle bottom";
            if (spawns == "top middle bottom") {
                let topLeftId;
                [topLeftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[topLeftId] = CONSTANTS.topLeft;
                let leftId;
                [leftId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[leftId] = CONSTANTS.farLeft;
                let blId;
                [blId, leftPlayerIds] = removeRandomItem(leftPlayerIds);
                playerSpawns[blId] = CONSTANTS.bottomLeft;

                let topRightId;
                [topRightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[topRightId] = CONSTANTS.topRight;
                let rightId;
                [rightId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[rightId] = CONSTANTS.farRight;
                let brId;
                [brId, rightPlayerIds] = removeRandomItem(rightPlayerIds);
                playerSpawns[brId] = CONSTANTS.bottomRight;
            }
        }


        for (let id in this.players) {
            const player = this.players[id];

            if (!playerSpawns[id]) playerSpawns[id] = player.team == "blue" ? CONSTANTS.farLeft : CONSTANTS.farRight;

            let spawnPos = playerSpawns[id][0];
            let spawnAngle = playerSpawns[id][1];

            player.movementLocked = true;
            player.flip = true;
            player.car.body.setPosition(spawnPos);
            player.car.body.setAngle(spawnAngle);
            player.car.body.setLinearVelocity(Vec2(0, 0));
            player.car.body.setAngularVelocity(0);

            this.io.to(this.id).emit("object updates", {
                [player.car.id]: {
                    boosting: false,
                    position: spawnPos,
                    angle: spawnAngle
                }
            }, performance.now(), false);

        }

        this.ball.body.setPosition(Vec2(0, 0));
        this.ball.body.setAngle(0);
        this.ball.body.setLinearVelocity(Vec2(0, 0));
        this.ball.body.setAngularVelocity(0);

        const startGame = () => {
            for (let id in this.players) {
                this.players[id].movementLocked = false;
            }

            if (initial) this.remainingSeconds = 60 * 4;

            this.io.to(this.id).emit("game timer", this.remainingSeconds);
            this.startTimer();
        }

        let countdown = 3;
        function countDown() {
            this.io.to(this.id).emit("countdown", countdown);

            if (countdown === 0) {
                clearInterval(this.countdownInterval);
                startGame();
            }
            countdown--;
        }

        // Make sure `this` refers to the correct object
        this.countdownInterval = setInterval(() => {
            countDown.call(this); // Use .call() to ensure `this` is passed correctly
        }, 1000);

        // Initialize the countdown
        countDown.call(this);


    }







    playerLeft(socket) {
        let player = this.players[socket.id];

        this.world.destroyBody(player.car.body);
        this.io.to(this.id).emit("objects removed", [player.car.id])

        delete this.objects[player.car.id];
        delete this.players[socket.id];

        socket.leave(this.id);

        let playersLeft = false;

        for (let id in this.players) {
            if (!(id in this.botManager.bots)) {
                playersLeft = true;
                break;
            }
        }
        if (!playersLeft) {
            for (let id in this.players) {
                this.botManager.bots[id].stop();
            }
            this.renderer.stop();
            delete Game.instances[this.id];
        }
    }
    onBeginContact(contact) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        for (let id in this.players) {
            let player = this.players[id];
            if (
                (bodyA == player.car.body && bodyB == this.ball.body) ||
                (bodyB == player.car.body && bodyA == this.ball.body)
            ) {
                this.lastTouchedCarId = id;
                if (this.gameStats) {
                    this.gameStats.players[id].ballTouches++;
                }
            }
        }
    }

    onPreSolve(contact) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();



        for (let id in this.players) {
            let player = this.players[id];

            if (
                (bodyA == player.car.body && bodyB == this.walls) ||
                (bodyB == player.car.body && bodyA == this.walls)
            ) {
                contact.setRestitution(0);
            }

            // Zero impact when a car collides with another car
            for (let otherId in this.players) {
                if (id !== otherId) {
                    let otherPlayer = this.players[otherId];
                    if (
                        (bodyA === player.car.body && bodyB === otherPlayer.car.body) ||
                        (bodyB === player.car.body && bodyA === otherPlayer.car.body)
                    ) {
                        contact.setRestitution(0);
                        player.prevVelocity = player.car.body.getLinearVelocity().clone();
                        otherPlayer.prevVelocity = otherPlayer.car.body.getLinearVelocity().clone();
                    }
                }
            }
        }
    }


    onPostSolve(contact, impulse) {
        const fixtureA = contact.getFixtureA();
        const fixtureB = contact.getFixtureB();

        const bodyA = fixtureA.getBody();
        const bodyB = fixtureB.getBody();

        let car = null;
        let ballHit = false;

        for (let id in this.players) {
            const player = this.players[id];

            if (bodyA === player.car.body) car = player.car;
            if (bodyB === player.car.body) car = player.car;

            if (bodyA === player.car.body || bodyB === player.car.body) {
                let carA = player.car; // One of the colliding cars

                // Check if the other body is a car
                for (let otherId in this.players) {
                    if (otherId == id) continue; // Skip same player

                    const otherPlayer = this.players[otherId];

                    if (bodyA === otherPlayer.car.body || bodyB === otherPlayer.car.body) {

                        let carB = otherPlayer.car; // The other colliding car

                        // Determine which car is getting hit based on normal impulse
                        let hitCar = null;
                        let movingCar = null;
                        let hitPlayer;

                        // Loop through all the normal impulses (this handles multi-point collisions)
                        for (let i = 0; i < impulse.normalImpulses.length; i++) {
                            const impulseMagnitude = impulse.normalImpulses[i];

                            // Only proceed if the impulse is positive (indicating an actual collision)
                            if (impulseMagnitude > 0) {
                                let velocityA = carA.body.getLinearVelocity().length();
                                let velocityB = carB.body.getLinearVelocity().length();

                                // Compare the velocities to determine which car is moving faster
                                if (velocityA > velocityB) {
                                    movingCar = carA;
                                    hitCar = carB;
                                    hitPlayer = otherPlayer;
                                } else {
                                    movingCar = carB;
                                    hitCar = carA;
                                    hitPlayer = player;
                                }

                                // Break once we identify the hit car
                                break;
                            }
                        }

                        if (hitCar) {

                            // Preserve the hit car's velocity, so it doesn't get an extra push
                            hitCar.body.setLinearVelocity(hitPlayer.prevVelocity);
                            hitCar.body.setAngularVelocity(0); // Optional: prevent spinning
                        }
                    }
                }
            }

            // Check if the ball was hit by the car
            if ((bodyA === this.ball.body && car) || (bodyB === this.ball.body && car)) {
                ballHit = true;
            }

            if (car && ballHit) {
                const carPos = car.body.getPosition();
                const ballPos = this.ball.body.getPosition();

                // Car's forward vector
                const carForward = car.body.getWorldVector({ x: 0, y: -1 }); // Assuming -y is forward

                // Calculate car's front edge
                const carFrontEdge = {
                    x: carPos.x + carForward.x * (this.CAR_HEIGHT / 2),
                    y: carPos.y + carForward.y * (this.CAR_HEIGHT / 2),
                };

                // Calculate the minimum distance needed for the ball to be in front
                const minFrontDist = (this.CAR_HEIGHT / 2) + (CONSTANTS.BALL_RADIUS / 2);

                // Project ball position onto car's forward axis
                const ballToFront = {
                    x: ballPos.x - carFrontEdge.x,
                    y: ballPos.y - carFrontEdge.y,
                };

                const ballFrontDist = carForward.x * ballToFront.x + carForward.y * ballToFront.y;

                if (ballFrontDist >= CONSTANTS.BALL_RADIUS / 2 - 0.1) { // Ball is in front of the car
                    const normalImpulseSum = impulse.normalImpulses.reduce((sum, val) => sum + val, 0);

                    const DRIBBLE_FORCE_THRESHOLD = 20; // Tune as needed

                    if (normalImpulseSum < DRIBBLE_FORCE_THRESHOLD) { // Dribbling
                        // Find perpendicular direction to car movement
                        const carRight = { x: -carForward.y, y: carForward.x }; // Rotate 90 degrees

                        // Project ball onto perpendicular line
                        const offset = (carRight.x * ballToFront.x + carRight.y * ballToFront.y);

                        // Compute ball destination by shifting along perpendicular axis
                        const ballDest = {
                            x: ballPos.x - carRight.x * offset,
                            y: ballPos.y - carRight.y * offset
                        };

                        // this.io.to(this.id).emit("debug dot", ballDest);

                        const carSpeed = Vec2(car.body.getLinearVelocity()).magnitude();

                        const baseForce = 1.25;
                        const speedFactor = Math.min(carSpeed / 10, 2);
                        const adjustedForceFactor = baseForce * (0.5 + Math.pow(speedFactor, 1.5) * 0.5);

                        // // Distance from ball to ballDest
                        // const ballDist = Vec2(ballPos).distance(ballDest);

                        // // Damping factor that decreases as ballDist increases
                        // const k = 2; // Tune this constant as needed
                        // let dampingFactor = 1 / (1 + k * ballDist);

                        // console.log("DISTANCE DAMPING", dampingFactor);

                        let dampingFactor = 1;
                        const force = {
                            x: (ballDest.x - ballPos.x) * adjustedForceFactor * dampingFactor,
                            y: (ballDest.y - ballPos.y) * adjustedForceFactor * dampingFactor
                        };

                        this.ball.body.applyLinearImpulse(force, this.ball.body.getWorldCenter());


                    }
                }
            }
        }
    }


    onEndContact(contact) {
    }


    createObject(object, body) {
        let id = Math.random().toString(36).substr(2, 9);
        object.id = id;
        this.objects[id] = {
            id: id,
            object: object,
            body: body
        };
        this.io.to(this.id).emit("objects added", { [object.id]: object });

        return this.objects[id];
    }

    playerJoined(socket, bot) {
        // return;
        if (!bot) {
            socket.join(this.id);

            let objectsForClient = {};
            for (let id in this.objects) {
                const object = this.objects[id];
                objectsForClient[id] = object.object;
            }

            this.io.to(this.id).emit("objects added", objectsForClient);
            this.io.to(this.id).emit("wall vertices", this.wallVertices);

        }



        let car = this.world.createDynamicBody(Vec2(0, 0));
        car.createFixture(planck.Box(this.CAR_WIDTH / 2, this.CAR_HEIGHT / 2), {
            density: this.CAR_DENSITY,
            friction: this.CAR_FRICTION,
            restitution: this.CAR_RESTITUTION
        });
        car.setLinearDamping(this.CAR_DAMPING);
        car.setAngularDamping(5.0); // Prevent uncontrolled spinning

        let botCarSprite;
        if (bot) {
            let botCount = 1;
            for (let id in this.players) {
                if (this.players[id].bot && (this.players[id] != (bot ? bot.id : socket.id))) {
                    botCount++;
                }
            }

            if (botCount == 1) {
                botCarSprite = "botTwo";
            } else if (botCount == 2) {
                botCarSprite = "botOne";
            } else if (botCount == 3) {
                botCarSprite = "carRed";
            } else {
                botCarSprite = "carRed";
            }
        }


        let carObj = this.createObject({
            name: "car",
            socketId: !bot ? socket.id : bot.id,
            type: "rectangle",
            position: Vec2(0, 0),
            width: this.CAR_WIDTH / 2,
            height: this.CAR_HEIGHT / 2,
            angle: 0,
            color: "black",
            sprite: botCarSprite ? botCarSprite : "carBlue"
        }, car);


        this.players[!bot ? socket.id : bot.id] = {
            bot: bot,
            id: !bot ? socket.id : bot.id,
            inputs: {},
            car: carObj,
            flip: true,
            backwardsFlip: true,
            team: !bot ? "blue" : "red",
            settings: {
                mouseRange: 300,
                sensitivity: 1.75,
                username: ""
            }
        }
    }

    createField() {
        // Create the walls as a single chain shape

        function createCircleVertices(center, radius, segments, startAngle = 0, stopAngle = Math.PI * 2) {
            const vertices = [];
            const angleIncrement = (stopAngle - startAngle) / segments;

            for (let i = 0; i <= segments; i++) {
                const angle = startAngle + i * angleIncrement;
                const x = radius * Math.cos(angle);
                const y = radius * Math.sin(angle);
                vertices.push(Vec2(center.x + x, center.y + y));
            }

            return vertices;
        }



        this.wallVertices = [];




        let topLeft = Vec2(-CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.FIELD_HEIGHT / 2);
        let topRight = Vec2(CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.FIELD_HEIGHT / 2);
        let bottomRight = Vec2(CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_HEIGHT / 2);
        let bottomLeft = Vec2(-CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.FIELD_HEIGHT / 2);

        let topLeftCorner = createCircleVertices(topLeft.add(Vec2(this.WALL_CORNER_RADIUS, this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(180), degToRad(270));
        let topRightCorner = createCircleVertices(topRight.add(Vec2(-this.WALL_CORNER_RADIUS, this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(270), degToRad(360));

        let rightGoal = [
            Vec2(CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.GOAL_SIZE / 2)
        ];
        this.rightGoalVertices = rightGoal;
        let bottomRightCorner = createCircleVertices(bottomRight.add(Vec2(-this.WALL_CORNER_RADIUS, -this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(0), degToRad(90));

        let bottomLeftCorner = createCircleVertices(bottomLeft.add(Vec2(this.WALL_CORNER_RADIUS, -this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(90), degToRad(180));

        let leftGoal = [
            Vec2(-CONSTANTS.FIELD_WIDTH / 2, CONSTANTS.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2, -CONSTANTS.GOAL_SIZE / 2)
        ];
        this.leftGoalVertices = leftGoal;

        this.wallVertices.push(...topLeftCorner);
        this.wallVertices.push(...topRightCorner);
        this.wallVertices.push(...rightGoal);
        this.wallVertices.push(...bottomRightCorner);
        this.wallVertices.push(...bottomLeftCorner);
        this.wallVertices.push(...leftGoal);


        // Create a static body for the walls and attach the chain shape
        const wallsBody = this.world.createBody();
        wallsBody.createFixture(planck.Chain(this.wallVertices, true), {
            density: this.WALL_DENSITY,
            friction: this.WALL_FRICTION,
            restitution: this.WALL_RESTITUTION
        });

        this.walls = wallsBody; // Store the walls body reference


        // Create the ball at the center of the world (in meters)
        const ball = this.world.createDynamicBody(Vec2(0, 0));
        ball.createFixture(new planck.Circle(CONSTANTS.BALL_RADIUS), {
            density: this.BALL_DENSITY,
            friction: this.BALL_FRICTION,
            restitution: this.BALL_RESTITUTION
        });
        ball.setLinearDamping(this.BALL_DAMPING);
        ball.setAngularDamping(0.75);
        ball.setBullet(true);

        this.ball = this.createObject({
            type: "circle",
            position: Vec2(0, 0),
            radius: CONSTANTS.BALL_RADIUS,
            color: "white",
            sprite: "ball"
        }, ball);

    }



    step() {
        console.log("STEP");
        this.world.step(1 / this.FPS, this.VELOCITY_ITER, this.POSITION_ITER);

        for (let id in this.players) {
            const player = this.players[id];

            if (player.movementLocked) continue;

            let carAngle = player.car.body.getAngle() - Math.PI / 2;
            const forward = Vec2(Math.cos(carAngle), Math.sin(carAngle));




            // Handle turning
            if (player.inputs["mousePos"]) {

                let carPos = player.car.body.getPosition().clone();
                let mousePos = player.inputs["mousePos"].mul(1 / CONSTANTS.SCALE).add(carPos);

                // this.io.to(this.id).emit("debug dot", mousePos);

                // Compute the vector from the car to the mouse
                let deltaX = mousePos.x - carPos.x;
                let deltaY = mousePos.y - carPos.y;

                // Get the angle to the mouse position
                let mouseAngle = Math.atan2(deltaY, deltaX);

                // Normalize the angle difference
                let angleDiff = mouseAngle - carAngle;
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff)); // Ensures range [-π, π]

                let turnPower = 25;
                player.car.body.setAngularVelocity(angleDiff * turnPower);


            } else {
                let turnSpeed = this.TURN_SPEED
                if (player.inputs["Shift"]) {
                    turnSpeed = this.POWERSLIDE_TURN_SPEED;
                }

                if (player.inputs["ArrowLeft"] && !player.inputs["ArrowRight"]) player.car.body.setAngularVelocity(-turnSpeed);
                else if (player.inputs["ArrowRight"] && !player.inputs["ArrowLeft"]) player.car.body.setAngularVelocity(turnSpeed);
                else player.car.body.setAngularVelocity(0); // Stop rotation when left or right is released

            }

            // Handle flip, boost, and drive force
            let flipped = false;
            if ((player.inputs["f"] || player.inputs["mouse0"]) && player.flip) {
                flipped = true;
                let initialVel = player.car.body.getLinearVelocity().clone();

                player.car.body.applyLinearImpulse(forward.mul(this.FLIP_FORCE), player.car.body.getWorldCenter(), true);
                player.flip = false;

                if (this.gameStats?.players[player.id]) {
                    this.gameStats.players[player.id].flipsUsed++;
                }

                const FLIP_DELAY = 500;
                setTimeout(() => {
                    player.flip = true;
                }, FLIP_DELAY);
            }

            if (player.inputs["r"] && player.backwardsFlip) {
                // flipped = true
                this.FLIP_FORCE = 75 * 0.75 * (0.75 + 0.125);

                player.car.body.applyLinearImpulse(forward.mul(-this.FLIP_FORCE * 1.25), player.car.body.getWorldCenter(), true);
                player.backwardsFlip = false;

                if (this.gameStats?.players[player.id]) {
                    this.gameStats.players[player.id].backwardsFlipsUsed++;
                }

                const FLIP_DELAY = 500 * 0.75;
                setTimeout(() => {
                    player.backwardsFlip = true;
                }, FLIP_DELAY);
            }

            // Apply boost force if space or mouse2 is pressed
            if (player.inputs[" "] || player.inputs["mouse2"]) {
                if (!player.car.boosting) {
                    player.car.boosting = true;
                    this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: true } });
                }

                if (this.gameStats?.players[player.id]) {
                    this.gameStats.players[player.id].boostUsed++;
                }

                if (!flipped) {
                    player.car.body.applyLinearImpulse(forward.mul(this.BOOST_FORCE), player.car.body.getWorldCenter(), true);
                }
            } else {
                player.car.boosting = false;
                this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: false } });
            }

            // Apply normal drive force

            if (!player.car.boosting && (player.inputs["ArrowUp"] || player.inputs["w"]) && !(player.inputs["ArrowDown"] || player.inputs["s"])) {
                player.car.body.applyLinearImpulse(player.car.body.getWorldVector(Vec2(0, -1)).mul(this.DRIVE_FORCE), player.car.body.getWorldCenter(), true);

            } else if ((player.inputs["ArrowDown"] || player.inputs["s"]) && !(player.inputs["ArrowUp"] || player.inputs["w"])) {
                player.car.body.applyLinearImpulse(player.car.body.getWorldVector(Vec2(0, 1)).mul(this.DRIVE_FORCE), player.car.body.getWorldCenter(), true);

            }

            // Allow lateral movement even when boosting
            if (player.inputs["a"] && !player.inputs["d"]) {
                player.car.body.applyLinearImpulse(player.car.body.getWorldVector(Vec2(-1, 0)).mul(this.LATERAL_FORCE), player.car.body.getWorldCenter(), true);
            } else if (player.inputs["d"] && !player.inputs["a"]) {
                player.car.body.applyLinearImpulse(player.car.body.getWorldVector(Vec2(1, 0)).mul(this.LATERAL_FORCE), player.car.body.getWorldCenter(), true);
            }


        }




        function createExplosion(world, explosionCenter, explosionRadius, explosionStrength) {
            let body = world.getBodyList();

            // Iterate through all bodies in the world
            while (body) {
                const bodyPosition = body.getPosition();
                const distanceVec = bodyPosition.sub(explosionCenter);
                const distance = distanceVec.length();

                // Only affect bodies within the explosion radius
                if (distance > 0 && distance < explosionRadius) {
                    // Calculate the force direction and strength
                    const direction = Vec2(distanceVec.clone()).normalize();
                    const strength = explosionStrength * (1 - distance / explosionRadius); // Decrease strength with distance
                    const force = direction.mul(strength);
                    // Apply the force at the body's center of mass
                    body.applyLinearImpulse(force, body.getWorldCenter(), true);
                }

                // Move to the next body
                body = body.getNext();
            }
        }


        const goalScored = (team) => {
            this.io.to(this.id).emit("goal", team);

            if (this.running) {
                this.goalScored = true;
                this.pauseTimer();
            }

            let scorerId = this.lastTouchedCarId;



            if (scorerId && this.gameStats?.players[scorerId]) {
                this.gameStats.players[scorerId].goals++;
            }

            let explosionCenterTop;
            let explosionCenterMiddle;
            let explosionCenterBottom;

            if (team === "red") {
                explosionCenterTop = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2);
                explosionCenterMiddle = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, 0);
                explosionCenterBottom = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2);
            } else if (team === "blue") {
                explosionCenterTop = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2);
                explosionCenterMiddle = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, 0);
                explosionCenterBottom = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2);
            }

            let explosionRadius = 500;
            let explosionPower = 300;
            createExplosion(this.world, explosionCenterTop, explosionRadius, explosionPower);
            createExplosion(this.world, explosionCenterMiddle, explosionRadius, explosionPower);
            createExplosion(this.world, explosionCenterBottom, explosionRadius, explosionPower);

            if (this.running) setTimeout(() => {
                this.start();
                this.goalScored = false;
            }, 3000);
        }


        if (!this.goalScored) {
            let ballPos = this.ball.body.getPosition();

            let rightGoalIntersection = circleRectIntersection(ballPos.x, ballPos.y, CONSTANTS.BALL_RADIUS, this.rightGoalVertices[0].x, this.rightGoalVertices[0].y, this.rightGoalVertices[2].x, this.rightGoalVertices[2].y, true);
            if (rightGoalIntersection) {
                goalScored("red");
            }

            let leftGoalIntersection = circleRectIntersection(ballPos.x, ballPos.y, CONSTANTS.BALL_RADIUS, this.leftGoalVertices[0].x, this.leftGoalVertices[0].y, this.leftGoalVertices[2].x, this.leftGoalVertices[2].y, true);
            if (leftGoalIntersection) {
                goalScored("blue");
            }
        }

        let objectUpdates = {};
        for (let id in this.objects) {
            const object = this.objects[id];

            let position = object.body.getPosition().clone();
            let angle = object.body.getAngle();

            let updateValues = {};

            if (position.x !== object.lastPosition?.x || position.y !== object.lastPosition?.y) {
                updateValues.position = position.clone();
            }

            if (angle !== object.lastAngle) {
                updateValues.angle = angle;
            }

            if (Object.keys(updateValues).length > 0) {
                objectUpdates[id] = updateValues;
            }

            object.lastPosition = position.clone();
            object.lastAngle = angle;
        }

        if (Object.keys(objectUpdates).length) {
            this.io.to(this.id).emit("object updates", objectUpdates, performance.now());
        }
    }




    mouseMove(id, dx, dy, w, h) {
        if (this.preset == "default" || this.preset == "mouseControls") {
            const player = this.players[id];
            if (!player.inputs["mousePos"]) player.inputs["mousePos"] = Vec2(0, 0);

            let sens = player.settings.sensitivity;
            let mousePos = player.inputs["mousePos"].add(Vec2(dx * sens, dy * sens));

            let mouseDir = Vec2(mousePos).normalize();
            let mouseRange = player.settings.mouseRange;
            if (mousePos.magnitude() > mouseRange) {
                mousePos = mouseDir.mul(mouseRange);
            }

            this.io.to(id).emit("mouse pos", mousePos);

            this.players[id].inputs["mousePos"] = mousePos;
            this.players[id].canvasWidth = w;
            this.players[id].canvasHeight = h;
        }
    }

    mouseDown(id, button) {
        if (this.preset == "default" || this.preset == "mouseControls") {
            this.players[id].inputs[`mouse${button}`] = true;
        }
    }

    mouseUp(id, button) {
        if (this.preset == "default" || this.preset == "mouseControls") {
            this.players[id].inputs[`mouse${button}`] = false;
        }
    }

    keyDown(id, key) {

        let allow = false;

        if (this.preset == "default") {
            allow = true; // Default allows all inputs
        } else if (this.preset == "keyboardControls") {
            if (["w", "a", "s", "d", "f", "r", " ", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift"].includes(key)) {
                allow = true;
            }
        } else if (this.preset == "mouseControls") {
            if (["w", "a", "s", "d", "f", "r", " "].includes(key)) {
                allow = true;
            }
        } else if (this.preset == "arrowKeysFR") {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "f", "r"].includes(key)) {
                allow = true;
            }
        }

        if (allow) this.players[id].inputs[key] = true;
    }

    keyUp(id, key) {
        this.players[id].inputs[key] = false;

    }


}

