import { _decorator, Component, Node, Vec3, EventTouch, input, Input,Enum,SystemEvent, Camera, RigidBody, tween, Material, MeshRenderer, SkinnedMeshRenderer } from 'cc';
import { GameManager } from '../Manager/GameManager';
import { AudioManager } from '../Manager/AudioManager';
import { EffectManager } from '../Manager/EffectManager';
import { ResourceManager } from '../Manager/ResourceManager';
import { UIManager } from '../Manager/UIManager';
import { ResourceType } from './IceBlock';
import { IceBlock } from './IceBlock';
import { VehicleType } from '../Manager/ModelManager';
import { ModelManager } from '../Manager/ModelManager';
import { UIType } from '../Common/UIConfig';
import { HUD } from './HUD';
import { PhysicsManager, CollisionEffectType } from '../Manager/PhysicsManager';
import { AnimationManager } from '../Manager/AnimationManager';
import { GuideUI } from './GuideUI';
import { HomePoint } from './HomePoint';
const { ccclass, property } = _decorator;



@ccclass('PlayerController')
export class PlayerController extends Component {
   

    @property({type: Camera})
    private mainCamera: Camera = null;

    @property({type: Material})
    private frozenMaterial: Material = null;

    @property({type: Material})
    private initialplayer_frozenMaterial: Material = null;

    private originalMaterials: Map<MeshRenderer | SkinnedMeshRenderer, Material[] | Material> = new Map();

    @property({type:Number})
    private maxTemperature: number = 100;  // 最大温度

    @property({type:Number})
    private temperatureDecreaseRate: number = 3;  // 温度下降速度
    
    @property({type: [Node]})
    private vehicleModels: Node[] = [];  // 所有车辆模型节点

    @property({type: [Node]})
    private resourceContainers: Node[] = [];  // 每个模型对应的资源容器节点

    @property({type: [Number]})
    private vehicleSpeeds: number[] = [];    // 不同车辆的速度

    @property({type: Enum(VehicleType),tooltip: "当前车辆类型"})
    private currentVehicleIndex: VehicleType = VehicleType.Initial;  

    private currentTemperature: number = 100;  // 当前温度

    private isDragging: boolean = false;    // 是否正在拖拽

    private targetPosition: Vec3 = new Vec3(); // 目标位置

    private resources: Node[] = []; // 收集到的资源

    private resourceCount: number = 0; // 收集到的资源数量

    private homeRadius: number = 5.8;    // 房子解冻半径

    private rigidBody:RigidBody = null;

    private isDeliveringResources: boolean = false;     // 是否正在投送资源

    private resourceContainer: Node = null; // 当前资源容器

    onLoad(){
        this.registerTouchEvents();
        this.currentTemperature = this.maxTemperature;
        this.rigidBody = this.getComponent(RigidBody);
        if (this.rigidBody) {
            this.rigidBody.linearFactor = new Vec3(1, 0, 1);
            this.rigidBody.angularFactor = new Vec3(0, 1, 0);
            // 开启连续碰撞检测
            this.rigidBody.useCCD = true;
            console.log("Player RigidBody group:", this.rigidBody.group);
        }
        
        // const collider = this.node.getComponent(Collider);
        // if (collider) {
        //     collider.on('onCollisionEnter', this.onCollisionEnter, this);
        //     console.log("碰撞器注册成功");
        // } else {
        //     console.warn("No collider component found on player!");
        // }

        this.vehicleModels.forEach((model, index) => {
            model.active = index === this.currentVehicleIndex;
        });
        this.resourceContainers.forEach((container, index) => {
            container.active = index === this.currentVehicleIndex;
        });
        
        // 更新当前资源容器引用
        this.resourceContainer = this.resourceContainers[this.currentVehicleIndex];
    }

    onDestroy() {
        this.unregisterTouchEvents();
        // const collider = this.getComponent(Collider);
        // if (collider) {
        //     collider.off('onCollisionEnter', this.onCollisionEnter, this);
        // }
    }

    async start() {
        // 等待UI系统初始化
        await this.waitForUIManager();
    }

    private waitForUIManager(): Promise<void> {
        return new Promise((resolve) => {
            const checkUIManager = () => {
                if (UIManager.instance) {
                    resolve();
                } else {
                    setTimeout(checkUIManager, 100);
                }
            };
            checkUIManager();
        });
    }

