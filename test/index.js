// Create a Pixi application
const app = new PIXI.Application({
    width: 800,
    height: 600,
    antialias: true,
    backgroundColor: 0x1099bb,
    resolution: 1
});
document.body.appendChild(app.view);

// Create a container for the 2D world
const worldContainer = new PIXI.Container();
const worldTexture = PIXI.RenderTexture.create({ width: 800, height: 600 });

// Define the bunny texture URL
const bunnyTextureURL = 'https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_tron.png';

// Load the bunny texture using PIXI.Assets
PIXI.Assets.load(bunnyTextureURL).then((bunnyTexture) => {
    // Add 3D bunnies to the scene
    for (let i = 0; i < 100; i++) {
        const bunny = new PIXI.Sprite(bunnyTexture);
        bunny.position.set(Math.random() * 800, Math.random() * 600);
        bunny.scale.set(1);
        bunny.anchor.set(0.5);
        worldContainer.addChild(bunny);
    }

    // Render worldContainer to the texture after loading
    app.renderer.render(worldContainer, { renderTexture: worldTexture });

    // Create the 3D field plane with the rendered texture
    const fieldPlane = PIXI3D.Mesh3D.createPlane();
    fieldPlane.position.set(0, 0, 0);
    fieldPlane.material.baseColorTexture = worldTexture;
    // fieldPlane.material.wireframe = true;
    fieldPlane.material.unlit = true;
    app.stage.addChild(fieldPlane);

    // Add camera controls
    const control = new PIXI3D.CameraOrbitControl(app.view);
});
