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

    constructor(io) {
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
        this.DRIVE_FORCE = 50;   // Drive force
        // this.BOOST_FORCE = 125;
        this.BOOST_FORCE = 3;

        this.CAR_DAMPING = 1.75;      // Linear damping for both car and ball
        this.BALL_DAMPING = 1.5;
        this.FLIP_FORCE = 75;


        this.CAR_WIDTH = 2;      // Car width in meters
        this.CAR_HEIGHT = 2.5;     // Car height in meters
        this.CAR_DENSITY = 0.37;
        this.CAR_FRICTION = 0;
        this.CAR_RESTITUTION = 1;

        this.BALL_RADIUS = 0.75 - 0.125; // Meters
        this.BALL_DENSITY = 0.5 - 0.125;
        this.BALL_FRICTION = 0;
        this.BALL_RESTITUTION = 1;

        this.WALL_DENSITY = 0;
        this.WALL_FRICTION = 0;
        this.WALL_RESTITUTION = 0.5;

        this.WALL_CORNER_RADIUS = 5;
        this.WALL_CORNER_SEGMENTS = 15;

        this.GOAL_SIZE = 7.5;
        this.GOAL_DEPTH = 3;


        this.createField();


        this.world.on("begin-contact", this.onBeginContact.bind(this));
        this.world.on("post-solve", this.onPostSolve.bind(this));
        this.world.on("end-contact", this.onEndContact.bind(this));

        this.renderer = new Renderer(this, this.FPS);
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
            console.log("Game over");
            clearInterval(this.gameTimer);
        }
        this.io.to(this.id).emit("game timer", this.remainingSeconds);
    }

    start(initial = false) {
        for (let id in this.players) {
            const player = this.players[id];
            player.movementLocked = true;
            player.flip = true;
            this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: false } });

            let spawnPos;
            let spawnAngle;

            if (player.team === "left") {
                spawnPos = Vec2(-CONSTANTS.FIELD_WIDTH / 2 + 3, 0);
                spawnAngle = degToRad(90);
            } else if (player.team === "right") {
                spawnPos = Vec2(CONSTANTS.FIELD_WIDTH / 2 - 3, 0);
                spawnAngle = degToRad(270);
            }

            player.car.body.setPosition(spawnPos);
            player.car.body.setAngle(spawnAngle);
            player.car.body.setLinearVelocity(Vec2(0, 0));
            player.car.body.setAngularVelocity(0);

        }

        this.ball.body.setPosition(Vec2(0, 0));
        this.ball.body.setAngle(0);
        this.ball.body.setLinearVelocity(Vec2(0, 0));
        this.ball.body.setAngularVelocity(0);


        const startGame = () => {
            for (let id in this.players) {
                this.players[id].movementLocked = false;
            }

            if (initial) this.remainingSeconds = 60 * 2;

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


        if (bodyA === this.walls || bodyB == this.walls) {
            for (let id in this.players) {
                const player = this.players[id];
                if (bodyB === player.car.body || bodyA === player.car.body) {
                    player.flip = true;
                }
            }
        }


    }
    onPostSolve(contact, impulse) {

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
            inputs: {},
            car: carObj,
            flip: true,
            team: "left",
            settings: {
                mouseRange: 300,
                sensitivity: 1.5,

            }
        }

        this.io.to(socket.id).emit("settings", this.players[socket.id].settings);

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
            Vec2(CONSTANTS.FIELD_WIDTH / 2, -this.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, -this.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, this.GOAL_SIZE / 2),
            Vec2(CONSTANTS.FIELD_WIDTH / 2, this.GOAL_SIZE / 2)
        ];
        this.rightGoalVertices = rightGoal;
        let bottomRightCorner = createCircleVertices(bottomRight.add(Vec2(-this.WALL_CORNER_RADIUS, -this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(0), degToRad(90));

        let bottomLeftCorner = createCircleVertices(bottomLeft.add(Vec2(this.WALL_CORNER_RADIUS, -this.WALL_CORNER_RADIUS)), this.WALL_CORNER_RADIUS, this.WALL_CORNER_SEGMENTS, degToRad(90), degToRad(180));

        let leftGoal = [
            Vec2(-CONSTANTS.FIELD_WIDTH / 2, this.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2 - this.GOAL_DEPTH, this.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2 - this.GOAL_DEPTH, -this.GOAL_SIZE / 2),
            Vec2(-CONSTANTS.FIELD_WIDTH / 2, -this.GOAL_SIZE / 2)
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
        ball.createFixture(new planck.Circle(this.BALL_RADIUS), {
            density: this.BALL_DENSITY,
            friction: this.BALL_FRICTION,
            restitution: this.BALL_RESTITUTION
        });
        ball.setLinearDamping(this.BALL_DAMPING);
        ball.setAngularDamping(1);
        ball.setBullet(true);

        this.ball = this.createObject({
            type: "circle",
            position: new Vec2(0, 0),
            radius: this.BALL_RADIUS,
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
                let turnPower = 10;
                player.car.body.setAngularVelocity(angleDiff * turnPower);


                // Left and right car movement
                let carPos = player.car.body.getPosition();
                let mousePos = player.inputs["mousePos"].clone().mul(1 / CONSTANTS.SCALE).add(carPos);

                // Vector from car to mouse
                let toMouse = normalize(Vec2(mousePos.x - carPos.x, mousePos.y - carPos.y));


                // Calculate perpendicular vectors (tangents)
                let tangentLeft = Vec2(-toMouse.y, toMouse.x);  // Rotate 90° counterclockwise
                let tangentRight = Vec2(toMouse.y, -toMouse.x); // Rotate -90° clockwise

                let moveDir;

                // Set moveDir based on the key pressed
                if (player.inputs["a"] && !player.inputs["d"]) {
                    moveDir = tangentLeft; // Move left
                } else if (player.inputs["d"] && !player.inputs["a"]) {
                    moveDir = tangentRight; // Move right
                }

                // Keep mouse in same position

                // if (moveDir) {
                //     // if (!player.car.lastPosition) player.car.lastPosition = Vec2(0, 0);

                //     let carDiff = carPos.clone().sub(player.car.lastPosition);
                //     // console.log(carDiff);
                //     player.inputs.mousePos.add(carDiff.mul(-CONSTANTS.SCALE));

                //     this.io.to(id).emit("mouse pos", player.inputs.mousePos);

                //     let rotateSpeed = 5; // Adjust speed as needed
                //     player.car.body.applyLinearImpulse(moveDir.mul(rotateSpeed), player.car.body.getWorldCenter(), true);
                // }


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
                player.car.body.applyLinearImpulse(forward.mul(this.FLIP_FORCE), player.car.body.getWorldCenter(), true);
                player.flip = false;
            } else {
                if (player.inputs[" "] || player.inputs["mouse2"]) {
                    // Apply boost force if space is pressed
                    // player.car.body.applyForceToCenter(forward.mul(this.BOOST_FORCE));
                    player.car.body.applyLinearImpulse(forward.mul(this.BOOST_FORCE), player.car.body.getWorldCenter(), true);
                    player.car.boosting = true;
                    this.io.to(this.id).emit("object updates", { [player.car.id]: { boosting: true } })
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

        // let rightGoal = [
        //     Vec2(CONSTANTS.FIELD_WIDTH / 2, -this.GOAL_SIZE / 2),
        //     Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, -this.GOAL_SIZE / 2),
        //     Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, this.GOAL_SIZE / 2),
        //     Vec2(CONSTANTS.FIELD_WIDTH / 2, this.GOAL_SIZE / 2)
        // ];
        // this.rightGoalVertices = rightGoal;
        // let bottomRightCorner = createCircleVertices(bottomRight.add(Vec2(-WALL_CORNER_RADIUS, -WALL_CORNER_RADIUS)), WALL_CORNER_RADIUS, WALL_CORNER_SEGMENTS, degToRad(0), degToRad(90));

        // let bottomLeftCorner = createCircleVertices(bottomLeft.add(Vec2(WALL_CORNER_RADIUS, -WALL_CORNER_RADIUS)), WALL_CORNER_RADIUS, WALL_CORNER_SEGMENTS, degToRad(90), degToRad(180));

        // let leftGoal = [
        //     Vec2(-CONSTANTS.FIELD_WIDTH / 2, GOAL_SIZE / 2),
        //     Vec2(-CONSTANTS.FIELD_WIDTH / 2 - GOAL_DEPTH, GOAL_SIZE / 2),
        //     Vec2(-CONSTANTS.FIELD_WIDTH / 2 - GOAL_DEPTH, -GOAL_SIZE / 2),
        //     Vec2(-CONSTANTS.FIELD_WIDTH / 2, -GOAL_SIZE / 2)
        // ];

        const goalScored = (team) => {
            this.goalScored = true;
            this.pauseTimer();

            let explosionCenterTop;
            let explosionCenterMiddle;
            let explosionCenterBottom;

            if (team === "right") {
                explosionCenterTop = Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, -this.GOAL_SIZE / 2);
                explosionCenterMiddle = Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, 0);
                explosionCenterBottom = Vec2(CONSTANTS.FIELD_WIDTH / 2 + this.GOAL_DEPTH, this.GOAL_SIZE / 2);
            } else if (team === "left") {
                explosionCenterTop = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - this.GOAL_DEPTH, -this.GOAL_SIZE / 2);
                explosionCenterMiddle = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - this.GOAL_DEPTH, 0);
                explosionCenterBottom = Vec2(-CONSTANTS.FIELD_WIDTH / 2 - this.GOAL_DEPTH, this.GOAL_SIZE / 2);
            }

            let explosionRadius = 1000;
            let explosionPower = 200;
            createExplosion(this.world, explosionCenterTop, explosionRadius, explosionPower);
            createExplosion(this.world, explosionCenterMiddle, explosionRadius, explosionPower);
            createExplosion(this.world, explosionCenterBottom, explosionRadius, explosionPower);

            setTimeout(() => {
                this.io.to(this.id).emit("goal", team);
                this.start();
                this.goalScored = false;
            }, 3000);
        }


        if (!this.goalScored) {
            let ballPos = this.ball.body.getPosition();

            let rightGoalIntersection = circleRectIntersection(ballPos.x, ballPos.y, this.BALL_RADIUS, this.rightGoalVertices[0].x, this.rightGoalVertices[0].y, this.rightGoalVertices[2].x, this.rightGoalVertices[2].y, true);
            if (rightGoalIntersection) {
                goalScored("right");
            }

            let leftGoalIntersection = circleRectIntersection(ballPos.x, ballPos.y, this.BALL_RADIUS, this.leftGoalVertices[0].x, this.leftGoalVertices[0].y, this.leftGoalVertices[2].x, this.leftGoalVertices[2].y, true);
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
            this.io.to(this.id).emit("object updates", objectUpdates);
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
