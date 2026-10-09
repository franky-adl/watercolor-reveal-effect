import * as THREE from "three";
import Orchestrator from "./Orchestrator.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default class Camera {
    constructor() {
        this.orc = new Orchestrator();
        this.sizes = this.orc.sizes;
        this.scene = this.orc.scene;
        this.canvas = this.orc.canvas;

        this.setInstance();
        this.setControls();
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

    setControls() {
        this.controls = new OrbitControls(this.instance, this.canvas);
        this.controls.enableDamping = true;
    }

    resize() {
        this.instance.aspect = this.sizes.width / this.sizes.height;
        this.instance.updateProjectionMatrix();
    }

    update() {
        this.controls.update();
    }
}
