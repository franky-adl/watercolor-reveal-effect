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
// During gallery transitions the same sim erases (spreads emptiness) or reveals from stamps.
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

        // Gallery dots easing in over time: { uv, born, duration, radius }.
        this.stamps = [];
        // When true, the brush follows neither pointer nor stamp (flood/dry only).
        this.locked = false;
        this.savedDry = null;

        this.setTargets();
        this.setMaterial();
    }

    // Smoothstep ease for stamp opacity 0 → 1.
    static ease(t) {
        const x = Math.min(Math.max(t, 0), 1);
        return x * x * (3 - 2 * x);
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
                uErase: { value: 0 },
                uFlow: { value: 0.01 },
                uBleed: { value: 0.015 },
                uDry: { value: 0.002 },
            },
        });
        this.quad = new FullScreenQuad(this.material);
    }

    // Write a constant into both ping-pong targets (e.g. 1 before a fade-out, 0 before a fade-in).
    fill(value) {
        const previousTarget = this.renderer.getRenderTarget();
        const previousClear = new THREE.Color();
        this.renderer.getClearColor(previousClear);
        const previousAlpha = this.renderer.getClearAlpha();

        // Color(r,g,b) takes 0..1 floats; a bare number would be read as a hex.
        this.renderer.setClearColor(new THREE.Color(value, value, value), 1);
        for (const target of [this.read, this.write]) {
            this.renderer.setRenderTarget(target);
            this.renderer.clear();
        }

        this.renderer.setClearColor(previousClear, previousAlpha);
        this.renderer.setRenderTarget(previousTarget);
    }

    setErase(erase) {
        this.material.uniforms.uErase.value = erase ? 1 : 0;
    }

    // Suppress pointer painting; optional dry override (fade-in should not dry away stamps).
    lock({ dry = null } = {}) {
        this.locked = true;
        this.stamps.length = 0;
        if (dry !== null) {
            if (this.savedDry === null) {
                this.savedDry = this.material.uniforms.uDry.value;
            }
            this.material.uniforms.uDry.value = dry;
        }
    }

    unlock() {
        this.locked = false;
        this.stamps.length = 0;
        this.setErase(false);
        if (this.savedDry !== null) {
            this.material.uniforms.uDry.value = this.savedDry;
            this.savedDry = null;
        }
    }

    // Start a circular stamp that eases strength 0 → 1 over `duration` seconds.
    stampAt(uv, { radius, duration } = {}) {
        this.stamps.push({
            uv: uv.clone(),
            born: null,
            duration: duration ?? 0.5,
            radius: radius ?? this.material.uniforms.uBrushRadius.value,
        });
    }

    // Deposit easing stamps without advancing flood/dry (flow runs in the step loop below).
    paintStamps(elapsed) {
        if (!this.stamps.length) return;

        const uniforms = this.material.uniforms;
        const previousTarget = this.renderer.getRenderTarget();
        const prevRadius = uniforms.uBrushRadius.value;
        const prevFlow = uniforms.uFlow.value;
        const prevDry = uniforms.uDry.value;

        uniforms.uFlow.value = 0;
        uniforms.uDry.value = 0;

        for (const stamp of this.stamps) {
            if (stamp.born === null) stamp.born = elapsed;
            const strength = Reveal.ease(
                (elapsed - stamp.born) / stamp.duration,
            );
            if (strength <= 0) continue;

            uniforms.uBrushRadius.value = stamp.radius;
            uniforms.uBrushFrom.value.copy(stamp.uv);
            uniforms.uBrushTo.value.copy(stamp.uv);
            uniforms.uBrushStrength.value = strength;
            uniforms.uPrev.value = this.read.texture;
            this.renderer.setRenderTarget(this.write);
            this.quad.render(this.renderer);
            [this.read, this.write] = [this.write, this.read];
        }

        uniforms.uBrushRadius.value = prevRadius;
        uniforms.uFlow.value = prevFlow;
        uniforms.uDry.value = prevDry;
        uniforms.uBrushStrength.value = 0;
        this.renderer.setRenderTarget(previousTarget);

        this.stamps = this.stamps.filter(
            (s) => s.born === null || elapsed < s.born + s.duration,
        );
    }

    update(elapsed, delta) {
        this.paintStamps(elapsed);

        this.accumulator = Math.min(
            this.accumulator + delta,
            STEP * MAX_STEPS_PER_FRAME,
        );
        if (this.accumulator < STEP) return;

        const uniforms = this.material.uniforms;
        const previousTarget = this.renderer.getRenderTarget();
        let pointerFrom = null;
        let pointerTo = null;
        let pointerStrength = 0;

        if (!this.locked) {
            const inside = this.pointer.inside;
            // on entering, start the stroke at the cursor rather than dragging it from where it left
            if (!this.wasInside) this.lastPointer.copy(this.pointer.uv);
            pointerFrom = this.lastPointer;
            pointerTo = this.pointer.uv;
            pointerStrength = inside ? 1 : 0;
        }

        let firstStep = true;
        while (this.accumulator >= STEP) {
            this.accumulator -= STEP;

            if (pointerFrom) {
                // pointer stroke is applied on the first step only, like before
                uniforms.uBrushFrom.value.copy(pointerFrom);
                uniforms.uBrushTo.value.copy(pointerTo);
                uniforms.uBrushStrength.value = firstStep ? pointerStrength : 0;
            } else {
                uniforms.uBrushStrength.value = 0;
            }

            uniforms.uPrev.value = this.read.texture;
            this.renderer.setRenderTarget(this.write);
            this.quad.render(this.renderer);
            [this.read, this.write] = [this.write, this.read];
            firstStep = false;
        }
        this.renderer.setRenderTarget(previousTarget);

        if (!this.locked) {
            this.lastPointer.copy(this.pointer.uv);
            this.wasInside = this.pointer.inside;
        }
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
