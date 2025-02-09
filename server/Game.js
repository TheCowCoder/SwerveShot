import Renderer from "./Renderer.js";
import * as Const from "../shared/CONSTANTS.js";
import planck, { Vec2 } from "planck-js";
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

export const magnitude = (vec2) => {
    return Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
}

export const normalize = (vec2) => {
    let mag = magnitude(vec2);
    if (mag > 0) {
        // To avoid division by zero
        return new Vec2(vec2.x / mag, vec2.y / mag);
    } else {
        return new Vec2(0, 0);
    }
}

export default class Game {
    static instances = {};

    constructor(io, privateMatch) {
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

        this.TURN_SPEED = 5;    // Turn speed
        this.POWERSLIDE_TURN_SPEED = 10;
        this.DRIVE_FORCE = 75;   // Drive force
        // this.BOOST_FORCE = 125;
        this.BOOST_FORCE = 3;

        this.CAR_DAMPING = 1.75;      // Linear damping for both car and ball
        this.BALL_DAMPING = 1.5;
        this.FLIP_FORCE = 75;


        this.CAR_WIDTH = 2;      // Car width in meters
        this.CAR_HEIGHT = 2.5;     // Car height in meters
        this.CAR_DENSITY = 0.37;
        this.CAR_FRICTION = 0;
        // this.CAR_RESTITUTION = 1;
        this.CAR_RESTITUTION = 0;

        this.BALL_DENSITY = 0.5 - 0.125;
        this.BALL_FRICTION = 0;
        this.BALL_RESTITUTION = 1;

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
    }



