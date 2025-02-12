import * as CONSTANTS from "../shared/CONSTANTS.js";
import { Vec2 } from "../shared/Vec2.js";

export default class Bot {
    constructor(game, io, id, skillLevel) {
        this.game = game;
        this.io = io;
        this.id = Math.random().toString();
        if (id) this.id = id
        this.game.playerJoined(null, this)

        this.player = this.game.players[this.id];

        this.FPS = 60;
        this.step = this.step.bind(this);

        this.running = true;


        this.mode = Math.random() > 0.5 ? "Attack" : "Defend";
        this.mode = "Attack";
        this.stage = "positioning";

        this.setup();

        this.botDest = null;

        this.skillLevel = skillLevel !== undefined ? skillLevel : 1;
    }

    setup() {

    }

    mapSkill(minSkill, maxSkill) {
        return maxSkill + (1 - this.skillLevel) * (minSkill - maxSkill);
    }
    step() {
        if (!this.running) return;


        if (this.mode === "Attack") {
            let goalPos = this.player.team === "blue"
                ? Vec2(CONSTANTS.FIELD_WIDTH / 2, 0)
                : Vec2(-CONSTANTS.FIELD_WIDTH / 2, 0);

            let ballPos = Vec2(this.game.ball.body.getPosition());
            let carPos = Vec2(this.player.car.body.getPosition());
            let carAngle = this.player.car.body.getAngle() + Math.PI / 2;

            if (this.stage === "positioning") {
                let toBall = ballPos.sub(goalPos).normalize();
                this.botDest = ballPos.add(toBall.mul(CONSTANTS.BALL_RADIUS + CONSTANTS.CAR_HEIGHT / 2 + 0.5));
                let angleToDest = Math.atan2(this.botDest.y - carPos.y, this.botDest.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToDest - carAngle), Math.cos(angleToDest - carAngle));

                const angleThreshold = this.mapSkill(0.25, 0.001);


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


                let closeEnoughDist = this.mapSkill(7.5, 2);

                if (carPos.distance(this.botDest) <= closeEnoughDist) {
                    this.forward(false);
                    this.left(false);
                    this.right(false);
                    this.stage = "angling";
                }
            }


            else if (this.stage === "angling") {
                let angleToBall = Math.atan2(ballPos.y - carPos.y, ballPos.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(angleToBall - carAngle), Math.cos(angleToBall - carAngle));


                const angleThreshold = this.mapSkill(0.25, 0.001);

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

            if (carDistToGoal > ballDistToGoal) {
                // Car is behind the ball, so just go to the ball
                this.botDest = ballPos.clone();
            } else {
                // Otherwise, move to the projected point
                this.botDest = projectedPoint.clone();
            }


            if (this.stage === "positioning") {
                let toDefendPos = Math.atan2(this.botDest.y - carPos.y, this.botDest.x - carPos.x);
                let angleDiff = Math.atan2(Math.sin(toDefendPos - carAngle), Math.cos(toDefendPos - carAngle));

                const angleThreshold = this.mapSkill(0.25, 0.001);

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


                let closeEnoughDist = this.mapSkill(8.5, 3);

                if (carPos.distance(this.botDest) <= closeEnoughDist) {
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

                const angleThreshold = this.mapSkill(0.25, 0.001); // Slightly increased threshold for smoother transition

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

                const angleThreshold = this.mapSkill(0.25, 0.001); // Slightly increased threshold for smoother transition

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

                let defendDistance = this.mapSkill(0, 4);
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
        } else if (this.mode == "Forward") {
            this.forward();
        }

        if (this.mode == "Attack" || this.mode == "Defend") {

            let carPos = Vec2(this.player.car.body.getPosition());

            let dist = carPos.distance(this.botDest);
            let boostThreshold = 10;

            if (dist > boostThreshold) {
                this.boost();
            } else {
                this.boost(false);
            }

        }

        setTimeout(this.step, 1000 / this.FPS);

    }

    start() {
        this.step();
    }
    stop() {
        this.running = false;

        this.left(false);
        this.right(false);
        this.forward(false);
        this.backward(false);
        this.boost(false);
        this.flip(false);
        this.tightTurn(false);
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
