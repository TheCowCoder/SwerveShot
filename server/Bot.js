import * as CONSTANTS from "../shared/CONSTANTS.js";
import { Vec2 } from "../shared/Vec2.js";

export default class Bot {
    constructor(game, io) {
        this.game = game;
        this.io = io;
        this.id = Math.random().toString();
        this.game.playerJoined(null, this)

        this.player = this.game.players[this.id];

        this.FPS = 60;
        this.step = this.step.bind(this);

        this.running = true;


        this.mode = Math.random() > 0.5 ? "Attack" : "Defend";
        this.mode = "Defend";

        this.stage = "positioning";

        this.setup();

    }

    setup() {

    }
    step() {
        if (this.mode === "Attack") {
            let goalPos = this.player.team === "blue"
                ? Vec2(CONSTANTS.FIELD_WIDTH / 2, 0)
                : Vec2(-CONSTANTS.FIELD_WIDTH / 2, 0);

            let ballPos = Vec2(this.game.ball.body.getPosition());
            let carPos = Vec2(this.player.car.body.getPosition());
            let carAngle = this.player.car.body.getAngle() + Math.PI / 2;

            if (this.stage === "positioning") {
                let toBall = ballPos.sub(goalPos).normalize();
                let destination = ballPos.add(toBall.mul(CONSTANTS.BALL_RADIUS + CONSTANTS.CAR_HEIGHT / 2 + 0.5));
                let angleToDest = Math.atan2(destination.y - carPos.y, destination.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToDest - carAngle), Math.cos(angleToDest - carAngle));

                const angleThreshold = 0.001;

                if (3 - Math.abs(angleDiff) < angleThreshold) {
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                    this.forward(true);
                } else if (angleDiff > 0) {
                    if (this.rightOn) this.right(false);
                    this.left();
                    this.forward(false);
                } else {
                    if (this.leftOn) this.left(false);
                    this.right();
                    this.forward(false);
                }
                
                if (carPos.distance(destination) <= 2) {
                    this.forward(false);
                    this.left(false);
                    this.right(false);
                    this.stage = "angling";
                }
            }


            else if (this.stage === "angling") {
                let angleToBall = Math.atan2(ballPos.y - carPos.y, ballPos.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToBall - carAngle), Math.cos(angleToBall - carAngle));


                const angleThreshold = 0.001;
                if (3 - Math.abs(angleDiff) < angleThreshold) {
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                    this.stage = "shooting";
                } else if (angleDiff > 0) {
                    if (this.rightOn) this.right(false);
                    this.left();
                } else {
                    if (this.leftOn) this.left(false);
                    this.right();
                }
            }

            else if (this.stage === "shooting") {
                this.flip();
                setTimeout(() => {
                    this.flip(false);
                }, 50);

                this.stage = "positioning";
            }

            let otherPlayerDist;
            for (let id in this.game.players) {
                if (id != this.player.id) {
                    otherPlayerDist = Vec2(this.game.players[id].car.body.getPosition()).distance(ballPos);
                    break;
                }
            }
            let ourDist = carPos.distance(ballPos);

