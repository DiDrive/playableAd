import { _decorator, Component, Node, Prefab, instantiate, Enum, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum VehicleType {
    Initial = 0,  // 角色初始状态
    Default = 1,    //小车
    SnowTruck = 2   //雪地卡车
};


@ccclass('ModelManager')
export class ModelManager extends Component {
    private static _instance: ModelManager = null;
    
    @property({ type: [Prefab] })
    private vehiclePrefabs: Prefab[] = [];
    
    @property({ type: [Vec3] })
    private resourceNodePositions: Vec3[] = []; // 每种车辆对应的资源节点位置
    
    private vehicleTypeNames = ['Default', 'SnowTruck'];
    
    public static get instance(): ModelManager {
        return this._instance;
    }
    
    onLoad() {
        if (ModelManager._instance === null) {
            ModelManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    // 切换玩家模型
    public changePlayerModel(playerNode: Node, vehicleTypeValue: number) {
        if (vehicleTypeValue >= 0 && vehicleTypeValue < this.vehiclePrefabs.length) {      
            // 移除所有现有模型
            const children = playerNode.children.slice(); // 创建副本以避免遍历时修改问题
            for (const child of children) {
                if (child.name.includes('player_model')) {
                    child.destroy();
                }
            }
            
            // 添加新模型
            const newModel = instantiate(this.vehiclePrefabs[vehicleTypeValue]);
            newModel.name = 'player_model_' + vehicleTypeValue;
            playerNode.addChild(newModel);
        } else {
            console.warn(`Vehicle type ${this.getVehicleTypeName(vehicleTypeValue)} not found`);
        }
    }
    
    // 获取车辆类型名称
    public getVehicleTypeName(type: number): string {
        return this.vehicleTypeNames[type];
    }
    
    // 获取特定车辆类型的资源节点位置
    public getResourceNodePosition(vehicleType: number): Vec3 {
        if (vehicleType >= 0 && vehicleType < this.resourceNodePositions.length) {
            return this.resourceNodePositions[vehicleType].clone();
        }
        return new Vec3(0, 0, 0); // 默认位置
    }
    
    // 调整资源位置以适应新车辆
    public adjustResourcePositions(resources: Node[], oldType: number, newType: number) {
        if (!resources || resources.length === 0) return;
        
        const oldPos = this.getResourceNodePosition(oldType);
        const newPos = this.getResourceNodePosition(newType);
        
        // 计算偏移量
        const offsetX = newPos.x - oldPos.x;
        const offsetY = newPos.y - oldPos.y;
        const offsetZ = newPos.z - oldPos.z;
        
        // 调整每个资源的位置
        resources.forEach(resource => {
            const currentPos = resource.position;
            resource.position = new Vec3(
                currentPos.x + offsetX,
                currentPos.y + offsetY,
                currentPos.z + offsetZ
            );
        });
    }
}