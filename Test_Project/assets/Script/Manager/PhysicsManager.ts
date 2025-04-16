import { _decorator, Component, Node, Vec3 } from 'cc';
import { IceBlock } from '../Game/IceBlock';
import { VehicleType } from './ModelManager';
const { ccclass, property } = _decorator;

// 碰撞效果类型
export enum CollisionEffectType {
    None = 0,
    SmallIceBlock = 1,
    LargeIceBlock = 2,
    // 后续可以添加更多类型
}

// 冰块大小类型
export enum IceBlockSize {
    Small = 0,
    Large = 1
}

// 碰撞效果配置
export interface CollisionEffectConfig {
    type: CollisionEffectType;
    duration: number;      // 效果持续时间
    slowdownFactor: number; // 减速系数
    canBreak: boolean;     // 是否可以破坏
}

@ccclass('PhysicsManager')
export class PhysicsManager extends Component {
    private static _instance: PhysicsManager = null;

    public static get instance(): PhysicsManager {
        return this._instance;
    }

    @property({type: Number})
    private iceBlockCollisionDistance: number = 2.0; // 冰块碰撞检测距离

    // 小冰块碰撞效果配置
    @property({type: Number, tooltip: "初始Player对小冰块的阻碍时间"})
    private initialPlayerSmallIceDelay: number = 0.8;  
    
    @property({type: Number, tooltip: "Default车对小冰块的阻碍时间"})
    private defaultCarSmallIceDelay: number = 0.5;
    
    @property({type: Number, tooltip: "SnowTruck对小冰块的阻碍时间"})
    private snowTruckSmallIceDelay: number = 0;
    
    // 大冰块碰撞效果配置
    @property({type: Number, tooltip: "Default车对大冰块的阻碍时间"})
    private defaultCarLargeIceDelay: number = 1.0;
    
    @property({type: Number, tooltip: "SnowTruck对大冰块的阻碍时间"})
    private snowTruckLargeIceDelay: number = 0.3;
    
    // 减速系数配置
    @property({type: Number, tooltip: "小冰块减速系数"})
    private smallIceSlowdownFactor: number = 0.5;
    
    @property({type: Number, tooltip: "大冰块减速系数"})
    private largeIceSlowdownFactor: number = 0.3;

    private activeEffects: Map<Node, CollisionEffectConfig> = new Map();    
    private effectTimers: Map<Node, number> = new Map();

    onLoad() {
        if (PhysicsManager._instance === null) {
            PhysicsManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    /**
     * 检测节点与冰块的碰撞
     * @param node 要检测的节点
     * @returns 碰撞到的冰块组件，如果没有碰撞则返回null
     */
    public checkIceBlockCollision(node: Node): IceBlock {
        // 获取场景中所有的冰块
        const iceBlocks = node.scene.getComponentsInChildren(IceBlock);
        const forward = node.forward.clone();  
        
        for (const iceBlock of iceBlocks) {
            const distance = Vec3.distance(node.worldPosition, iceBlock.node.worldPosition);
            // 检查距离
            if (distance < this.iceBlockCollisionDistance) {
                // 计算方向向量
                const direction = new Vec3();
                Vec3.subtract(direction, iceBlock.node.worldPosition, node.worldPosition);
                direction.y = 0;  // 忽略垂直方向
                direction.normalize();
                
                // 计算点积来判断冰块是否在前方（点积大于0.7表示夹角小于约45度）
                const dot = Vec3.dot(forward, direction);
                if (dot > 0.7) {
                    return iceBlock;
                }
            }
        }
        return null;
    }

    /**
     * 判断当前车辆是否可以破坏指定类型的冰块
     * @param vehicleType 车辆类型
     * @param iceBlockSize 冰块大小
     * @returns 是否可以破坏
     */
    public canBreakIceBlock(vehicleType: VehicleType, iceBlockSize: IceBlockSize): boolean {
        // 所有车辆都可以破坏小冰块
        if (iceBlockSize === IceBlockSize.Small) {
            return true;
        }
        
        // 只有Default车和SnowTruck可以破坏大冰块
        if (iceBlockSize === IceBlockSize.Large) {
            return vehicleType === VehicleType.Default || vehicleType === VehicleType.SnowTruck;
        }
        
        return false;
    }

    /**
     * 应用冰块碰撞效果
     * @param target 目标节点
     * @param vehicleType 车辆类型
     * @param iceBlockSize 冰块大小
     * @returns 是否可以破坏该冰块
     */
    public applyIceBlockEffect(target: Node, vehicleType: VehicleType, iceBlockSize: IceBlockSize): boolean {
        // 如果已经有效果，不重复应用
        if (this.activeEffects.has(target)) {
            return false;
        }

        // 判断是否可以破坏
        const canBreak = this.canBreakIceBlock(vehicleType, iceBlockSize);
        if (!canBreak) {
            return false;
        }

        let config: CollisionEffectConfig = {
            type: iceBlockSize === IceBlockSize.Small ? CollisionEffectType.SmallIceBlock : CollisionEffectType.LargeIceBlock,
            duration: 0,
            slowdownFactor: iceBlockSize === IceBlockSize.Small ? this.smallIceSlowdownFactor : this.largeIceSlowdownFactor,
            canBreak: canBreak
        };

        // 根据车辆类型和冰块大小设置阻碍时间
        if (iceBlockSize === IceBlockSize.Small) {
            switch (vehicleType) {
                case VehicleType.Default:
                    config.duration = this.defaultCarSmallIceDelay;
                    break;
                case VehicleType.SnowTruck:
                    config.duration = this.snowTruckSmallIceDelay;
                    break;
                default: // 初始Player
                    config.duration = this.initialPlayerSmallIceDelay;
                    break;
            }
        } else { // 大冰块
            switch (vehicleType) {
                case VehicleType.Default:
                    config.duration = this.defaultCarLargeIceDelay;
                    break;
                case VehicleType.SnowTruck:
                    config.duration = this.snowTruckLargeIceDelay;
                    break;
                default: // 初始Player不能破坏大冰块
                    return false;
            }
        }

        this.activeEffects.set(target, config);
        this.effectTimers.set(target, config.duration);
        
        return true;
    }

    /**
     * 获取当前应用于目标的速度系数
     * @param target 目标节点
     * @returns 速度系数，1.0表示正常速度
     */
    public getSpeedFactor(target: Node): number {
        const effect = this.activeEffects.get(target);
        if (effect) {
            return effect.slowdownFactor;
        }
        return 1.0;
    }

    /**
     * 检查目标是否有活动的碰撞效果
     * @param target 目标节点
     * @returns 是否有活动效果
     */
    public hasActiveEffect(target: Node): boolean {
        return this.activeEffects.has(target);
    }

    /**
     * 清除目标的所有碰撞效果
     * @param target 目标节点
     */
    public clearEffects(target: Node) {
        this.activeEffects.delete(target);
        this.effectTimers.delete(target);
    }

    update(dt: number) {
        // 更新所有效果的计时器
        for (const [target, timer] of this.effectTimers.entries()) {
            const newTimer = timer - dt;
            if (newTimer <= 0) {
                // 效果结束
                this.activeEffects.delete(target);
                this.effectTimers.delete(target);
            } else {
                this.effectTimers.set(target, newTimer);
            }
        }
    }
}