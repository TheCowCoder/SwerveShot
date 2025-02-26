import { Application, Program, Geometry } from "pixi.js";
import { Material, MeshShader, MeshGeometry3D, Mesh3D, Camera } from "pixi3d";

import "./styles.css";

let app = new Application({
  backgroundColor: 0xdddddd,
  resizeTo: window,
  antialias: true
});
document.body.appendChild(app.view);

const vert = `
attribute vec3 a_Position;
attribute vec3 a_Color;

varying vec3 v_Color;

uniform mat4 u_Model;
uniform mat4 u_ViewProjection;

void main() {
  v_Color = a_Color;
  gl_Position = u_ViewProjection * u_Model * vec4(a_Position, 1.0);
}
`;

const frag = `
varying vec3 v_Color;

void main() {
  gl_FragColor = vec4(v_Color, 1.0);
}
`;

class CustomShader extends MeshShader {
  constructor() {
    super(Program.from(vert, frag));
  }

  createShaderGeometry(geometry) {
    let result = new Geometry();
    // Add the attributes used when rendering with the specified shader. This
    // geometry has two attributes: position and color. The number of components
    // for the attribute is also specified, both have three (z,y,z and r,g,b).
    result.addAttribute("a_Position", geometry.positions.buffer, 3);
    result.addAttribute("a_Color", geometry.colors.buffer, 3);
    return result;
  }
}

class CustomMaterial extends Material {
  updateUniforms(mesh, shader) {
    // Updates the shader uniforms before rendering with this material.
    shader.uniforms.u_Model = mesh.worldTransform.array;
    shader.uniforms.u_ViewProjection = Camera.main.viewProjection.array;
  }

  createShader() {
    return new CustomShader();
  }
}

// Create the geometry needed to render the mesh with the specified material.
// In this case, the vertex data includes position (x,y,z) and color (r,g,b).
// Three vertices is needed to get the triangle shape.
let geometry = Object.assign(new MeshGeometry3D(), {
  positions: {
    buffer: new Float32Array([
      // Vertex 1 (x,y,z)
      -3,
      -2,
      0,
      // Vertex 2 (x,y,z)
      +3,
      -2,
      0,
      // Vertex 3 (x,y,z)
      +0,
      +2,
      0
    ])
  },
  colors: {
    buffer: new Float32Array([
      // Vertex 1 (r,g,b)
      0,
      0,
      1,
      // Vertex 2 (r,g,b)
      0,
      1,
      0,
      // Vertex 3 (r,g,b)
      1,
      0,
      0
    ])
  }
});

app.stage.addChild(new Mesh3D(geometry, new CustomMaterial()));
