const vertexShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat4 projectionMatrix;

varying vec2 vTextureCoord;

void main() {
    vTextureCoord = aTextureCoord;
    gl_Position = projectionMatrix * vec4(aVertexPosition, 0.0, 1.0);
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

    // Add bunnies
    for (let i = 0; i < 100; i++) {
        const sprite = new PIXI.Sprite(texture);
        sprite.x = Math.random() * app.screen.width;
        sprite.y = Math.random() * app.screen.height;
        sprite.anchor.set(0.5);
        sprite.scale.set(2);
        container.addChild(sprite);
    }

    // Add a red circle
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff0000);
    graphics.drawCircle(100, 100, 50);
    graphics.endFill();
    container.addChild(graphics);

    
    const fov = Math.PI / 4; // Field of view (45 degrees)
    const aspect = app.screen.width / app.screen.height;
    const near = 0.1;
    const far = 1000;
    const f = 1.0 / Math.tan(fov / 2);
    
    // Correct Perspective Matrix as Float32Array
    const projectionMatrix = new Float32Array([
        f / aspect, 0,  0,                          0,
        0,         f,  0,                          0,
        0,         0,  (far + near) / (near - far), -1,
        0,         0,  (2 * far * near) / (near - far), 0
    ]);
    
    // Create the Tilt Filter with the corrected projection matrix
    const tiltFilter = new PIXI.Filter(vertexShader, fragmentShader, {
        projectionMatrix: projectionMatrix
    });
    

    
    container.filters = [tiltFilter];

    app.stage.addChild(container);
    // app.ticker.add(() => {
    //     container.rotation += 0.005;
    // });
}

initPixi();
