import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import Orchestrator from "../Orchestrator.js";
import Reveal from "./Reveal.js";
import sources from "../sources.js";

import fullscreenVertexShader from "../Shaders/Paper/fullscreen.vert";
import fieldFragmentShader from "../Shaders/Paper/field.frag";
import lightFragmentShader from "../Shaders/Paper/light.frag";
import displayFragmentShader from "../Shaders/Paper/display.frag";

// paper features are drawn for a canvas this many pixels tall, so the grain looks the same at any size
const PAPER_UNITS = 1100;
// painting height as a fraction of the viewport height
const IMAGE_HEIGHT = 0.9;

const SHADOW_OVERLAYS = sources.filter(
    (s) => s.type === "texture" && s.name.startsWith("shadowOverlay"),
);

// Cold press: medium tooth, natural white — the all-round watercolour sheet.
const PAPER = {
    tint: "#fafcf3",
    fleck: "#8a8070",
    bump: 0.45,
    mottle: 0.0,
};

export default class Paper {
    constructor() {
        this.orc = new Orchestrator();
        this.scene = this.orc.scene;
        this.renderer = this.orc.renderer.instance;
        this.debug = this.orc.debug;
        this.resources = this.orc.resources;

        this.image = this.resources.items.landscape1;
        this.seed = Math.random();
        this.size = new THREE.Vector2();
        this.reveal = new Reveal();

        this.shadowParams = {
            useShadow: false,
            overlay: "shadowOverlay7",
        };
        this.shadowOverlayEl = document.querySelector(".shadow-overlay");

        this.setTargets();
        this.setMaterials();
        this.setMesh();
        this.applyShadowOverlay();
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
                uPaperTint: { value: new THREE.Color(PAPER.tint) },
                uFleckTint: { value: new THREE.Color(PAPER.fleck) },
                uMottle: { value: PAPER.mottle },
                uTexture: { value: 1 },
                uImage: { value: this.image },
                uImageNext: { value: this.image },
                uImageScale: { value: new THREE.Vector2(1, 1) },
                uImageScaleNext: { value: new THREE.Vector2(1, 1) },
                uImageWhite: { value: 0.92 },
                uDensity: { value: 1 },
                uGreyIntensity: { value: 0.4 },
                uGranulation: { value: 0.2 },
                uRevealMask: { value: this.reveal.texture },
                uRevealFeather: { value: 0.35 },
                uSeed: { value: Math.random() },
                uSeedIn: { value: Math.random() },
                uTransition: { value: 0 },
                uTransitionOutT: { value: 0 },
                uTransitionInT: { value: -1 },
                uTransitionSoft: { value: 0.15 },
                uTransitionScale: { value: 3.0 },
                uTransitionOctaves: { value: 4 },
                uUseShadow: { value: this.shadowParams.useShadow ? 1 : 0 },
            },
            depthWrite: false,
        });
    }

    applyShadowOverlay() {
        const { useShadow, overlay } = this.shadowParams;
        this.displayMaterial.uniforms.uUseShadow.value = useShadow ? 1 : 0;

        if (!this.shadowOverlayEl) return;
        this.shadowOverlayEl.style.display = useShadow ? "" : "none";

        const source = SHADOW_OVERLAYS.find((s) => s.name === overlay);
        if (source) this.shadowOverlayEl.src = `/${source.path}`;
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

        const light = this.lightMaterial.uniforms;
        light.uTexel.value.set(1 / this.size.x, 1 / this.size.y);
        // the relief is drawn in paper units, so its slope per texel shrinks as texels get smaller
        light.uBump.value = (PAPER.bump * 1.4) / scale;

        this.placeImage();

        const previousTarget = this.renderer.getRenderTarget();
        this.renderer.setRenderTarget(this.fieldTarget);
        this.fieldQuad.render(this.renderer);
        this.renderer.setRenderTarget(this.paperTarget);
        this.lightQuad.render(this.renderer);
        this.renderer.setRenderTarget(previousTarget);
    }

    // Painting size in screen uv at IMAGE_HEIGHT, keeping aspect.
    imageScaleFor(texture) {
        const { width, height } = texture.image;
        const imageAspect = width / height;
        const viewAspect = this.size.x / this.size.y;
        return new THREE.Vector2(
            (IMAGE_HEIGHT * imageAspect) / viewAspect,
            IMAGE_HEIGHT,
        );
    }

    placeImage() {
        this.displayMaterial.uniforms.uImageScale.value.copy(
            this.imageScaleFor(this.image),
        );
    }

    update(elapsed, delta) {
        this.reveal.update(elapsed, delta);
        this.displayMaterial.uniforms.uRevealMask.value = this.reveal.texture;
    }

    setImage(texture) {
        if (!texture || texture === this.image) return;
        this.image = texture;
        this.displayMaterial.uniforms.uImage.value = texture;
        this.placeImage();
    }

    // Gallery dissolve: outgoing + optional incoming (overlap) over gfbm.
    setTransition({
        active,
        outT,
        inT,
        nextImage,
        soft,
        scale,
        octaves,
        reseedOut = false,
        reseedIn = false,
    } = {}) {
        const u = this.displayMaterial.uniforms;
        if (active !== undefined) u.uTransition.value = active ? 1 : 0;
        if (outT !== undefined) u.uTransitionOutT.value = outT;
        if (inT !== undefined) u.uTransitionInT.value = inT;
        if (nextImage) {
            u.uImageNext.value = nextImage;
            u.uImageScaleNext.value.copy(this.imageScaleFor(nextImage));
        }
        if (soft !== undefined) u.uTransitionSoft.value = soft;
        if (scale !== undefined) u.uTransitionScale.value = scale;
        if (octaves !== undefined) u.uTransitionOctaves.value = octaves;
        if (reseedOut) u.uSeed.value = Math.random();
        if (reseedIn) u.uSeedIn.value = Math.random();
    }

    setTransitionProgress(outT, inT) {
        const u = this.displayMaterial.uniforms;
        u.uTransitionOutT.value = outT;
        u.uTransitionInT.value = inT;
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
            const display = this.displayMaterial.uniforms;
            const imageFolder = this.debug.ui.addFolder("image");
            imageFolder
                .add(display.uDensity, "value", 0, 3, 0.01)
                .name("color density");
            imageFolder
                .add(display.uGreyIntensity, "value", 0, 3, 0.01)
                .name("greytone");
            imageFolder
                .add(display.uGranulation, "value", 0, 5, 0.01)
                .name("granulation");
            imageFolder
                .add(display.uImageWhite, "value", 0.5, 1, 0.001)
                .name("white point");

            const shadowFolder = this.debug.ui.addFolder("shadow");
            shadowFolder
                .add(this.shadowParams, "useShadow")
                .name("useShadow")
                .onChange(() => this.applyShadowOverlay());
            if (SHADOW_OVERLAYS.length) {
                shadowFolder
                    .add(
                        this.shadowParams,
                        "overlay",
                        SHADOW_OVERLAYS.map((s) => s.name),
                    )
                    .name("overlay")
                    .onChange(() => this.applyShadowOverlay());
            }

            this.reveal.setDebug();
            this.reveal.debugFolder
                .add(display.uRevealFeather, "value", 0.01, 1, 0.01)
                .name("edge feather");
        }
    }
}
