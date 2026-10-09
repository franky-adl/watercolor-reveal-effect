import Orchestrator from "../Orchestrator.js";

export default class Sizes {
    constructor() {
        this.orc = new Orchestrator();
        this.emitter = this.orc.emitter;
        // Consider capping at 1.5 for performance reasons
        this.maxPixelRatio = 2;

        // Setup
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.pixelRatio = Math.min(window.devicePixelRatio, this.maxPixelRatio);

        // Resize event
        window.addEventListener("resize", () => {
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.pixelRatio = Math.min(
                window.devicePixelRatio,
                this.maxPixelRatio,
            );

            this.emitter.emit("resize");
        });
    }
}
