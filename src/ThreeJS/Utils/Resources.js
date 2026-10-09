import * as THREE from "three";
import Orchestrator from "../Orchestrator.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";

export default class Resources {
    constructor(sources) {
        this.orc = new Orchestrator();
        this.emitter = this.orc.emitter;
        this.sources = sources;

        this.items = {};
        this.toLoad = this.sources.length;
        this.loaded = 0;

        this.setLoaders();
        this.startLoading();
    }

    setLoaders() {
        this.loaders = {};
        this.loaders.gltfLoader = new GLTFLoader();
        this.loaders.textureLoader = new THREE.TextureLoader();
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader();
        this.loaders.hdrLoader = new HDRLoader();
    }

    startLoading() {
        // Nothing to load: still announce "ready", deferred so listeners registered
        // later in the Orchestrator constructor (e.g. Stage) receive it
        if (this.toLoad === 0) {
            queueMicrotask(() => this.emitter.emit("ready"));
            return;
        }

        // Load each source
        for (const source of this.sources) {
            if (source.type === "gltfModel") {
                this.loaders.gltfLoader.load(source.path, (file) => {
                    this.sourceLoaded(source, file);
                });
            } else if (source.type === "texture") {
                this.loaders.textureLoader.load(source.path, (file) => {
                    file.colorSpace = source.colorSpace || THREE.SRGBColorSpace;
                    if (source.flipY !== undefined) {
                        file.flipY = source.flipY;
                    }
                    this.sourceLoaded(source, file);
                });
            } else if (source.type === "hdri") {
                this.loaders.hdrLoader.load(source.path, (file) => {
                    file.mapping =
                        source.mapping ||
                        THREE.EquirectangularReflectionMapping;
                    this.sourceLoaded(source, file);
                });
            } else if (source.type === "cubeTexture") {
                this.loaders.cubeTextureLoader.load(source.path, (file) => {
                    this.sourceLoaded(source, file);
                });
            }
        }
    }

    sourceLoaded(source, file) {
        this.items[source.name] = file;

        this.loaded++;

        if (this.loaded === this.toLoad) {
            this.emitter.emit("ready");
        }
    }
}
