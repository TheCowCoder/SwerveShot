import { Application } from "pixi.js";
import {
  Model,
  LightingEnvironment,
  ImageBasedLighting,
  CameraOrbitControl,
  Color
} from "pixi3d";

import "./styles.css";

let app = new Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  antialias: true
});
document.body.appendChild(app.view);

app.loader.add(
  "diffuse.cubemap",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/chromatic/diffuse.cubemap"
);
app.loader.add(
  "specular.cubemap",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/chromatic/specular.cubemap"
);
app.loader.add(
  "teapot.gltf",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/teapot/teapot.gltf"
);

app.loader.load((_, resources) => {
  // Create and add the model, it uses the standard material by default.
  let model = app.stage.addChild(Model.from(resources["teapot.gltf"].gltf));
  model.y = -0.8;

  model.meshes.forEach((mesh) => {
    mesh.material.unlit = false; // Set unlit = true to disable all lighting.
    mesh.material.baseColor = new Color(1, 1, 1, 1); // The base color will be blended together with base color texture (if available).
    mesh.material.alphaMode = "opaque"; // Set alpha mode to "blend" for transparency (base color alpha less than 1).
    mesh.material.exposure = 2; // Set exposure to be able to control the brightness.
    mesh.material.metallic = 0; // Set to 1 for a metallic material.
    mesh.material.roughness = 0.3; // Value between 0 and 1 which describes the roughness of the material.
  });

  // Create the image-based lighting (IBL) object which is used to light the model. Depending on which IBL environment is used, it will greatly affect the visual appearence of the model.
  let ibl = new ImageBasedLighting(
    resources["diffuse.cubemap"].cubemap,
    resources["specular.cubemap"].cubemap
  );

  LightingEnvironment.main = new LightingEnvironment(app.renderer, ibl);
});

let control = new CameraOrbitControl(app.view);
control.angles.x = 25;
