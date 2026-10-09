import Orchestrator from "../Orchestrator.js";
import Paper from "./Paper.js";

export default class Stage {
    constructor() {
        this.orc = new Orchestrator();
        this.scene = this.orc.scene;

        this.resources = this.orc.resources;
        // Wait for resources
        this.orc.emitter.on("ready", () => {
            this.paper = new Paper();
        });
    }

    // called after the renderer has been resized
    resize() {
        this.paper?.resize();
    }

    // both time params are measured in seconds
    update(elapsed, delta) {
        // call stage elements' update methods if necessary
    }
}
