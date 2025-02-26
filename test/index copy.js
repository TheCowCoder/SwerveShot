const vertexShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform float inwardShift;
uniform float downwardShift;

varying vec2 vTextureCoord;

uniform float containerHeight;
uniform float containerWidth;

void main() {
    vTextureCoord = aTextureCoord;

    vec2 pos = aVertexPosition;

    // Example: you can still modify pos.y based on a factor if needed
    float factor = (containerHeight - pos.y) / containerHeight;
    // pos.y += downwardShift * factor; // (if needed)


    float heightFactor = (containerHeight - pos.y) / containerHeight;
    // Remap the x coordinate so the edges move inward.
    float normX = pos.x / containerWidth;
    pos.x = mix(inwardShift * heightFactor, containerWidth - inwardShift * heightFactor, normX);

    vec3 projected = projectionMatrix * vec3(pos, 1.0);
    gl_Position = vec4(projected.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

void main() {
    gl_FragColor = texture2D(uSampler, vTextureCoord);
}`;

async function initPixi() {
    const app = new PIXI.Application({
        width: 800,
        height: 600,
        backgroundColor: 0x1099bb,
    });
    document.body.appendChild(app.view);

    const container = new PIXI.Container();
    container.width = app.screen.width;
    container.height = app.screen.height;

    const texture = await PIXI.Assets.load('https://pixijs.io/examples/examples/assets/bunny.png');

    for (let i = 0; i < 100; i++) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = Math.random() * app.screen.width;
        sprite.y = Math.random() * app.screen.height;
        sprite.anchor.set(0.5);
        sprite.scale.set(2);
        container.addChild(sprite);
    }

    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff0000);
    graphics.drawCircle(100, 100, 50);
    graphics.endFill();
    container.addChild(graphics);

    const tiltFilter = new PIXI.Filter(vertexShader, fragmentShader, {
        inwardShift: 300,
        downwardShift: 0,
        containerHeight: app.screen.height,
        containerWidth: app.screen.width
    });
    container.filters = [tiltFilter];

    app.stage.addChild(container);
}

initPixi();