    update(dt: number) {
        this.movePlayer(dt);
        this.decreaseTemperature(dt);
        this.checkCustomCollisions();
        this.checkAutoDeliverToHome(); 
    }

    // 自动归位、投递
    private checkAutoDeliverToHome() {
        const gamemanager = GameManager.instance;
        if (
            this.resourceCount >= gamemanager.targetResourceAmount-gamemanager.curentResourceAmount &&
            this.isNearHome() &&
            !this.isDeliveringResources &&
            !gamemanager.isgameover
        ) {
            const homePointNode = gamemanager.homePointNode;
            const homePoint = homePointNode.getComponent(HomePoint);
            if (homePoint && homePoint.deliveryPositionNode) {
                const worldDeliveryPos = new Vec3();
                homePoint.deliveryPositionNode.getWorldPosition(worldDeliveryPos);
                this.enabled = false;
                this.stopAllMovement();
    
                tween(this.node)
                    .to(0.5, { worldPosition: worldDeliveryPos })
                    .call(() => {
                        const homeWorldPos = new Vec3();
                        homePointNode.getWorldPosition(homeWorldPos);
                        const playerPos = this.node.worldPosition;
                        const dir = new Vec3(homeWorldPos.x - playerPos.x, 0, homeWorldPos.z - playerPos.z);
                        if (dir.lengthSqr() > 0.0001) {
                            dir.normalize();
                            // 计算y轴旋转角度
                            const angle = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
                            this.node.setRotationFromEuler(0, angle+180, 0);
                        }
                        this.deliverResourcesToHome();
                    })
                    .start();
            }
        }
    }

