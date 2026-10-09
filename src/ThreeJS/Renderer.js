import * as THREE from "three";
import Orchestrator from "./Orchestrator.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

export default class Renderer {
    constructor() {
        this.orc = new Orchestrator();
        this.canvas = this.orc.canvas;
        this.sizes = this.orc.sizes;
        this.scene = this.orc.scene;
        this.camera = this.orc.camera;

        // toggle to true if you want to use postprocessing effects
        this.usePostProcessing = false;

        this.setInstance();
        if (this.usePostProcessing) {
            this.setPostProcessing();
        }
    }

    setInstance() {
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
        });
        // Uncomment to use tone mapping
        // this.instance.toneMapping = THREE.ACESFilmicToneMapping;
        // this.instance.toneMappingExposure = 1.75;
        // Uncomment to enable shadows
        // this.instance.shadowMap.enabled = true
        // this.instance.shadowMap.type = THREE.PCFShadowMap
        this.instance.setClearColor("#211d20");
        this.instance.setSize(this.sizes.width, this.sizes.height);
        this.instance.setPixelRatio(this.sizes.pixelRatio);
    }

    setPostProcessing() {
        this.composer = new EffectComposer(this.instance);
        this.renderPass = new RenderPass(this.scene, this.camera.instance);
        this.outputPass = new OutputPass();

        this.composer.addPass(this.renderPass);
        // Add the passes you want to use here, before the outputPass
        this.composer.addPass(this.outputPass);
    }

    resize() {
        this.instance.setSize(this.sizes.width, this.sizes.height);
        this.instance.setPixelRatio(this.sizes.pixelRatio);

        if (this.usePostProcessing) {
            this.composer.setSize(this.sizes.width, this.sizes.height);
            this.composer.setPixelRatio(this.sizes.pixelRatio);
        }
    }

    update() {
        if (this.usePostProcessing) {
            this.composer.render();
        } else {
            this.instance.render(this.scene, this.camera.instance);
        }
    }
}