    pauseTimer() {
        clearInterval(this.gameTimer);
    }
    startTimer() {
        this.gameTimer = setInterval(this.gameTimerFunc.bind(this), 1000);
    }
    gameTimerFunc() {
        this.remainingSeconds--;
        if (this.remainingSeconds == 0) {
            clearInterval(this.gameTimer);
            this.running = false;
            this.io.to(this.id).emit("game stats", this.gameStats);
            this.gameStats = null;

        }
        this.io.to(this.id).emit("game timer", this.remainingSeconds);
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
                console.log("adding to gamestat", id);
                this.gameStats.players[id] = {
                    username: this.players[id].settings.username,
                    goals: 0,
                    boostUsed: 0,
                    flipsUsed: 0,
                    ballTouches: 0,
                    team: this.players[id].team
                }
            }
        }

        let leftPlayerIds = Object.values(this.players).filter(p => p.team === "left").map(obj => obj.id);
        let rightPlayerIds = Object.values(this.players).filter(p => p.team === "right").map(obj => obj.id);


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
                playerSpawns[brId] = bottomRight;
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

            let spawnPos = playerSpawns[id][0];
            let spawnAngle = playerSpawns[id][1];

            player.movementLocked = true;
            player.flip = true;
            player.car.body.setPosition(spawnPos);
            player.car.body.setAngle(spawnAngle);
            player.car.body.setLinearVelocity(Vec2(0, 0));
            player.car.body.setAngularVelocity(0);

            // console.log(player.car.id, pos);
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

    end() {
        clearInterval(this.gameTimer);
        this.running = false;
        this.io.to(this.id).emit("game timer", 0);
        this.io.to(this.id).emit("game stats", this.gameStats);
        this.gameStats = null;
    }





    playerLeft(socket) {
        let player = this.players[socket.id];

        this.world.destroyBody(player.car.body);
        this.io.to(this.id).emit("objects removed", [player.car.id])

        delete this.objects[player.car.id];
        delete this.players[socket.id];

        console.log("LEFT", this.id);
        socket.leave(this.id);

        if (Object.keys(this.players).length == 0) {
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
        let carCollision = false;

        for (let id in this.players) {
            const player = this.players[id];
            if (bodyA === player.car.body) car = player.car;
            if (bodyB === player.car.body) car = player.car;
        }

        if ((bodyA === this.ball.body && car) || (bodyB === this.ball.body && car)) {
            ballHit = true;
        }

        // Check if two cars collided
        for (let id in this.players) {
            for (let otherId in this.players) {
                if (id !== otherId) {
                    let player = this.players[id];
                    let otherPlayer = this.players[otherId];
                    if (
                        (bodyA === player.car.body && bodyB === otherPlayer.car.body) ||
                        (bodyB === player.car.body && bodyA === otherPlayer.car.body)
                    ) {
                        carCollision = true;
                    }
                }
            }
        }

        // const normalImpulse = impulse.normalImpulses[0];
        // const SMASH_FORCE = 3;
        // const force = normalImpulse * SMASH_FORCE;
        // const collisionNormal = contact.getWorldManifold().normal;

        // if (car && ballHit) {
        //     // this.ball.body.applyLinearImpulse(
        //     //     { x: collisionNormal.x * force, y: collisionNormal.y * force },
        //     //     this.ball.body.getWorldCenter()
        //     // );
        // } else if (car && !carCollision) { // Prevent impulse application for car-to-car collisions
        //     let otherCar = bodyA === car.body ? bodyB : bodyA;
        //     if (otherCar) {
        //         otherCar.applyLinearImpulse(
        //             { x: -collisionNormal.x * force, y: -collisionNormal.y * force },
        //             otherCar.getWorldCenter()
        //         );
        //     }
        // }
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

    playerJoined(socket) {
        // return;
        socket.join(this.id);

        let objectsForClient = {};
        for (let id in this.objects) {
            const object = this.objects[id];
            objectsForClient[id] = object.object;
        }

        this.io.to(this.id).emit("objects added", objectsForClient);
        this.io.to(this.id).emit("wall vertices", this.wallVertices);


        let car = this.world.createDynamicBody(Vec2(0, 0));
        car.createFixture(planck.Box(this.CAR_WIDTH / 2, this.CAR_HEIGHT / 2), {
            density: this.CAR_DENSITY,
            friction: this.CAR_FRICTION,
            restitution: this.CAR_RESTITUTION
        });
        car.setLinearDamping(this.CAR_DAMPING);
        car.setAngularDamping(5.0); // Prevent uncontrolled spinning

        let carObj = this.createObject({
            name: "car",
            socketId: socket.id,
            type: "rectangle",
            position: Vec2(0, 0),
            width: this.CAR_WIDTH / 2,
            height: this.CAR_HEIGHT / 2,
            angle: 0,
            color: "black",
            sprite: "carBlue"
        }, car);

        this.players[socket.id] = {
            id: socket.id,
            inputs: {},
            car: carObj,
            flip: true,
            team: "left",
            settings: {
                mouseRange: 300,
                sensitivity: 1.75,
                username: ""
            }
        }

        // this.io.to(socket.id).emit("settings", this.players[socket.id].settings);

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
        const ball = this.world.createDynamicBody(new Vec2(0, 0));
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
            position: new Vec2(0, 0),
            radius: CONSTANTS.BALL_RADIUS,
            color: "white",
            sprite: "ball"
        }, ball);

    }



    step() {
        this.world.step(1 / this.FPS, this.VELOCITY_ITER, this.POSITION_ITER);

        for (let id in this.players) {
            const player = this.players[id];

            if (player.movementLocked) continue;

            let carAngle = player.car.body.getAngle() - Math.PI / 2;
            const forward = Vec2(Math.cos(carAngle), Math.sin(carAngle));





            // Handle turning
            if (player.inputs["mousePos"]) {

                let mouseAngle = Math.atan2(player.inputs["mousePos"].y, player.inputs["mousePos"].x);
                let angleDiff = mouseAngle - carAngle;

                // Normalize the angle difference to the range [-π, π]
                angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;
                let turnPower = 25;
                player.car.body.setAngularVelocity(angleDiff * turnPower);


                let carPos = player.car.body.getPosition();
                let mousePos = player.inputs["mousePos"].clone().mul(1 / CONSTANTS.SCALE).add(carPos);

                // Compute direction from mouse to car
                let toCar = normalize(carPos.clone().sub(mousePos));


                // Compute perpendicular movement direction
                let moveDir = null;
                if (player.inputs["a"] && !player.inputs["d"]) {
                    moveDir = Vec2(-toCar.y, toCar.x);  // Right (clockwise)
                } else if (player.inputs["d"] && !player.inputs["a"]) {
                    moveDir = Vec2(toCar.y, -toCar.x);  // Left (counterclockwise
                }



                if (moveDir) {

                    let forceMagnitude = this.DRIVE_FORCE;
                    player.car.body.applyForce(moveDir.mul(forceMagnitude), player.car.body.getWorldCenter(), true);
                }
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
            if ((player.inputs["f"] || player.inputs["mouse0"]) && player.flip) {
                let initialVel = player.car.body.getLinearVelocity().clone();

                player.car.body.applyLinearImpulse(forward.mul(this.FLIP_FORCE), player.car.body.getWorldCenter(), true);
                player.flip = false;

                // let flipDistance = 100;

                // setTimeout(() => {
                //     player.car.body.setLinearVelocity(initialVel);
                // }, flipDistance)

                if (this.gameStats?.players[player.id]) {
                    this.gameStats.players[player.id].flipsUsed++;
                }

                const FLIP_DELAY = 500;
                setTimeout(() => {
                    player.flip = true;
                }, FLIP_DELAY)
            } else {
                if (player.inputs[" "] || player.inputs["mouse2"]) {
                    // Apply boost force if space is pressed
                    // player.car.body.applyForceToCenter(forward.mul(this.BOOST_FORCE));
                    player.car.body.applyLinearImpulse(forward.mul(this.BOOST_FORCE), player.car.body.getWorldCenter(), true);
                    player.car.boosting = true;
                    this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: true } })

                    if (this.gameStats?.players[player.id]) {
                        this.gameStats.players[player.id].boostUsed++;
                    }


                } else {
                    // Apply normal drive force
                    if ((player.inputs["ArrowUp"] || player.inputs["w"]) && !(player.inputs["ArrowDown"] || player.inputs["s"])) {
                        player.car.body.applyForceToCenter(forward.mul(this.DRIVE_FORCE));
                    } else if ((player.inputs["ArrowDown"] || player.inputs["s"]) && !(player.inputs["ArrowUp"] || player.inputs["w"])) {
                        player.car.body.applyForceToCenter(forward.mul(-this.DRIVE_FORCE));
                    }
                    player.car.boosting = false;
                    this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: false } })

                }
            }

        }




        function createExplosion(world, explosionCenter, explosionRadius, explosionStrength) {
            let body = world.getBodyList();

            // Iterate through all bodies in the world
            while (body) {
                const bodyPosition = body.getPosition();
                const distanceVec = Vec2.sub(bodyPosition, explosionCenter);
                const distance = distanceVec.length();

                // Only affect bodies within the explosion radius
                if (distance > 0 && distance < explosionRadius) {
                    // Calculate the force direction and strength
                    const direction = normalize(distanceVec.clone());
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
            console.log("Goal scored by", scorerId);



            if (scorerId && this.gameStats?.players[scorerId]) {
                this.gameStats.players[scorerId].goals++;
            }

            let explosionCenterTop;
            let explosionCenterMiddle;
            let explosionCenterBottom;

            if (team === "right") {
                explosionCenterTop = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, -CONSTANTS.GOAL_SIZE / 2);
                explosionCenterMiddle = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, 0);
                explosionCenterBottom = Vec2(CONSTANTS.FIELD_WIDTH / 2 + CONSTANTS.GOAL_DEPTH, CONSTANTS.GOAL_SIZE / 2);
            } else if (team === "left") {
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
                goalScored("right");
            }

            let leftGoalIntersection = circleRectIntersection(ballPos.x, ballPos.y, CONSTANTS.BALL_RADIUS, this.leftGoalVertices[0].x, this.leftGoalVertices[0].y, this.leftGoalVertices[2].x, this.leftGoalVertices[2].y, true);
            if (leftGoalIntersection) {
                goalScored("left");
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


    // mouseMove(id, x, y, w, h) {
    //     this.players[id].inputs["mousePos"] = Vec2(x, y);
    //     this.players[id].canvasSize = Vec2(w, h);
    // }

    mouseMove(id, dx, dy) {
        const player = this.players[id];
        if (!player.inputs["mousePos"]) player.inputs["mousePos"] = Vec2(0, 0);

        let sens = player.settings.sensitivity;
        let mousePos = player.inputs["mousePos"].add(Vec2(dx * sens, dy * sens));

        let mouseDir = normalize(mousePos);
        let mouseRange = player.settings.mouseRange;
        if (mousePos.length() > mouseRange) {
            mousePos = mouseDir.mul(mouseRange);
        }

        this.io.to(id).emit("mouse pos", mousePos);

        this.players[id].inputs["mousePos"] = mousePos;
    }
    mouseDown(id, button) {
        this.players[id].inputs[`mouse${button}`] = true;
    }
    mouseUp(id, button) {
        this.players[id].inputs[`mouse${button}`] = false;
    }

    keyDown(id, key) {
        this.players[id].inputs[key] = true;
    }

    keyUp(id, key) {
        this.players[id].inputs[key] = false;
    }

}

