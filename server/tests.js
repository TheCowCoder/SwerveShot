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
        this.mode = "Attack";

        this.stage;
    }

    setup() {
        // this.boost(true);
        // this.left(true);
        // this.boost();
        // setTimeout(() => {
        //     this.boost(false);
        // }, 1000);

    }
    step() {

        if (this.mode == "Attack") {
            if (!this.stage) {
                this.stage = "positioning";
            }

            if (this.stage == "positioning") {
                let goalPos;
                if (this.player.team == "blue") {
                    goalPos = Vec2(-CONSTANTS.FIELD_WIDTH / 2, 0);
                } else if (this.player.team == "blue") {
                    goalPos = Vec2(CONSTANTS.FIELD_WIDTH / 2, 0);
                }
                let ballPos = Vec2(this.game.ball.body.getPosition());
                let toBall = ballPos.sub(goalPos).normalize();
    
                let destination = ballPos.add(toBall.mul(CONSTANTS.BALL_RADIUS + CONSTANTS.CAR_HEIGHT / 2 + 0.5));
                let destAngle = Math.atan2(goalPos.y - ballPos.y, goalPos.x - ballPos.x) + Math.PI / 2;
    
                let carPos = Vec2(this.player.car.body.getPosition());
                let carAngle = this.player.car.body.getAngle();
                
                // Adjust if the car's side (not front) is facing the destination
                carAngle += Math.PI / 2; // Rotate by 90 degrees if needed
                
                let toDest = destination.clone().sub(carPos);
                let angleToDest = Math.atan2(toDest.y, toDest.x);
                
                // Compute the shortest angular difference
                let angleDiff = angleToDest - carAngle;
                
                // Normalize the angle difference to be within [-π, π]
                angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                
                const angleThreshold = 0.3; // Small dead zone (tweakable)
                
                if (Math.abs(angleDiff) < angleThreshold) {
                    // Stop turning if within threshold
                    if (this.leftOn) this.left(false);
                    if (this.rightOn) this.right(false);
                } else if (angleDiff > 0) {
                    // Turn left
                    if (this.rightOn) this.right(false);
                    this.left();
                } else {
                    // Turn right
                    if (this.leftOn) this.left(false);
                    this.right();
                }
                    
                this.forward();    

                if (carPos.distance(destination) <= 2) {
                    this.stage = "angling";
                }
            } else if (this.stage == "angling") {
                this.left(false);
                this.right(false);
                this.forward(false);
            }


            

        } else if (this.mode == "Defend") {

        }

        if (this.running) setTimeout(this.step, 1000 / this.FPS); // Continue with the next frame
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
                this.game.mouseDown(this.id);
            }
        } else {
            this.flipOn = false;
            this.game.mouseUp(this.id);
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
        

    stop() {
        this.running = false;
    }

  
}