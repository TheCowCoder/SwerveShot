const vertexShader = `
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;

uniform mat3 projectionMatrix;
uniform float inwardShift;
uniform float downwardShift;

varying vec2 vTextureCoord;

uniform float containerHeight;
uniform float containerWidth;

void main() {
    vTextureCoord = aTextureCoord;

    vec2 pos = aVertexPosition;

    // Example: you can still modify pos.y based on a factor if needed
    float factor = (containerHeight - pos.y) / containerHeight;
    // pos.y += downwardShift * factor; // (if needed)


    float heightFactor = (containerHeight - pos.y) / containerHeight;
    // Remap the x coordinate so the edges move inward.
    float normX = pos.x / containerWidth;
    pos.x = mix(inwardShift * heightFactor, containerWidth - inwardShift * heightFactor, normX);

    vec3 projected = projectionMatrix * vec3(pos, 1.0);
    gl_Position = vec4(projected.xy, 0.0, 1.0);
}

`;


I'm trying to 1. apply a horizontal squish, 2. make the squish full at the top and 0 at the bottom, for a perspective effect. I tried multiplying the inward and leftward shift by a heightFactor, which in theory would fix it, but it causes some bugs with the mix function and results in a distorted image.