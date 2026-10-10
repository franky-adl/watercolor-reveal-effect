import * as THREE from "three";
import Orchestrator from "./Orchestrator.js";

// Perspective camera kept for Three.js's render path. The paper mesh is drawn in
// clip space by its vertex shader, so camera pose does not affect the image.
export default class Camera {
    constructor() {
        this.orc = new Orchestrator();
        this.sizes = this.orc.sizes;
        this.scene = this.orc.scene;

        this.setInstance();
    }

    setInstance() {
        this.instance = new THREE.PerspectiveCamera(
            40,
            this.sizes.width / this.sizes.height,
            0.1,
            100,
        );
        this.instance.position.set(0, 0, 5);
        this.scene.add(this.instance);
    }

    resize() {
        this.instance.aspect = this.sizes.width / this.sizes.height;
        this.instance.updateProjectionMatrix();
    }
}
