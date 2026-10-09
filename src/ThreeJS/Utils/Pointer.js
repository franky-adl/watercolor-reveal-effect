import * as THREE from "three";
import Orchestrator from "../Orchestrator.js";

// Tracks the cursor over the page in screen uv (0..1, origin bottom-left, like vUv).
export default class Pointer {
    constructor() {
        this.orc = new Orchestrator();
        this.sizes = this.orc.sizes;

        this.uv = new THREE.Vector2(0.5, 0.5);
        this.inside = false;

        window.addEventListener("pointermove", (event) => {
            this.uv.set(
                event.clientX / this.sizes.width,
                1 - event.clientY / this.sizes.height,
            );
            this.inside = true;
        });

        const leave = () => {
            this.inside = false;
        };
        document.documentElement.addEventListener("pointerleave", leave);
        window.addEventListener("blur", leave);
    }
}
