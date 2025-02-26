let app = new PIXI.Application({
    backgroundColor: 0xdddddd,
    resizeTo: window,
    antialias: true
  });
  document.body.appendChild(app.view);
  
  let control = new PIXI3D.CameraOrbitControl(app.view);
  control.distance = 3.5;
  control.angles.x = 8;
  
  class Bunny extends PIXI3D.Sprite3D {
    constructor(texture, areaSize) {
      super(texture);
      this.areaSize = areaSize;
  
      // Position the bunnies on the X-Z plane with y = 0 (flat on the ground)
      this.position.set(
        -this.areaSize / 2 + Math.random() * this.areaSize,
        0, // Keep y at 0 to stay on the plane
        -this.areaSize / 2 + Math.random() * this.areaSize
      );
  
      // Disable billboarding so they don't face the camera, making them appear flat
      this.billboardType = PIXI3D.SpriteBillboardType.none;
    }
  }
  
  const textures = [
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_ash.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_batman.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_bb8.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_neo.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_sonic.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_spidey.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_stormtrooper.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_superman.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_tron.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_wolverine.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3.png"),
    PIXI.Texture.from("https://raw.githubusercontent.com/jnsmalm/pixi3d-examples/master/assets/bunnies/rabbitv3_frankenstein.png")
  ];
  
  const bunnies = [];
  for (let i = 0; i < 500; i++) {
    bunnies.push(app.stage.addChild(new Bunny(textures[i % textures.length], 6)));
  }
  
  // Enable sorting by z-index
  app.stage.sortableChildren = true;
  