    private registerTouchEvents() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unregisterTouchEvents() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);  
    }

    private onTouchStart(event: EventTouch) {
        const guideUI = UIManager.instance.getUI<GuideUI>(UIType.GUIDE);
        if (guideUI) {
            guideUI.hideGuide();
        }
        this.isDragging = true;
        this.updatereTagetPosition(event);
    }
    private onTouchMove(event: EventTouch) {
        if (this.isDragging) {
            this.updatereTagetPosition(event);
        } 
    }
    private onTouchEnd(event: EventTouch) {
        this.isDragging = false; 
    }

    //是否收集齐资源，修改任务label
    private changeTask() {
        const gamemanager = GameManager.instance;
        if( this.resourceCount >= gamemanager.targetResourceAmount-gamemanager.curentResourceAmount) {
            
            const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
            hud.updateTaskLabel(true); 
         }
    }
    private updatereTagetPosition(event: EventTouch) {

        const touchPosition = event.getLocation(); // 获取触摸位置
    
        if (this.mainCamera) {
            const ray = this.mainCamera.screenPointToRay(touchPosition.x, touchPosition.y);
            
            if (ray.d.y !== 0) {
                const t = -ray.o.y / ray.d.y;
                this.targetPosition.x = ray.o.x + ray.d.x * t;
                this.targetPosition.z = ray.o.z + ray.d.z * t;
                this.targetPosition.y = this.node.position.y; // 保持当前高度
            }
        }
    }

    public stopAllMovement() {
        this.isDragging = false;
        this.isDeliveringResources = false;
        if (this.rigidBody) {
            this.rigidBody.setLinearVelocity(new Vec3(0, 0, 0));
            this.rigidBody.setAngularVelocity(new Vec3(0, 0, 0)); 
        }
        if (this.currentVehicleIndex === VehicleType.Initial) {
            AnimationManager.instance.playCharacterAnimation(this.node, 'idle');
        }
        AudioManager.instance.stopLoopSound();
    }

    private movePlayer(dt: number) {
        if (!this.enabled || GameManager.instance.isgameover) {
            this.stopAllMovement();
            if (this.currentVehicleIndex === VehicleType.Initial) {
                AnimationManager.instance.playCharacterAnimation(this.node, 'idle');
            }
            return;
        }
        
        if (this.isDragging) {
            const direction = new Vec3();
            Vec3.subtract(direction, this.targetPosition, this.node.position);
            direction.y = 0;
            
            // 只要在拖拽状态就播放行走动画
            if (this.currentVehicleIndex === VehicleType.Initial) {
                AnimationManager.instance.playCharacterAnimation(this.node, 'walk');
            }

            direction.normalize();
            if(direction.length() > 0.1) {
                const speedFactor = PhysicsManager.instance.getSpeedFactor(this.node);
                const velocity = new Vec3(
                    direction.x * this.vehicleSpeeds[this.currentVehicleIndex] * speedFactor, 
                    0, 
                    direction.z * this.vehicleSpeeds[this.currentVehicleIndex] * speedFactor
                );
                this.rigidBody.setLinearVelocity(velocity);
                this.rigidBody.setAngularVelocity(new Vec3(0, 0, 0));

                if(this.currentVehicleIndex ===VehicleType.Initial){
                    AudioManager.instance.playLoopSound('walk');
                }
                else{
                    AudioManager.instance.playLoopSound('car_move');
                }
                
                // 确保玩家朝向移动方向
                const targetRotation = new Vec3(
                    this.targetPosition.x,
                    this.node.position.y,
                    this.targetPosition.z
                );
                this.node.lookAt(targetRotation);
            } else {
                this.rigidBody.setLinearVelocity(new Vec3(0, 0, 0));
                AudioManager.instance.stopLoopSound();
            }
        } else {
            if (this.currentVehicleIndex === VehicleType.Initial) {
                AnimationManager.instance.playCharacterAnimation(this.node, 'idle');
            }
            this.rigidBody.setLinearVelocity(new Vec3(0, 0, 0));
            AudioManager.instance.stopLoopSound();
        }
    }

    private decreaseTemperature(dt: number) { //在home外温度降低
        if(this.isNearHome()){      //在home范围内温度以两倍速度恢复
            this.currentTemperature = Math.min(this.currentTemperature + this.temperatureDecreaseRate * 3*dt, this.maxTemperature);
        }else{
            this.currentTemperature = Math.max(this.currentTemperature - this.temperatureDecreaseRate * dt, 0);
        }
        if (UIManager.instance?.getUI) {
            const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
            if(hud){
                hud.updateTemperature(this.currentTemperature, this.maxTemperature);
            }
        }
        if(this.currentTemperature <= 0) {
            this.currentTemperature = 0;
            GameManager.instance.gameOver(); 
            if (this.currentVehicleIndex === VehicleType.Initial) {
                AnimationManager.instance.stopAllAnimations(this.node);
            }
        }
    }

    public isNearHome() :boolean{//是否在home范围内
        
        const homePoint = GameManager.instance.homePointNode;
        if(!homePoint) return false;

        const distance = Vec3.distance(this.node.position,homePoint.position);
        return distance<=this.homeRadius;
    }

    // onCollisionEnter(event: ICollisionEvent) {
    //     console.log("碰撞开始");
    //     const otherNode = event.otherCollider.node;
    //     console.log("碰撞对象:", otherNode.name);
    //     console.log("碰撞对象组:", event.otherCollider.getComponent(RigidBody)?.group);
        
    //     const iceComponent = otherNode.getComponent(IceBlock);
    //     if(iceComponent) {
    //         console.log("Found IceBlock component, breaking ice...");
    //         this.breakIceBlock(otherNode);
    //     } else {
    //         console.log("No IceBlock component found on collision object");
    //     }
    // }
    // 替换原来的碰撞检测方法
    private checkCustomCollisions() {
        // 如果已经有碰撞效果，不再检测
        if (PhysicsManager.instance.hasActiveEffect(this.node)) {
            return;
        }
        
        // 检测与冰块的碰撞
        const iceBlock = PhysicsManager.instance.checkIceBlockCollision(this.node);
        if (iceBlock) {
            console.log("当前车辆类型:", this.currentVehicleIndex);
            console.log("是否为 Default:", this.currentVehicleIndex === VehicleType.Default);
            console.log("是否为 SnowTruck:", this.currentVehicleIndex === VehicleType.SnowTruck);
            
            console.log("检测到与冰块的碰撞:", iceBlock.node.name, "冰块大小:", iceBlock.iceSize);
            
            // 应用碰撞效果，并判断是否可以破坏
            const canBreak = PhysicsManager.instance.applyIceBlockEffect(
                this.node, 
                this.currentVehicleIndex, 
                iceBlock.iceSize
            );
            
            if (canBreak) {
                console.log("可以破坏冰块");
                // 销毁冰块
                this.breakIceBlock(iceBlock.node);
            } else {
                console.log("无法破坏该类型的冰块");
                // 播放无法破坏的反馈效果
                this.playIceBlockImpactEffect();
            }
        }
    }
    
    // 播放冰块碰撞效果但不能破坏时的反馈
    private playIceBlockImpactEffect() {
        // 可以添加震动、声音等反馈
        AudioManager.instance.playSound('iceImpact');
        
        // 相机轻微震动
        if (this.mainCamera) {
            const cameraNode = this.mainCamera.node;
            const originalPos = cameraNode.position.clone();
            
            tween(cameraNode)
                .to(0.05, { position: new Vec3(originalPos.x + 0.05, originalPos.y, originalPos.z) })
                .to(0.05, { position: new Vec3(originalPos.x - 0.05, originalPos.y, originalPos.z) })
                .to(0.05, { position: originalPos })
                .start();
        }
    }

    private breakIceBlock(iceNode: Node){
        AudioManager.instance.playSound('ice_break');
        // if (this.currentVehicleIndex === VehicleType.Initial) {
        //     this.stopAllMovement()
        //     AnimationManager.instance.playCharacterAnimation(this.node, 'attack');
        // }
        EffectManager.instance.playEffect('ice_break', iceNode.position,null,5);

        const iceComponent = iceNode.getComponent(IceBlock);
        if(iceComponent){
            if (iceComponent.hasResource) {
                const worldPos = new Vec3();
                iceNode.getWorldPosition(worldPos);
                if (iceComponent.resourceType === ResourceType.Car) {
                    this.changeVehicle(iceComponent.vehicleType); 
                } else {
                    this.collectResource(iceComponent.resourceType, iceComponent.resourceAmount,worldPos);
                    this.changeTask()
                }
            }
            console.log('break ice');
            ResourceManager.instance.putIceBlock(iceNode);
        }
    }

    // 收集资源
    private collectResource(type: number, amount: number, sourcePosition?: Vec3) { 
        //AudioManager.instance.playSound('collect');
        

        const startIndex = this.resourceCount;
        for(let i =0;i<amount;i++){
            const resource = ResourceManager.instance.createResource(type);

            if(resource){
                const totalIndex = startIndex + i;
                const layer = Math.floor(totalIndex / 3);    // 每层3个
                const posInLayer = totalIndex % 3;           // 当前层中的位置
                
                const finalPosition = new Vec3(
                    -1,                      
                    layer * 0.25,            
                    -0.5- posInLayer * 0.2   
                );
                if (sourcePosition) {
                    resource.setWorldPosition(sourcePosition);
                }
                
                this.resourceContainer.addChild(resource);
                this.resources.push(resource);  

                const duration = 0.5;   // 动画持续时间
                const midHeight = 3;    // 上升高度

                tween(resource)
                    .to(duration,{
                        position: finalPosition },{
                            easing: 'quadOut',
                            onUpdate: (target:Node, ratio:number) => {
                                const height =Math.sin(ratio * Math.PI) * midHeight;    
                                target.position = new Vec3(
                                    finalPosition.x + ratio,
                                    finalPosition.y + height,
                                    finalPosition.z + ratio
                                );
                            }
                        })
                        .start();
            } 
            
        }
        // 更新资源计数
        //GameManager.instance.addResource();
        this.resourceCount = this.resources.length
        const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
        if(hud){
            hud.updateStoneCount(this.resourceCount);
        }
    }

    // 获得车辆
    private changeVehicle(type: number, sourcePosition?: Vec3) {
        if (type === this.currentVehicleIndex || type >= this.vehicleModels.length) return;

        AudioManager.instance.playSound('changeVehicle');

        // 转移现有资源到新容器
        const oldContainer = this.resourceContainers[this.currentVehicleIndex];
        const newContainer = this.resourceContainers[type];
        
        // 保存当前资源的相对位置信息
        const resourcePositions = this.resources.map(resource => {
            return {
                node: resource,
                localPos: resource.position.clone()
            };
        });
        
        // 播放切换动画
        this.playVehicleChangeAnimation(this.currentVehicleIndex, type, sourcePosition, () => {
            // 转移资源到新容器并保持相对位置
            resourcePositions.forEach(item => {
                newContainer.addChild(item.node);
                // 保持相同的相对位置
                item.node.position = item.localPos;
            });
            
            // 更新资源容器引用
            this.resourceContainer = newContainer;
            this.unfreezeEffect();
        });
    }

    private playVehicleChangeAnimation(oldIndex: number, newIndex: number, sourcePosition?: Vec3, onComplete?: Function) {
        const oldModel = this.vehicleModels[oldIndex];
        const newModel = this.vehicleModels[newIndex];
        const oldContainer = this.resourceContainers[oldIndex];
        const newContainer = this.resourceContainers[newIndex];
        
        // 设置新模型和容器
        newModel.active = true;
        newContainer.active = true;
        newModel.scale = new Vec3(0, 0, 0);

        // 旧模型缩小消失
        tween(oldModel)
            .to(0.5, { scale: new Vec3(0, 0, 0) })
            .call(() => {
                oldModel.active = false;
                oldContainer.active = false;
                oldModel.scale = new Vec3(1, 1, 1);
            })
            .start();
        if (sourcePosition) {
            EffectManager.instance.playEffect('vehicle_change', sourcePosition);
        } else {
            // 如果没有源位置，就在当前位置播放
            EffectManager.instance.playEffect('vehicle_change', this.node.worldPosition,null,5);
        }
        // 新模型从源位置放大出现
        tween(newModel)
            .delay(0.5)
            .to(0.5, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                // 更新当前索引和引用
                this.currentVehicleIndex = newIndex;
                this.resourceContainer = newContainer;
                
                // 更新移动速度
                if (this.vehicleSpeeds[newIndex]) {
                    this.vehicleSpeeds[this.currentVehicleIndex] = this.vehicleSpeeds[newIndex];
                }

                if (onComplete) onComplete();
            })
            .start();
    }

    public deliverResourcesToHome() {
        if (this.resourceCount === 0 || !this.isNearHome() || this.isDeliveringResources || GameManager.instance.isgameover){
            this.isDeliveringResources = false;
            return;
        } 

        const homePoint = GameManager.instance.homepoint.getComponent('HomePoint');

        if (!homePoint){
            this.isDeliveringResources = false;
            return;
        }
        
        this.isDeliveringResources = true;
        
        // 只有在游戏未结束时才播放音效
        if (!GameManager.instance.isgameover) {
            AudioManager.instance.playSound('delivery');
        }

        const resourceCount = this.resourceCount;
        const resourcesReserved = [...this.resources];      
        resourcesReserved.sort((a,b)=>{     
            return b.position.y - a.position.y;
        });
        // 逐个投递资源
        this.deliverResourcesSequentially(homePoint, 0, resourceCount, resourcesReserved);
        //this.playResourceDeliveryAnimation();
        // this.resources.forEach(res => {
        //     ResourceManager.instance.putResource(res);
        // });
        // this.resources = [];
    }

    // 播放资源投递动画
    private deliverResourcesSequentially(homePoint, index, totalCount, resourcesReserved) { 
        // 如果游戏已结束或资源已投递完，直接结束投递过程
        if (index >= resourcesReserved.length || GameManager.instance.isgameover) {
            this.isDeliveringResources = false;
            // 如果是因为游戏结束而中断，清理剩余资源
            if (GameManager.instance.isgameover) {
                for (let i = index; i < resourcesReserved.length; i++) {
                    ResourceManager.instance.putResource(resourcesReserved[i]);
                }
            }
            return;
        } 
        
        const resource = resourcesReserved[index];
        const worldPos = new Vec3();
        resource.getWorldPosition(worldPos);
    
        const resourceIndex = this.resources.indexOf(resource);
        if (resourceIndex !== -1) {
            this.resources.splice(resourceIndex, 1);    
            this.resourceCount=this.resources.length;
            if (UIManager.instance?.getUI) {
                const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
                if(hud){
                    hud.updateStoneCount(this.resourceCount);
                }
            }
            GameManager.instance.addDeliveredResource(1);
        }
        
        // 播放单个资源的投递动画
        homePoint.playResourceDeliveryAnimation(worldPos, resource, () => {
            ResourceManager.instance.putResource(resource);
            
            // 只有在游戏未结束时继续递归
            if (!GameManager.instance.isgameover) {
                this.deliverResourcesSequentially(homePoint, index + 1, totalCount, resourcesReserved);
            } else {
                this.isDeliveringResources = false;
            }
        });
    }

    public resetPlayer(){

        this.currentTemperature = this.maxTemperature;
        this.isDragging = false;
        this.isDeliveringResources = false;
        this.resources.forEach(res => {
            ResourceManager.instance.putResource(res);
        });
        this.resources = [];
        this.resourceContainer.removeAllChildren();
        this.unfreezeEffect();
        this.node.setPosition(0, 1, 4);
        this.rigidBody.setLinearVelocity(new Vec3(0,0,0));   // 重置线性速度
    }

    private getAllMeshRenderers(node: Node): MeshRenderer[] {
        const meshRenderers: MeshRenderer[] = [];
        
        // 获取当前节点的MeshRenderer
        const renderer = node.getComponent(MeshRenderer);
        if (renderer) {
            meshRenderers.push(renderer);
        }
        
        // 递归获取所有子节点的MeshRenderer
        const children = node.children;
        children.forEach(child => {
            meshRenderers.push(...this.getAllMeshRenderers(child));
        });
        
        return meshRenderers;
    }


    public freezeEffect() {
        if (!this.initialplayer_frozenMaterial) {
            console.warn('frozenMaterial 未赋值');
            return;
        }
        
        if (this.currentVehicleIndex === VehicleType.Initial) {
            const playerModel = this.vehicleModels[VehicleType.Initial];           
            const modelNode = playerModel.getChildByName('model');       
            const bodyNode = modelNode.getChildByName('Body');
            
            const skinnedMeshRenderer = bodyNode.getComponent(SkinnedMeshRenderer);
            
            if (!this.originalMaterials.has(skinnedMeshRenderer)) {
                const originalMats: Material[] = [];
                for (let i = 0; i < skinnedMeshRenderer.materials.length; i++) {
                    originalMats.push(skinnedMeshRenderer.getSharedMaterial(i));
                }
                this.originalMaterials.set(skinnedMeshRenderer, originalMats);
            }
            for (let i = 0; i < skinnedMeshRenderer.materials.length; i++) {
                skinnedMeshRenderer.setSharedMaterial(this.initialplayer_frozenMaterial, i);               
            }
            const resourceContainer = this.resourceContainers[VehicleType.Initial];
            const meshRenderers = this.getAllMeshRenderers(resourceContainer);
            meshRenderers.forEach(renderer => {
                if (!this.originalMaterials.has(renderer)) {
                    this.originalMaterials.set(renderer, renderer.getSharedMaterial(0));
                }
                renderer.setSharedMaterial(this.frozenMaterial, 0);
            });
        } else {
            const currentModel = this.vehicleModels[this.currentVehicleIndex];
            const meshRenderers = this.getAllMeshRenderers(currentModel);
            
            meshRenderers.forEach(renderer => {
                if (!this.originalMaterials.has(renderer)) {
                    this.originalMaterials.set(renderer, renderer.getSharedMaterial(0));
                }
                renderer.setSharedMaterial(this.frozenMaterial, 0);
            });
        }

        // 播放冰冻动画
        tween(this.frozenMaterial.getProperty('frozenIntensity'))
            .to(0.5, { value: 1.0 })
            .start();
    }

    public unfreezeEffect() {
        if (this.currentVehicleIndex === VehicleType.Initial) {
            const playerModel = this.vehicleModels[VehicleType.Initial];
            // 直接查找 model/Body
            const modelNode = playerModel.getChildByName('model');
            if (!modelNode) {
                console.warn('model node not found');
                return;
            }
            const bodyNode = modelNode.getChildByName('Body');
            if (!bodyNode) {
                console.warn('Body node not found');
                return;
            }
            const skinnedMeshRenderer = bodyNode.getComponent(SkinnedMeshRenderer);
            if (skinnedMeshRenderer) {
                const originalMaterials = this.originalMaterials.get(skinnedMeshRenderer) as Material[];
                if (originalMaterials) {
                    // 恢复所有材质槽
                    for (let i = 0; i < originalMaterials.length; i++) {
                        skinnedMeshRenderer.setSharedMaterial(originalMaterials[i], i);
                    }
                }
            }
        } else {
            // 其他车辆的常规解冻效果
            const currentModel = this.vehicleModels[this.currentVehicleIndex];
            const meshRenderers = this.getAllMeshRenderers(currentModel);
            
            meshRenderers.forEach(renderer => {
                const originalMaterial = this.originalMaterials.get(renderer);
                if (originalMaterial) {
                    if (Array.isArray(originalMaterial)) {
                        renderer.materials = originalMaterial;
                    } else {
                        renderer.material = originalMaterial;
                    }
                }
            });
        }
        
        this.originalMaterials.clear();
    }

}


