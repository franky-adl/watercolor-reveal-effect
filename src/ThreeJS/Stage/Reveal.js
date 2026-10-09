import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import Orchestrator from "../Orchestrator.js";

import fullscreenVertexShader from "../Shaders/Paper/fullscreen.vert";
import revealFragmentShader from "../Shaders/Paper/reveal.frag";

// the mask is smooth, so it is simulated below screen resolution
const RESOLUTION_SCALE = 0.5;
// the flood spreads a fixed distance per step, so steps run at a fixed rate whatever the refresh rate
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 4;

// The watercolour colour-reveal mask: the cursor paints into it, the paint blooms outwards
// and dries back to grey. Ping-pongs between two targets, one read while the other is written.
export default class Reveal {
    constructor() {
        this.orc = new Orchestrator();
        this.renderer = this.orc.renderer.instance;
        this.debug = this.orc.debug;
        this.pointer = this.orc.pointer;

        this.size = new THREE.Vector2();
        this.lastPointer = new THREE.Vector2();
        this.wasInside = false;
        this.accumulator = 0;

        this.setTargets();
        this.setMaterial();
    }

    get texture() {
        return this.read.texture;
    }

    setTargets() {
        this.renderer.getDrawingBufferSize(this.size);
        this.size.multiplyScalar(RESOLUTION_SCALE).floor();

        const options = {
            format: THREE.RedFormat,
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            depthBuffer: false,
        };
        this.read = new THREE.WebGLRenderTarget(
            this.size.x,
            this.size.y,
            options,
        );
        this.write = new THREE.WebGLRenderTarget(
            this.size.x,
            this.size.y,
            options,
        );
    }

    setMaterial() {
        this.material = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: fullscreenVertexShader,
            fragmentShader: revealFragmentShader,
            uniforms: {
                uPrev: { value: null },
                uSeed: { value: Math.random() },
                uAspect: { value: this.size.x / this.size.y },
                uBrushFrom: { value: new THREE.Vector2() },
                uBrushTo: { value: new THREE.Vector2() },
                uBrushRadius: { value: 0.1 },
                uBrushSoftness: { value: 0.5 },
                uBrushStrength: { value: 0 },
                uFlow: { value: 0.01 },
                uBleed: { value: 0.015 },
                uDry: { value: 0.002 },
            },
        });
        this.quad = new FullScreenQuad(this.material);
    }

    update(elapsed, delta) {
        this.accumulator = Math.min(
            this.accumulator + delta,
            STEP * MAX_STEPS_PER_FRAME,
        );
        if (this.accumulator < STEP) return;

        const uniforms = this.material.uniforms;
        const inside = this.pointer.inside;
        // on entering, start the stroke at the cursor rather than dragging it from where it left
        if (!this.wasInside) this.lastPointer.copy(this.pointer.uv);
        uniforms.uBrushFrom.value.copy(this.lastPointer);
        uniforms.uBrushTo.value.copy(this.pointer.uv);
        uniforms.uBrushStrength.value = inside ? 1 : 0;

        const previousTarget = this.renderer.getRenderTarget();
        while (this.accumulator >= STEP) {
            this.accumulator -= STEP;
            uniforms.uPrev.value = this.read.texture;
            this.renderer.setRenderTarget(this.write);
            this.quad.render(this.renderer);
            [this.read, this.write] = [this.write, this.read];
        }
        this.renderer.setRenderTarget(previousTarget);

        this.lastPointer.copy(this.pointer.uv);
        this.wasInside = inside;
    }

    resize() {
        this.renderer.getDrawingBufferSize(this.size);
        this.size.multiplyScalar(RESOLUTION_SCALE).floor();
        this.read.setSize(this.size.x, this.size.y);
        this.write.setSize(this.size.x, this.size.y);
        this.material.uniforms.uAspect.value = this.size.x / this.size.y;
    }

    // called by Paper, so the folder sits after the paper's own
    setDebug() {
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder("reveal");
            const uniforms = this.material.uniforms;
            this.debugFolder
                .add(uniforms.uBrushRadius, "value", 0.005, 0.3, 0.001)
                .name("radius");
            this.debugFolder
                .add(uniforms.uBrushSoftness, "value", 0, 1, 0.01)
                .name("softness");
            this.debugFolder
                .add(uniforms.uFlow, "value", 0, 0.02, 0.0001)
                .name("flow");
            this.debugFolder
                .add(uniforms.uBleed, "value", 0.001, 0.1, 0.001)
                .name("bleed falloff");
            this.debugFolder
                .add(uniforms.uDry, "value", 0, 0.02, 0.0001)
                .name("drying");
        }
    }
}
