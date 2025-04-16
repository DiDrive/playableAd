import { _decorator, Component, Node, ParticleSystem, Prefab, instantiate, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('EffectManager')
export class EffectManager extends Component {
    private static _instance: EffectManager = null;
    
    @property({ type: Prefab })
    private iceBreakEffect: Prefab = null;
    
    @property({ type: Prefab })
    private collectEffect: Prefab = null;
    
    @property({ type: Prefab })
    private deliveryEffect: Prefab = null;
    
    @property({ type: Prefab })
    private vehicleChangeEffect: Prefab = null;

    @property({ type: Prefab })
    private houseAppearEffect: Prefab = null; 
    
    public static get instance(): EffectManager {
        return this._instance;
    }
    
    onLoad() {
        if (EffectManager._instance === null) {
            EffectManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    private getParticleSystem(node: Node): ParticleSystem[] {   //

        const systems:ParticleSystem[] =[];
        const particleSystem = node.getComponent(ParticleSystem);
        if (particleSystem) {
            systems.push(particleSystem);
        }
        node.children.forEach(child=>{
            systems.push(...this.getParticleSystem(child));
        });
        return systems;
    }
    
    public playEffect(effectName: string, position: Vec3, targetPosition?: Vec3, scale: number = 1) {
        let prefab: Prefab = null;
        let isLooping = false;
        
        switch (effectName) {
            case 'house_appear':
                prefab = this.houseAppearEffect;
                break;
            case 'ice_break':
                prefab = this.iceBreakEffect;
                break;
            case 'collect':
                prefab = this.collectEffect;
                break;
            case 'resource_delivery':
                prefab = this.deliveryEffect;
                break;
            case 'vehicle_change':
                prefab = this.vehicleChangeEffect;
                break;
            default:
                console.warn(`Effect ${effectName} not found`);
                return;
        }
        
        if (prefab) {
            const effect = instantiate(prefab);
            effect.position = position.clone();
            effect.setScale(scale, scale, scale);
            this.node.addChild(effect);
            
            // 如果是资源投递效果，需要从起点移动到终点
            if (effectName === 'resource_delivery' && targetPosition) {
                this.playDeliveryAnimation(effect, position, targetPosition);
            } else {
                const particleSystems = this.getParticleSystem(effect);
                if (particleSystems.length>0) {

                    if (isLooping) {
                        particleSystems.forEach(particleSystem => {
                            particleSystem.loop = true;
                            particleSystem.duration = -1;
                            particleSystem.startLifetime.constant = 1;
                            particleSystem.playOnAwake = true;
                            particleSystem.simulationSpace = 1;
                            particleSystem.prewarm = true;
                            particleSystem.clear();
                            particleSystem.play();
                        });
                        return effect;
                    }
                    else{
                        let maxDuration = 10;
                        particleSystems.forEach(particleSystem => {
                            particleSystem.loop = false;
                            particleSystem.play();
                            const duration = particleSystem.duration + particleSystem.startLifetime.evaluate(0, 0);
                            maxDuration = Math.max(maxDuration, duration);
                        });
                        setTimeout(() => {
                            effect.destroy();
                        }, maxDuration * 1000);
                    }                   
                } else {
                    setTimeout(() => {
                        effect.destroy();
                    }, 3000);
                }
            }
        }
    }

    public stopEffect(effectNode: Node) {
        if (effectNode) {
            const particleSystem = effectNode.getComponent(ParticleSystem);
            if (particleSystem) {
                particleSystem.stop();
                setTimeout(() => {
                    effectNode.destroy();
                }, 1000); 
            } else {
                effectNode.destroy();
            }
        }
    }
    
    private playDeliveryAnimation(effectNode: Node, startPos: Vec3, endPos: Vec3) {
        // 创建一个从起点到终点的动画
        const duration = 1.0; // 1秒
        
        tween(effectNode)
            .to(duration, { position: endPos }, {
                easing: 'cubicOut',
                onComplete: () => {
                    // 到达终点后播放粒子效果
                    const particleSystem = effectNode.getComponent(ParticleSystem);
                    if (particleSystem) {
                        particleSystem.play();
                        
 
                        const particleDuration = particleSystem.duration + particleSystem.startLifetime.evaluate(0,0);
                        setTimeout(() => {
                            effectNode.destroy();
                        }, particleDuration * 1000);
                    } else {

                        setTimeout(() => {
                            effectNode.destroy();
                        }, 1000);
                    }
                }
            })
            .start();
    }
}