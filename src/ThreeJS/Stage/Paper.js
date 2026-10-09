import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import Orchestrator from "../Orchestrator.js";
import { PAPERS, DEFAULT_PAPER } from "./papers.js";
import Reveal from "./Reveal.js";

import fullscreenVertexShader from "../Shaders/Paper/fullscreen.vert";
import fieldFragmentShader from "../Shaders/Paper/field.frag";
import lightFragmentShader from "../Shaders/Paper/light.frag";
import displayFragmentShader from "../Shaders/Paper/display.frag";

// paper features are drawn for a canvas this many pixels tall, so the grain looks the same at any size
const PAPER_UNITS = 1100;
// painting height as a fraction of the viewport height
const IMAGE_HEIGHT = 0.8;

export default class Paper {
    constructor() {
        this.orc = new Orchestrator();
        this.scene = this.orc.scene;
        this.renderer = this.orc.renderer.instance;
        this.debug = this.orc.debug;
        this.resources = this.orc.resources;

        this.preset = DEFAULT_PAPER;
        this.params = {
            paper: this.preset.id,
        };
        this.image = this.resources.items.demo1;
        this.seed = Math.random();
        this.size = new THREE.Vector2();
        this.reveal = new Reveal();

        this.setTargets();
        this.setMaterials();
        this.setMesh();
        this.setDebug();
        this.generate();
    }

    // Two offscreen passes build the paper texture once per paper/size change:
    // the procedural field (height, mottle, fleck), then the lit relief packed for display.
    setTargets() {
        this.renderer.getDrawingBufferSize(this.size);

        this.fieldTarget = new THREE.WebGLRenderTarget(
            this.size.x,
            this.size.y,
            {
                type: THREE.HalfFloatType,
                minFilter: THREE.NearestFilter,
                magFilter: THREE.NearestFilter,
                depthBuffer: false,
            },
        );
        this.paperTarget = new THREE.WebGLRenderTarget(
            this.size.x,
            this.size.y,
            {
                depthBuffer: false,
            },
        );
    }

    setMaterials() {
        this.fieldMaterial = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: fullscreenVertexShader,
            fragmentShader: fieldFragmentShader,
            uniforms: {
                uRes: { value: new THREE.Vector2() },
                uScale: { value: 1 },
                uSeed: { value: this.seed },
                uKind: { value: this.preset.kind },
            },
        });
        this.fieldQuad = new FullScreenQuad(this.fieldMaterial);

        this.lightMaterial = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: fullscreenVertexShader,
            fragmentShader: lightFragmentShader,
            uniforms: {
                uField: { value: this.fieldTarget.texture },
                uTexel: { value: new THREE.Vector2() },
                uBump: { value: 1 },
            },
        });
        this.lightQuad = new FullScreenQuad(this.lightMaterial);

        // THREE.Color converts the sRGB hex tints to linear, as the display shader expects
        this.displayMaterial = new THREE.RawShaderMaterial({
            glslVersion: THREE.GLSL3,
            vertexShader: fullscreenVertexShader,
            fragmentShader: displayFragmentShader,
            uniforms: {
                uPaper: { value: this.paperTarget.texture },
                uPaperTint: { value: new THREE.Color(this.preset.tint) },
                uFleckTint: { value: new THREE.Color(this.preset.fleck) },
                uMottle: { value: this.preset.mottle },
                uTexture: { value: 1 },
                uImage: { value: this.image },
                uImageScale: { value: new THREE.Vector2(1, 1) },
                uImageWhite: { value: 0.92 },
                uDensity: { value: 1 },
                uGranulation: { value: 0.2 },
                uRevealMask: { value: this.reveal.texture },
                uRevealFeather: { value: 0.35 },
            },
            depthWrite: false,
        });
    }

    setMesh() {
        this.mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.displayMaterial,
        );
        // the vertex shader places the quad in clip space, ignoring the camera
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
    }

    generate() {
        const scale = PAPER_UNITS / this.size.y;

        const field = this.fieldMaterial.uniforms;
        field.uRes.value.copy(this.size);
        field.uScale.value = scale;
        field.uKind.value = this.preset.kind;

        const light = this.lightMaterial.uniforms;
        light.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
        // the relief is drawn in paper units, so its slope per texel shrinks as texels get smaller
        light.uBump.value = (this.preset.bump * 1.4) / scale;

        const display = this.displayMaterial.uniforms;
        display.uPaperTint.value.set(this.preset.tint);
        display.uFleckTint.value.set(this.preset.fleck);
        display.uMottle.value = this.preset.mottle;
        this.placeImage();

        const previousTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.fieldTarget);
        this.fieldQuad.render(this.renderer);
        this.renderer.setRenderTarget(this.paperTarget);
        this.lightQuad.render(this.renderer);
        this.renderer.setRenderTarget(previousTarget);
    }

    // Centre the painting at IMAGE_HEIGHT of the viewport, keeping its aspect.
    // uImageScale is the painting's size in screen uv.
    placeImage() {
        const { width, height } = this.image.image;
        const imageAspect = width / height;
        const viewAspect = this.size.x / this.size.y;
        this.displayMaterial.uniforms.uImageScale.value.set(
            (IMAGE_HEIGHT * imageAspect) / viewAspect,
            IMAGE_HEIGHT,
        );
    }

    update(elapsed, delta) {
        this.reveal.update(elapsed, delta);
        this.displayMaterial.uniforms.uRevealMask.value = this.reveal.texture;
    }

    setPaper(id) {
        const preset = PAPERS.find((p) => p.id === id);
        if (!preset || preset === this.preset) return;
        this.preset = preset;
        this.generate();
    }

    resize() {
        this.renderer.getDrawingBufferSize(this.size);
        this.fieldTarget.setSize(this.size.x, this.size.y);
        this.paperTarget.setSize(this.size.x, this.size.y);
        this.reveal.resize();
        this.generate();
    }

    setDebug() {
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder("paper");

            const options = Object.fromEntries(
                PAPERS.map((p) => [p.name, p.id]),
            );
            this.debugFolder
                .add(this.params, "paper", options)
                .name("type")
                .onChange((id) => {
                    this.setPaper(id);
                });

            const display = this.displayMaterial.uniforms;
            const imageFolder = this.debug.ui.addFolder("image");
            imageFolder
                .add(display.uDensity, "value", 0, 3, 0.01)
                .name("density");
            imageFolder
                .add(display.uGranulation, "value", 0, 5, 0.01)
                .name("granulation");
            imageFolder
                .add(display.uImageWhite, "value", 0.5, 1, 0.001)
                .name("white point");

            this.reveal.setDebug();
            this.reveal.debugFolder
                .add(display.uRevealFeather, "value", 0.01, 1, 0.01)
                .name("edge feather");
        }
    }
}
