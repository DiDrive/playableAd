import { _decorator, Component, Node, ProgressBar, Vec3, tween, UITransform, Canvas, Camera, Widget, Vec2, view,director, Label} from 'cc';
import { GameManager } from '../Manager/GameManager';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

@ccclass('HomePoint')
export class HomePoint extends Component {
    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    @property(Node)
    private resTarget: Node = null;     // 资源投递目标位置

    @property(Node)
    private progressBarNode: Node = null;   // 进度条节点,用于定位进度条位置在游戏世界中的位置

    @property(Label)
    private resourceLabel: Label = null;  

    @property(Node)
    private deliveryPosition: Node = null; 

    private isPlayerNearby: boolean = false;
    private player: PlayerController = null;
    private checkInterval: number = 0.5; // 检查间隔
    private timer: number = 0;

    protected start(): void {
        this.updateProgress(0);
        const playerNode = GameManager.instance.playerNode;
        if( playerNode) {
            this.player = playerNode.getComponent(PlayerController);
        }
        this.setupWorldSpaceUI();
    }

    protected update(dt: number): void {
            this.timer += dt;
            if (this.timer >= this.checkInterval) {
                this.timer = 0;
                this.checkPlayerNearby();
            }
            
            this.updateProgressBarPosition();
    }


    // 检查玩家是否靠近homePoint
    private checkPlayerNearby() {
        if (!this.player) return;
    
        // 更新玩家是否在附近的状态
        this.isPlayerNearby = this.player.isNearHome();
    
        // 如果玩家靠近
        if (this.isPlayerNearby) {
            // 如果已达到资源目标且游戏未结束
            if (GameManager.instance.isTargetReached && !GameManager.instance.isgameover) {
                // 强制玩家停止移动
                this.player.stopAllMovement();
                
                // 确保deliveryPosition存在
                if (this.deliveryPosition) {
                    // 获取世界坐标
                    const worldDeliveryPos = new Vec3();
                    this.deliveryPosition.getWorldPosition(worldDeliveryPos);
                    
                    console.log("移动玩家到投递位置:", worldDeliveryPos);
                    
                    // 平滑移动到指定位置
                    tween(this.player.node)
                        .to(0.5, { worldPosition: worldDeliveryPos })
                        .call(() => {
                            // 让玩家面向篝火
                            const homeWorldPos = new Vec3();
                            this.node.getWorldPosition(homeWorldPos);
                            this.player.node.lookAt(homeWorldPos);
                            
                            // 投递资源
                            this.player.deliverResourcesToHome();
                        })
                        .start();
                } else {
                    console.warn("HomePoint: deliveryPosition 节点未设置!");
                    this.player.deliverResourcesToHome();
                }
            } 
            // 普通投递逻辑
            else if (!GameManager.instance.isTargetReached) {
                this.player.deliverResourcesToHome();
            }
        }
    }

    public updateProgress(current: number, target: number =GameManager.instance.targetResourceAmount){
        if( this.progressBar) {
            this.progressBar.progress = current / target;
        }

        if( this.resourceLabel) {
           const remaining : number = Math.max(0, target - current);
           this.resourceLabel.string = `${remaining}`; 
        }
    }

    public hideProgressBar() {
        if( this.progressBarNode) {
            this.progressBarNode.active = false;
        }
    }

    public playResourceDeliveryAnimation(startPos: Vec3, resourceNode: Node, onComplete:()=>void) {
        const endPos = this.resTarget.worldPosition;
        resourceNode.parent = this.node.parent; 
        resourceNode.worldPosition = startPos;

        // 计算抛物线中点
        const midPoint= new Vec3(
            (startPos.x + endPos.x) / 2,
            Math.max(startPos.y, endPos.y) + 1.5,
            (startPos.z + endPos.z) / 2
        );
        tween(resourceNode)
        .to(0.3,{worldPosition: midPoint})
        .to(0.3,{worldPosition: endPos})
        .call(()=>{
            // 动画完成后不销毁节点，而是通知完成回调
            onComplete();   
        })
       .start();
    }

    private setupWorldSpaceUI() {
        if (!this.progressBarNode || !this.progressBar) return;
        
        // 获取场景中的 Canvas 节点
        const canvas = director.getScene().getComponentInChildren(Canvas);
        if (canvas) {
            this.progressBarNode.parent = canvas.node;
            const widget = this.progressBarNode.getComponent(Widget);
            if (widget) {
                widget.destroy();
            }
            const uiTransform = this.progressBarNode.getComponent(UITransform) || this.progressBarNode.addComponent(UITransform);
            // 设置锚点
            uiTransform.setAnchorPoint(0.5, 0);
        }
    }

    private updateProgressBarPosition() {
        if (!this.progressBarNode) return;
    
        const camera = GameManager.instance.mainCameraNode;
        if (!camera) return;
    
        // 获取HomePoint的世界坐标
        const worldPos = new Vec3();
        this.node.getWorldPosition(worldPos);
        
        worldPos.y += 2.5; // 垂直偏移
        
        // 将3D坐标转换为屏幕坐标
        const screenPos = camera.worldToScreen(worldPos);     
        // 将屏幕坐标转换为UI坐标系
        const visibleSize = view.getVisibleSize();
        const uiPos = new Vec3(
            screenPos.x / view.getScaleX(),
            screenPos.y / view.getScaleY(),
            0
        );
        
        // 考虑Canvas的锚点
        this.progressBarNode.setPosition(
            uiPos.x - visibleSize.width * 0.5,
            uiPos.y - visibleSize.height * 0.5,
            0
        );
    }

    public get deliveryPositionNode(): Node {
        return this.deliveryPosition;
    }
}


