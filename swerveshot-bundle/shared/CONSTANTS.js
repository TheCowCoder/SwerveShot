import { Vec2 } from './Vec2.js';

export const SCALE = 30;
export const FIELD_WIDTH = 50 * 1.5;
export const FIELD_HEIGHT = 30 * 1.5;


export const farLeft = [Vec2(-FIELD_WIDTH / 2 + 6, 0), Math.atan2(0, -FIELD_WIDTH / 2 + 6) - (Math.PI / 2)];
export const topLeft = [Vec2(-FIELD_WIDTH / 2 + 6, -FIELD_HEIGHT / 2 + 6), Math.atan2(-FIELD_HEIGHT / 2 + 6, -FIELD_WIDTH / 2 + 6) - (Math.PI / 2)];
export const bottomLeft = [Vec2(-FIELD_WIDTH / 2 + 6, FIELD_HEIGHT / 2 - 6), Math.atan2(FIELD_HEIGHT / 2 - 6, -FIELD_WIDTH / 2 + 6) - (Math.PI / 2)];

export const farRight = [Vec2(FIELD_WIDTH / 2 - 6, 0), Math.atan2(0, FIELD_WIDTH / 2 - 6) - (Math.PI / 2)];
export const topRight = [Vec2(FIELD_WIDTH / 2 - 6, -FIELD_HEIGHT / 2 + 6), Math.atan2(-FIELD_HEIGHT / 2 + 6, FIELD_WIDTH / 2 - 6) - (Math.PI / 2)];
export const bottomRight = [Vec2(FIELD_WIDTH / 2 - 6, FIELD_HEIGHT / 2 - 6), Math.atan2(FIELD_HEIGHT / 2 - 6, FIELD_WIDTH / 2 - 6) - (Math.PI / 2)];


export const BALL_RADIUS = 0.75 - 0.125; // Meters

export const GOAL_SIZE = 7.5 * 1.5;
export const GOAL_DEPTH = 3 * 1.5;


export const CAR_WIDTH = 2;
export const CAR_HEIGHT = 2.5;