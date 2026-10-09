import Orchestrator from "../Orchestrator.js";
import Paper from "./Paper.js";
import Gallery from "./Gallery.js";

export default class Stage {
    constructor() {
        this.orc = new Orchestrator();
        this.scene = this.orc.scene;

        this.resources = this.orc.resources;
        // Wait for resources
        this.orc.emitter.on("ready", () => {
            this.paper = new Paper();
            this.gallery = new Gallery(this.paper);
        });
    }

    // called after the renderer has been resized
    resize() {
        this.paper?.resize();
    }

    // both time params are measured in seconds
    update(elapsed, delta) {
        // gallery dissolve uniforms update before the reveal sim steps
        this.gallery?.update(elapsed);
        this.paper?.update(elapsed, delta);
    }
}
