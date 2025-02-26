import { Application } from "pixi.js";
import {
  Container3D,
  Mesh3D,
  Model,
  Color,
  Camera,
  LightingEnvironment,
  Light,
  LightType,
  ShadowCastingLight,
  ShadowQuality,
  CameraOrbitControl
} from "pixi3d";

import "./styles.css";

let app = new Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  antialias: true
});
document.body.appendChild(app.view);

app.loader.add(
  "teapot.gltf",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/teapot/teapot.gltf"
);

app.loader.load((_, resources) => {
  // Create the ground mesh so the shadow from the teapot can be seen.
  let ground = app.stage.addChild(Mesh3D.createPlane());
  ground.y = -0.8;
  ground.scale.set(15);

  // Create and add the teapot model.
  let teapot = app.stage.addChild(Model.from(resources["teapot.gltf"].gltf));
  teapot.y = -0.8;

  // Container used for rotating the point light around.
  let pointLightContainer = app.stage.addChild(new Container3D());
  pointLightContainer.addChild(pointLight);

  let pointLightRotation = 0;
  app.ticker.add(() => {
    // Rotate point light around the teapot.
    pointLightContainer.rotationQuaternion.setEulerAngles(
      0,
      pointLightRotation++,
      0
    );
    // Rotate spot light towards the teapot.
    spotLight.transform.lookAt(teapot.position);
  });

  let pipeline = app.renderer.plugins.pipeline;

  // Enable shadows for both the teapot and the ground. This will add the object
  // to the shadow render pass and setup the material to use the shadow texture.
  pipeline.enableShadows(teapot, shadowCastingLight);
  pipeline.enableShadows(ground, shadowCastingLight);
});

// A light that is located infinitely far away, and emits light in one
// direction only.
let dirLight = new Light()
dirLight.type = LightType.directional
dirLight.intensity = 1
dirLight.color = new Color(1, 1, 1)
dirLight.rotationQuaternion.setEulerAngles(45, -75, 0);
LightingEnvironment.main.lights.push(dirLight);

// A light that is located at a point and emits light in all directions equally.
let pointLight = new Light()
pointLight.type = LightType.point
pointLight.range = 10
pointLight.color = new Color(0.5, 0.5, 1)
pointLight.intensity = 25
pointLight.position.set(0, 2, -3);
LightingEnvironment.main.lights.push(pointLight);

// A light that is located at a point and emits light in a cone shape.
let spotLight = new Light()
spotLight.type = LightType.spot
spotLight.range = 30
spotLight.color = new Color(1, 0.7, 0.7)
spotLight.intensity = 30
spotLight.position.set(-3, 2, -3);
LightingEnvironment.main.lights.push(spotLight);

// Create the shadow casting light which is used to render meshes to a shadow
// texture. It has several settings which is used for controlling the quality
// and performance of the shadows.
let shadowCastingLight = new ShadowCastingLight(app.renderer, spotLight, {
  shadowTextureSize: 512,
  quality: ShadowQuality.medium
});
shadowCastingLight.softness = 1;
shadowCastingLight.shadowArea = 15;

document.addEventListener("pointermove", (e) => {
  // Moves spot light to pointer position.
  spotLight.position = Camera.main.screenToWorld(e.x, e.y, 3);
});

let control = new CameraOrbitControl(app.view);
control.angles.set(20, 0);
