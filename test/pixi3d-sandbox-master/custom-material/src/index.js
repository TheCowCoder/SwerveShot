import { Application, Program } from "pixi.js";
import {
  Model,
  Material,
  MeshShader,
  Camera,
  CameraOrbitControl
} from "pixi3d";

import "./styles.css";

let app = new Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  antialias: true
});
document.body.appendChild(app.view);

// The vertex shader is responsible for converting each vertex position into
// normalized device coordinates (from -1 to 1). The defined attributes
// (a_Position and a_Normal) will be automatically linked to the mesh geometry
// when using `MeshShader`. The vertex shader can also pass through values to
// the fragment shader by using varying variables. Uniforms are used to pass
// values from JavaScript to the shader. Both vertex -and fragment shaders are
// written using GLSL (GL Shader Language).

const vert = `
attribute vec3 a_Position;
attribute vec2 a_UV1;
attribute vec3 a_Normal;

varying vec3 v_Position;
varying vec2 v_UV1;
varying vec3 v_Normal;

uniform mat4 u_ViewProjection;
uniform mat4 u_Model;

void main() {
  v_Position = a_Position;
  v_UV1 = a_UV1;
  v_Normal = a_Normal;
  gl_Position = u_ViewProjection * u_Model * vec4(a_Position, 1.0);
}
`;

// The fragment shader is responsible for setting the color for a individual
// fragment/pixel. Here, the shader uses the time as input to set the color.

const frag = `
varying vec3 v_Position;
varying vec2 v_UV1;
varying vec3 v_Normal;

uniform float u_Time;

void main() {
  vec3 position = v_Position / 100.0;
  vec3 color = 0.5 + 0.5 * cos(u_Time + position.xyx + vec3(0, 2, 4));
  vec3 normal = v_Normal * 0.5 + 0.5;
  gl_FragColor = vec4(color * normal, 1.0);
}
`;

// A material includes all the settings used to render a mesh. It's responsible
// for creating a shader and providing that shader with uniform values.

class CustomMaterial extends Material {
  updateUniforms(mesh, shader) {
    if (shader.uniforms.u_Time === undefined) {
      shader.uniforms.u_Time = 0;
    }
    shader.uniforms.u_Time += app.ticker.elapsedMS / 1000;
    shader.uniforms.u_ViewProjection = Camera.main.viewProjection.array;
    shader.uniforms.u_Model = mesh.worldTransform.array;
  }

  createShader() {
    return new MeshShader(Program.from(vert, frag));
  }
}

app.loader.add(
  "teapot.gltf",
  "https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/teapot/teapot.gltf"
);

app.loader.load((_, resources) => {
  // Create the model and use the custom material.
  let model = app.stage.addChild(
    Model.from(resources["teapot.gltf"].gltf, {
      create: (source) => new CustomMaterial()
    })
  );
  model.y = -0.8;
});

let control = new CameraOrbitControl(app.view);
control.angles.x = 20;
