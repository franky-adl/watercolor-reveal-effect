import * as THREE from "three";
import Orchestrator from "../Orchestrator.js";

export default class Resources {
    constructor(sources) {
        this.orc = new Orchestrator();
        this.emitter = this.orc.emitter;
        this.sources = sources;

        this.items = {};
        this.toLoad = this.sources.length;
        this.loaded = 0;

        this.loader = new THREE.TextureLoader();
        this.startLoading();
    }

    startLoading() {
        // Nothing to load: still announce "ready", deferred so listeners registered
        // later in the Orchestrator constructor (e.g. Stage) receive it
        if (this.toLoad === 0) {
            queueMicrotask(() => this.emitter.emit("ready"));
            return;
        }

        for (const source of this.sources) {
            this.loader.load(source.path, (file) => {
                file.colorSpace = source.colorSpace || THREE.SRGBColorSpace;
                if (source.flipY !== undefined) {
                    file.flipY = source.flipY;
                }
                this.sourceLoaded(source, file);
            });
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
