import { _decorator, Component, Material, Vec3, Vec4 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('MaterialManager')
export class MaterialManager extends Component {
    private static _instance: MaterialManager = null;
    
    @property(Material)
    private groundMaterial: Material = null;

    public static get instance(): MaterialManager {
        return this._instance;
    }

    onLoad() {
        if (MaterialManager._instance === null) {
            MaterialManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    public updateHomePosition(position: Vec3) {
        if (this.groundMaterial) {
            // 更新 Shader 中的家园位置
            this.groundMaterial.setProperty('homePosition', new Vec4(position.x, position.y, position.z, 1.0));
        }
    }

    public setTransitionRadius(radius: number) {
        if (this.groundMaterial) {
            this.groundMaterial.setProperty('transitionRadius', radius);
        }
    }

    public setTransitionSoftness(softness: number) {
        if (this.groundMaterial) {
            this.groundMaterial.setProperty('transitionSoftness', softness);
        }
    }
}