import { Application } from "pixi.js";
import { Mesh3D, Light, LightingEnvironment } from "pixi3d";

import "./styles.css";

// Create the PixiJS application which will handle the render loop and create
// the canvas view.
let app = new Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  antialias: true
});

// Append the application canvas view to the document body.
document.body.appendChild(app.view);

// The "Mesh3D" object contains a few convenience functions which makes it
// easier to create some simpler meshes used most for testing. The cube mesh is
// being created and added as a child of the PixiJS application root.
let mesh = app.stage.addChild(Mesh3D.createCube());

// Create a light source and add it to the main lighting environment. Without
// doing this, the rendered mesh would be completely black.
let light = new Light()
light.position.set(-1, 0, 3)
LightingEnvironment.main.lights.push(light);

let rotation = 0;
app.ticker.add(() => {
  // This function will be called before each render happens. When rotating an
  // object in 3D, the "rotationQuaternion" is used instead of the regular
  // "rotation" available in PixiJS. "setEulerAngles" is called to be able to
  // set the rotation on all axes. In this case, only the y-axis is changed.
  mesh.rotationQuaternion.setEulerAngles(0, rotation++, 0);
});