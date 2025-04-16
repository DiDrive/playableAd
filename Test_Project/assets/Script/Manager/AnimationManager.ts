import { _decorator, Component, Node, animation, AnimationComponent, AnimationClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AnimationManager')
export class AnimationManager extends Component {
    private static _instance: AnimationManager = null;
    
    public static get instance(): AnimationManager {
        return this._instance;
    }
    
    onLoad() {
        if (AnimationManager._instance === null) {
            AnimationManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    public playCharacterAnimation(playerNode: Node, animName: string) {
        const model_1 = playerNode.getChildByName('player_model');
        const model = model_1.getChildByName('model');
        if (!model) return;
        
        const animComp = model.getComponent(AnimationComponent);
        if (!animComp) return;

        switch (animName) {
            case 'idle':
                if (!animComp.getState('CharacterArmature|Idle')?.isPlaying) {
                    const state = animComp.getState('CharacterArmature|Idle');
                    if (state) {
                        state.wrapMode = AnimationClip.WrapMode.Loop;
                        animComp.play('CharacterArmature|Idle');
                    }
                }
                break;
            case 'walk':
                if (!animComp.getState('CharacterArmature|Walk')?.isPlaying) {
                    const state = animComp.getState('CharacterArmature|Walk');
                    if (state) {
                        state.wrapMode = AnimationClip.WrapMode.Loop;
                        state.duration = 1.0;
                        animComp.play('CharacterArmature|Walk');
                    }
                }
                break;
            case 'attack':
                animComp.stop();
                const state = animComp.getState('CharacterArmature|SwordSlash');
                if (state) {
                    state.speed = 1.5;
                    state.wrapMode = AnimationClip.WrapMode.Normal;
                    state.on('finished', () => {
                        animComp.play('CharacterArmature|Idle');
                    }, this);
                    animComp.play('CharacterArmature|SwordSlash');
                }
                break;
        }
    }

    public stopAllAnimations(playerNode: Node) {
        const model_1 = playerNode.getChildByName('player_model');
        const model = model_1.getChildByName('model');
        if (!model) return;
        
        const animComp = model.getComponent(AnimationComponent);
        if (!animComp) return;

        animComp.stop();
    }
}