import * as THREE from "three";
import GUI from "lil-gui";

export default class Debug {
    constructor() {
        this.active =
            window.location.hash === "#debug" ||
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1";

        if (this.active) {
            this.ui = new GUI();
        }
    }

    // Browser color pickers are sRGB; Three.js stores colors in linear-sRGB.
    // https://github.com/georgealways/lil-gui/issues/117
    addColor(folder, threeColor, property, onChange) {
        const params = {
            [property]: threeColor.getHex(THREE.SRGBColorSpace),
        };

        return folder.addColor(params, property).onChange((value) => {
            threeColor.setHex(value, THREE.SRGBColorSpace);
            onChange?.(value);
        });
    }
}
