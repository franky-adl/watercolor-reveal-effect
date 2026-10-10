import * as THREE from "three";
import mitt from "mitt";
import Stats from "stats-gl";

import Debug from "./Utils/Debug.js";
import Sizes from "./Utils/Sizes.js";
import Pointer from "./Utils/Pointer.js";
import Camera from "./Camera.js";
import Renderer from "./Renderer.js";
import Stage from "./Stage/Stage.js";
import Resources from "./Utils/Resources.js";

import sources from "./sources.js";

let instance = null;

export default class Orchestrator {
    constructor(_canvas) {
        // Singleton
        if (instance) {
            return instance;
        }
        instance = this;

        // event emitter
        this.emitter = mitt();

        // Options
        this.canvas = _canvas;

        // Setup
        this.debug = new Debug();
        this.sizes = new Sizes();
        this.pointer = new Pointer();
        this.clock = new THREE.Timer();
        // this makes use of the Page Visibility API to avoid large time delta values when the app is inactive (e.g. tab switched or browser hidden).
        this.clock.connect(document);
        this.scene = new THREE.Scene();
        this.resources = new Resources(sources);
        this.camera = new Camera();
        this.renderer = new Renderer();

        // The main stage of the threejs experience,
        // where the bulk of your scene objects and logic will live.
        this.stage = new Stage();

        // Stats
        if (this.debug.active) {
            this.stats = new Stats({ trackGPU: true });
            this.stats.dom.style.left = "0px";
            this.stats.dom.style.top = "0px";
            document.body.appendChild(this.stats.dom);
            void this.stats.init(this.renderer.instance);
        }

        // Resize event
        this.emitter.on("resize", () => {
            this.resize();
        });

        // Setup the animation loop
        // Always define the animation loop with this method and not manually with requestAnimationFrame() for best compatibility.
        // Arrow function has lexical scoping of "this" and will always refer to the Orchestrator class instance.
        this.renderer.instance.setAnimationLoop(() => this.animate());
    }

    resize() {
        this.camera.resize();
        this.renderer.resize();
        this.stage.resize();
    }

    animate() {
        this.clock.update();

        // get the time delta and elapsed time in seconds
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsed();

        this.update(elapsed, delta);
    }

    update(elapsed, delta) {
        this.stage.update(elapsed, delta);
        // Important as this calls the renderer's render() method to actually put pixels on the screen.
        this.renderer.update();

        if (this.debug.active) this.stats.update();
    }

    destroy() {
        this.clock.disconnect();
        this.clock.dispose();
        this.emitter.off("resize");

        // Traverse the whole scene
        this.scene.traverse((child) => {
            // Test if it's a mesh
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();

                // Loop through the material properties
                for (const key in child.material) {
                    const value = child.material[key];

                    // Test if there is a dispose function
                    if (value && typeof value.dispose === "function") {
                        value.dispose();
                    }
                }
            }
        });

        this.renderer.instance.dispose();

        if (this.debug.active) {
            this.stats.dispose();
            this.debug.ui.destroy();
        }
    }
}
