import { Application } from "pixi.js";
import {
  Model,
  LightingEnvironment,
  ImageBasedLighting,
  CameraOrbitControl,
  PickingHitArea
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
  for (let i = 0; i < 3; i++) {
    let model = app.stage.addChild(Model.from(resources["teapot.gltf"].gltf));
    model.scale.set(0.6);
    model.y = 1.2 - i * 1.6;
    model.meshes.forEach((mesh) => {
      mesh.material.exposure = 2;
    });

    // To be able to get interaction events for a mesh, interactive needs to be set and a PickingHitArea needs to be
    model.interactive = true;
    model.buttonMode = true;
    model.hitArea = new PickingHitArea(model);
    model.on("pointerover", () => {
      model.scale.set(0.65);
    });
    model.on("pointerdown", () => {
      model.scale.set(0.65);
    });
    model.on("pointerup", () => {
      model.scale.set(0.6);
    });
    model.on("pointerout", () => {
      model.scale.set(0.6);
    });
  }

  LightingEnvironment.main = new LightingEnvironment(
    app.renderer,
    new ImageBasedLighting(
      resources["diffuse.cubemap"].cubemap,
      resources["specular.cubemap"].cubemap
    )
  );
});

let control = new CameraOrbitControl(app.view);