            if (otherPlayerDist < ourDist) {
                this.mode = "Defend";
                this.stage = "positioning";
            }

        } else if (this.mode === "Defend") {
            let goalPos = this.player.team === "blue"
                ? Vec2(-CONSTANTS.FIELD_WIDTH / 2, 0)
                : Vec2(CONSTANTS.FIELD_WIDTH / 2, 0);

            let ballPos = Vec2(this.game.ball.body.getPosition());
            let carPos = Vec2(this.player.car.body.getPosition());
            let carAngle = this.player.car.body.getAngle() + Math.PI / 2;

            // Get vector from goal to ball
            let goalToBall = ballPos.sub(goalPos);
            let goalToBallDir = goalToBall.normalize(); // Unit direction vector

            // Vector from goal to car
            let goalToCar = carPos.sub(goalPos);

            // Scalar projection of carPos onto goalToBall line
            let projectionLength = goalToCar.dot(goalToBallDir);
            let projectedPoint = goalPos.add(goalToBallDir.mul(projectionLength)); // Closest point on line

            // Check if the car is already past the ball (i.e., on the far side)
            let carDistToGoal = carPos.distance(goalPos);
            let ballDistToGoal = ballPos.distance(goalPos);

            let defendPos;
            if (carDistToGoal > ballDistToGoal) {
                // Car is behind the ball, so just go to the ball
                defendPos = ballPos.clone();
            } else {
                // Otherwise, move to the projected point
                defendPos = projectedPoint;
            }



            // // // Vector from goal to ball
            // // let goalToBall = ballPos.sub(goalPos).normalize();

            // // // Perpendicular direction (90-degree rotation)
            // // let perpDir = Vec2(-goalToBall.y, goalToBall.x);

            // // // Find intersection of the goal-to-ball line and the perpendicular line through carPos
            // // let t = (carPos.sub(goalPos)).dot(goalToBall); // Projection of carPos onto goalToBall line
            // // let defendPos = goalPos.add(goalToBall.mul(t)); // Intersection point


            // // Step 1: Compute the slope of the line connecting goal to ball
            // let goalToBallDir = ballPos.sub(goalPos);
            // let slope1 = goalToBallDir.y / goalToBallDir.x; // Slope of goal-to-ball line

            // // Step 2: Find perpendicular slope (negative reciprocal)
            // let slope2 = -1 / slope1;

            // // Step 3: Compute intersection of both lines
            // // Equation of line 1: y = slope1 * (x - goalPos.x) + goalPos.y
            // // Equation of line 2: y = slope2 * (x - carPos.x) + carPos.y

            // let xIntersect = (slope1 * goalPos.x - slope2 * carPos.x + carPos.y - goalPos.y) / (slope1 - slope2);
            // let yIntersect = slope1 * (xIntersect - goalPos.x) + goalPos.y;

            // let defendPos = Vec2(xIntersect, yIntersect);


            if (this.stage === "positioning") {
                let toDefendPos = Math.atan2(defendPos.y - carPos.y, defendPos.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(toDefendPos - carAngle), Math.cos(toDefendPos - carAngle));

                const angleThreshold = 0.001;
                if (3 - Math.abs(angleDiff) < angleThreshold) {
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                    this.forward();
                } else if (angleDiff > 0) {
                    if (this.rightOn) this.right(false);
                    this.left();
                    this.forward(false);
                } else {
                    if (this.leftOn) this.left(false);
                    this.right();
                    this.forward(false);
                }


                if (carPos.distance(defendPos) <= 3) {
                    this.forward(false);
                    this.right(false);
                    this.left(false);
                    this.stage = "angling";
                }
            }

            // Step 2: Rotate to face the ball
            else if (this.stage === "angling") {
                let angleToBall = Math.atan2(ballPos.y - carPos.y, ballPos.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToBall - carAngle), Math.cos(angleToBall - carAngle));

                const angleThreshold = 0.001; // Slightly increased threshold for smoother transition

                if (
                    (3 - Math.abs(angleDiff) < angleThreshold) && 
                    (Vec2(this.player.car.body.getLinearVelocity()).magnitude() <= 100)
                ) {
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                    this.stage = "approaching";
                } else if (angleDiff > 0) {
                    // Turn left if the shortest path is counterclockwise
                    if (this.rightOn) this.right(false);
                    this.left();
                    this.forward(false);
                } else {
                    // Turn right if the shortest path is clockwise
                    if (this.leftOn) this.left(false);
                    this.right();
                    this.forward(false);
                }
            } else if (this.stage == "approaching") {
                let angleToBall = Math.atan2(ballPos.y - carPos.y, ballPos.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToBall - carAngle), Math.cos(angleToBall - carAngle));

                const angleThreshold = 0.001; // Slightly increased threshold for smoother transition

                if (3 - Math.abs(angleDiff) < angleThreshold) {
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                    this.forward(true);
                } else if (angleDiff > 0) {
                    // Turn left if the shortest path is counterclockwise
                    if (this.rightOn) this.right(false);
                    this.left();
                    this.forward(false);
                } else {
                    // Turn right if the shortest path is clockwise
                    if (this.leftOn) this.left(false);
                    this.right();
                    this.forward(false);
                }

                let defendDistance = 4;
                if (Vec2(this.player.car.body.getPosition()).distance(this.game.ball.body.getPosition()) <= defendDistance) {
                    this.right(false);
                    this.left(false);
                    this.flip();
                    this.mode = "Attack";
                    this.stage = "positioning";
                    setTimeout(() => {
                        this.flip(false);
                    }, 50);
                }
            }
        }

        if (this.running) setTimeout(this.step, 1000 / this.FPS);
    }

    start() {
        this.step();
    }
    stop() {
        this.running = false;
    }


    left(on = true) {
        if (on) {
            if (!this.leftOn) {
                this.leftOn = true;
                this.game.keyDown(this.id, "ArrowLeft");
            }
        } else {
            this.leftOn = false;
            this.game.keyUp(this.id, "ArrowLeft");
        }
    }

    right(on = true) {
        if (on) {
            if (!this.rightOn) {
                this.rightOn = true;
                this.game.keyDown(this.id, "ArrowRight");
            }
        } else {
            this.rightOn = false;
            this.game.keyUp(this.id, "ArrowRight");
        }
    }

    forward(on = true) {
        if (on) {
            if (!this.forwardOn) {
                this.forwardOn = true;
                this.game.keyDown(this.id, "ArrowUp");
            }
        } else {
            this.forwardOn = false;
            this.game.keyUp(this.id, "ArrowUp");
        }
    }

    backward(on = true) {
        if (on) {
            if (!this.backwardOn) {
                this.backwardOn = true;
                this.game.keyDown(this.id, "ArrowDown");
            }
        } else {
            this.backwardOn = false;
            this.game.keyUp(this.id, "ArrowDown");
        }
    }

    boost(on = true) {
        if (on) {
            if (!this.boostOn) {
                this.boostOn = true;
                this.game.keyDown(this.id, " ");
            }
        } else {
            this.boostOn = false;
            this.game.keyUp(this.id, " ");
        }
    }

    flip(on = true) {
        if (on) {
            if (!this.flipOn) {
                this.flipOn = true;
                this.game.keyDown(this.id, "f");
            }
        } else {
            this.flipOn = false;
            this.game.keyUp(this.id, "f");
        }
    }

    tightTurn(on = true) {
        if (on) {
            if (!this.tightTurnOn) {
                this.tightTurnOn = true;
                this.game.keyDown(this.id, "Shift");
            }
        } else {
            this.tightTurnOn = false;
            this.game.keyUp(this.id, "Shift");
        }
    }


}
