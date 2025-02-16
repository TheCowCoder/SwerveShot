import * as PIXI from 'pixi.js';

// Shaders as template literals for easy integration
const vertexShader = `
    attribute vec2 aVertexPosition;
    attribute vec2 aTextureCoord;
    uniform mat3 projectionMatrix;
    varying vec2 vTextureCoord;
    void main(void) {
        gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        vTextureCoord = aTextureCoord;
    }
`;

const fragmentShader = `
    precision mediump float;
    varying vec2 vTextureCoord;
    uniform sampler2D uSampler;
    uniform float perspectiveStrength;

    void main(void) {
        float perspective = 1.0 + (vTextureCoord.y - 0.5) * perspectiveStrength;
        vec2 coord = vec2(vTextureCoord.x, vTextureCoord.y * perspective);
        vec4 color = texture2D(uSampler, coord);
        gl_FragColor = color;
    }
`;

export default class TiltFilter extends PIXI.Filter {
    constructor(perspectiveStrength = 0.5) {
        super(vertexShader, fragmentShader);
        this.uniforms.perspectiveStrength = perspectiveStrength;
    }

    get strength() {
        return this.uniforms.perspectiveStrength;
    }

    set strength(value) {
        this.uniforms.perspectiveStrength = value;
    }
}
