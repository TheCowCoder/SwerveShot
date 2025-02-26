import { Application } from "pixi.js";
import { ZoomBlurFilter } from "pixi-filters";
import {
  Model,
  LightingEnvironment,
  ImageBasedLighting,
  CameraOrbitControl,
  CompositeSprite
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
  // Create the model, it will be rendered to the post processing sprite.
  let model = Model.from(resources["teapot.gltf"].gltf);
  model.y = -0.8;
  model.meshes.forEach((mesh) => {
    mesh.material.exposure = 2;
  });

  // Create the post processing sprite and set object to render.
  let sprite = app.stage.addChild(
    new CompositeSprite(app.renderer, {
      objectToRender: model
    })
  );

  // The post processing sprite works just like any other PixiJS sprite and can
  // contain any custom filter.
  sprite.filters = [new ZoomBlurFilter()];

  LightingEnvironment.main = new LightingEnvironment(
    app.renderer,
    new ImageBasedLighting(
      resources["diffuse.cubemap"].cubemap,
      resources["specular.cubemap"].cubemap
    )
  );
});

let control = new CameraOrbitControl(app.view);
control.angles.x = 25;
