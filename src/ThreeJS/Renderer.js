import * as THREE from "three";
import Orchestrator from "./Orchestrator.js";

export default class Renderer {
    constructor() {
        this.orc = new Orchestrator();
        this.canvas = this.orc.canvas;
        this.sizes = this.orc.sizes;
        this.scene = this.orc.scene;
        this.camera = this.orc.camera;

        this.setInstance();
    }

    setInstance() {
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        });
        this.instance.setClearColor("#211d20");
        this.instance.setSize(this.sizes.width, this.sizes.height);
        this.instance.setPixelRatio(this.sizes.pixelRatio);
    }

    resize() {
        this.instance.setSize(this.sizes.width, this.sizes.height);
        this.instance.setPixelRatio(this.sizes.pixelRatio);
    }

    update() {
        this.instance.render(this.scene, this.camera.instance);
    }
}
