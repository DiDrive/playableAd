import { _decorator, Component, Node, Vec3,tween,Quat } from 'cc';
import { GameManager } from './GameManager';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;

@ccclass('CameraManager')
export class CameraManager extends Component {
    
    private static _instance: CameraManager = null;

    @property(Node)
    private target: Node = null;  // 摄像机的目标节点
    
    @property({type:Vec3})
    private offset: Vec3 = new Vec3(0, 15, -15);  // 摄像机相对于目标节点的偏移量

    @property({type:Number})
    private smoothFactor: number = 0.1;     // 摄像机平滑移动的因子

    private isRotating: boolean = false;

    private rotationTarget: Node = null;

    public static get instance(): CameraManager {
        return this._instance;
    }

    onLoad() {
        if (CameraManager._instance === null) {
            CameraManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }

        if (this.target) {
            const initialPosition = new Vec3();
            Vec3.add(initialPosition, this.target.position, this.offset);
            this.node.setPosition(initialPosition);
            this.node.lookAt(this.target.position);
        }
    }

    lateUpdate(dt: number) {
        if(this.isRotating) {
            if(this.rotationTarget) {
                this.node.lookAt(this.rotationTarget.position);
            }
            return;
        }
        
        if(!this.target) return;
        const targetPosition = new Vec3();
        Vec3.add(targetPosition, this.target.position, this.offset);

        const currentPosition = this.node.position;
        const newPosition =new Vec3(
            currentPosition.x + (targetPosition.x - currentPosition.x) * this.smoothFactor,
            currentPosition.y + (targetPosition.y - currentPosition.y) * this.smoothFactor,
            currentPosition.z + (targetPosition.z - currentPosition.z) * this.smoothFactor
        );
        this.node.setPosition(newPosition);
        this.node.lookAt(this.target.position);

    }
    // 镜头旋转
    public playRotationAnimation() {
        this.isRotating = true;
        this.rotationTarget = GameManager.instance.homepoint;
        
        const homePos = this.rotationTarget.position;
        const startPos = this.node.position.clone();
        const radius = 20; 
        const height = 25; 
        const tiltAngle = 30; 

        // 计算初始公转位置，确保与后退位置匹配
        const initialRotationPos = new Vec3(
            startPos.x - 8,
            startPos.y + 15, // 增加高度以便更好地观察场景
            startPos.z + 8
        );

        // 先平滑过渡到初始公转位置
        tween(this.node)
            .to(1.5, {
                position: initialRotationPos
            }, {
                easing: 'quadOut',
                onUpdate: (target: Node) => {
                    target.lookAt(homePos);
                }
            })
            .delay(2) // 等待房子出现的动画
            .call(() => {
                // 开始环绕动画
                let currentAngle = Math.atan2(
                    this.node.position.z - homePos.z,
                    this.node.position.x - homePos.x
                );

                tween(this.node)
                    .by(12, {}, {
                        onUpdate: (target: Node, ratio: number) => {
                            const angle = currentAngle + ratio * Math.PI * 2;
                            const x = homePos.x + radius * Math.cos(angle);
                            const y = homePos.y + height + radius * Math.sin(angle) * Math.sin(tiltAngle * Math.PI / 180);
                            const z = homePos.z + radius * Math.sin(angle) * Math.cos(tiltAngle * Math.PI / 180);
                            target.setPosition(x, y, z);
                            target.lookAt(homePos);
                        }
                    })
                    .repeatForever()
                    .start();
            })
            .start();
    }

    public playGameOverAnimation(){
        this.isRotating = true;

        const player = GameManager.instance.playerNode;
        const playerPos = player.position.clone();
        const playerForward = new Vec3();
        Vec3.subtract(playerForward,player.forward,Vec3.ZERO);
        playerForward.normalize();

        const targetPos =new Vec3(  
            playerPos.x + playerForward.x * 5,
            playerPos.y + 3,
            playerPos.z + playerForward.z * 5
        );

        const cameraPos = new Vec3(
            playerPos.x + playerForward.x * 15,
            playerPos.y + 8,
            playerPos.z + playerForward.z * 15,
        );

        tween(this.node)
        .to(1.5,
            {position:cameraPos},
            {
                easing:'quadOut',
                onUpdate:(target:Node)=>{
                    target.lookAt(playerPos);
            }
        })
        .start();

    }
}


