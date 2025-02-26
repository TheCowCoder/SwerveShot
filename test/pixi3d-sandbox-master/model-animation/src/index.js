import { Application } from "pixi.js";
import {
  Model,
  ImageBasedLighting,
  LightingEnvironment,
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
  let model = app.stage.addChild(Model.from(resources["teapot.gltf"].gltf));
  model.y = -0.8;
  model.meshes.forEach((mesh) => {
    mesh.material.exposure = 2;
  });

  setInterval(() => {
    for (let anim of model.animations) {
      // Start to play all animations in the model.
      anim.play();
      anim.loop = false;
      anim.speed = 1.2;
    }
  }, 1000);

  LightingEnvironment.main = new LightingEnvironment(
    app.renderer,
    new ImageBasedLighting(
      resources["diffuse.cubemap"].cubemap,
      resources["specular.cubemap"].cubemap
    )
  );
});

let control = new CameraOrbitControl(app.view);
control.angles.x = 20;
