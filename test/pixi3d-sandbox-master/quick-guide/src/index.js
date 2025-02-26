import { Application, Sprite } from "pixi.js";
import {
  Model,
  LightingEnvironment,
  Light,
  Mesh3D,
  ShadowCastingLight,
  ShadowQuality,
  CameraOrbitControl,
  Color
} from "pixi3d";

import "./styles.css";

// Creates an application and adds the canvas element which results in an empty
// page with a grey background.
let app = new Application({
  resizeTo: window,
  backgroundColor: 0xdddddd,
  antialias: true
});
document.body.appendChild(app.view);

app.loader.add(
  "teapot.gltf",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/teapot/teapot.gltf"
);
app.loader.add(
  "vignette.png",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/vignette.png"
);

app.loader.load((_, resources) => {
  // Creates and adds a teapot model to the stage.
  let teapot = app.stage.addChild(Model.from(resources["teapot.gltf"].gltf));

  // Moves the model to 0.3 on the y-axis. Rotates it to 25 degrees on the
  // y-axis and scales it on all axes.
  teapot.position.y = -1;
  teapot.scale.set(1.2);
  teapot.rotationQuaternion.setEulerAngles(0, 15, 0);

  // Adds a directional light to the main lighting environment.
  let dirLight = new Light()
  dirLight.type = "directional"
  dirLight.intensity = 0.5
  dirLight.x = -4
  dirLight.y = 7
  dirLight.z = -4
  dirLight.rotationQuaternion.setEulerAngles(45, 45, 0);
  LightingEnvironment.main.lights.push(dirLight);

  // Adds a point light to the main lighting environment.
  let pointLight = new Light()
  pointLight.type = "point"
  pointLight.x = 1
  pointLight.y = 0
  pointLight.z = 3
  pointLight.range = 5
  pointLight.intensity = 10
  LightingEnvironment.main.lights.push(pointLight);

  // Gives the model some slight color by setting the material base color of
  // each mesh.
  teapot.meshes.forEach((mesh) => {
    mesh.material.baseColor = Color.fromHex("#ffefd5");
  });

  // Starts playing all animations in the model every 1.5 seconds.
  setInterval(() => {
    teapot.animations.forEach((anim) => anim.play());
  }, 1500);

  // Creates a ground plane to have something to cast shadows on.
  let ground = app.stage.addChild(Mesh3D.createPlane());
  ground.y = -1;
  ground.scale.set(10);

  // Creates a shadow casting light for the directional light.
  let shadowCastingLight = new ShadowCastingLight(app.renderer, dirLight, {
    shadowTextureSize: 512,
    quality: ShadowQuality.medium
  });
  shadowCastingLight.softness = 1;
  shadowCastingLight.shadowArea = 8;

  // Enables shadows to be both casted and received for the model and ground.
  let pipeline = app.renderer.plugins.pipeline;
  pipeline.enableShadows(teapot, shadowCastingLight);
  pipeline.enableShadows(ground, shadowCastingLight);

  // Adds a 2D vignette layer on top of the 3D scene to give it a more
  // cinematic effect.
  let vignette = app.stage.addChild(
    new Sprite(resources["vignette.png"].texture)
  );

  // Resizes the vignette to the size of the renderer.
  app.ticker.add(() => {
    Object.assign(vignette, {
      width: app.renderer.width,
      height: app.renderer.height
    });
  });
});

// Gives the user orbit control over the main camera using mouse/trackpad. Hold
// left mouse button and drag to orbit, use scroll wheel to zoom in/out.
let control = new CameraOrbitControl(app.view);
