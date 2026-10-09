import Orchestrator from "../Orchestrator.js";
import sources from "../sources.js";

// Image names from the resource manifest, in gallery order.
const IMAGE_NAMES = sources
    .filter((s) => s.type === "texture" && s.name.startsWith("landscape"))
    .map((s) => s.name);

export default class Gallery {
    constructor(paper) {
        this.orc = new Orchestrator();
        this.resources = this.orc.resources;
        this.debug = this.orc.debug;
        this.paper = paper;
        this.reveal = paper.reveal;

        this.names = IMAGE_NAMES.length
            ? IMAGE_NAMES
            : Object.keys(this.resources.items);
        this.index = Math.max(0, this.names.indexOf("landscape1"));

        this.params = {
            duration: 2,
            overlap: 0.2,
            soft: 0.15,
            scale: 1.7,
            octaves: 4,
        };

        this.phase = "idle";
        this.pendingIndex = 0;
        this.pendingTexture = null;
        this.startedAt = 0;
        this.inStartedAt = null;

        this.setUI();
        this.setDebug();
    }

    setUI() {
        this.prevBtn = document.querySelector(".nav--prev");
        this.nextBtn = document.querySelector(".nav--next");
        this.prevBtn?.addEventListener("click", () => this.step(-1));
        this.nextBtn?.addEventListener("click", () => this.step(1));
        this.setNavEnabled(true);
    }

    setNavEnabled(enabled) {
        for (const btn of [this.prevBtn, this.nextBtn]) {
            if (!btn) continue;
            btn.disabled = !enabled;
            btn.setAttribute("aria-disabled", enabled ? "false" : "true");
        }
    }

    step(dir) {
        if (this.phase !== "idle" || this.names.length < 2) return;
        const next = (this.index + dir + this.names.length) % this.names.length;
        this.begin(next);
    }

    // Ease: faster at the ends, slower through the middle, without stalling (a < 1).
    ease(t) {
        const a = 0.55;
        return t + (a * Math.sin(2 * Math.PI * t)) / (2 * Math.PI);
    }

    begin(nextIndex) {
        const texture = this.resources.items[this.names[nextIndex]];
        if (!texture) return;

        this.phase = "transition";
        this.pendingIndex = nextIndex;
        this.pendingTexture = texture;
        this.startedAt = null;
        this.inStartedAt = null;
        this.setNavEnabled(false);

        // Freeze brush + drying; keep the colour mask until the outgoing layer is gone.
        this.reveal.lock({ dry: 0 });
        this.paper.setTransition({
            active: true,
            outT: 0,
            inT: -1,
            nextImage: texture,
            soft: this.params.soft,
            scale: this.params.scale,
            octaves: this.params.octaves,
            reseedOut: true,
        });
    }

    beginFadeIn(elapsed) {
        this.inStartedAt = elapsed;
        this.paper.setTransition({ inT: 0, reseedIn: true });
    }

    finish() {
        this.phase = "idle";
        this.index = this.pendingIndex;
        this.paper.setImage(this.pendingTexture);
        this.pendingTexture = null;
        this.paper.setTransition({ active: false, outT: 0, inT: -1 });
        this.reveal.fill(0);
        this.reveal.unlock();
        this.setNavEnabled(true);
    }

    update(elapsed) {
        if (this.phase !== "transition") return;

        if (this.startedAt === null) this.startedAt = elapsed;

        const duration = Math.max(this.params.duration, 1e-4);
        const overlap = Math.min(Math.max(this.params.overlap, 0), 1);
        const outLinear = Math.min((elapsed - this.startedAt) / duration, 1);

        // Fade-in starts at (1 - overlap) of the fade-out phase.
        if (this.inStartedAt === null && outLinear >= 1 - overlap) {
            this.beginFadeIn(elapsed);
        }

        let inLinear = -1;
        if (this.inStartedAt !== null) {
            inLinear = Math.min((elapsed - this.inStartedAt) / duration, 1);
        }

        this.paper.setTransitionProgress(
            this.ease(outLinear),
            inLinear < 0 ? -1 : this.ease(inLinear),
        );

        if (outLinear >= 1 && inLinear >= 1) this.finish();
    }

    setDebug() {
        if (!this.debug.active) return;
        this.debugFolder = this.debug.ui.addFolder("gallery");
        this.debugFolder
            .add(this.params, "duration", 0.2, 4, 0.05)
            .name("duration");
        this.debugFolder
            .add(this.params, "overlap", 0, 1, 0.01)
            .name("overlap");
        this.debugFolder
            .add(this.params, "soft", 0.01, 0.8, 0.01)
            .name("softness");
        this.debugFolder
            .add(this.params, "scale", 0.5, 12, 0.1)
            .name("noise scale");
        this.debugFolder.add(this.params, "octaves", 1, 6, 1).name("octaves");
    }
}
