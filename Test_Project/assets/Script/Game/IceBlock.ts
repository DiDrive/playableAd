import { _decorator, Component, Enum, Node, Prefab,RigidBody, Vec3, Material, MeshRenderer} from 'cc';
import { VehicleType } from '../Manager/ModelManager';
import { IceBlockSize } from '../Manager/PhysicsManager';
import { ModelManager } from '../Manager/ModelManager';
const { ccclass, property, type } = _decorator;


export const ResourceType = {
    Stone: 0,
    Car: 1
};
Enum(ResourceType);

export const ResourceTypeName =['Stone', 'Car'];

export function getResourceTypeByName(type: number): string {   
   return ResourceTypeName[type];
}
@ccclass('IceBlock')
export class IceBlock extends Component {
   @property({type:Boolean})
   public hasResource:boolean = true;  // 是否有资源

   @property({type:Enum(ResourceType),visible: function() { return this.hasResource }})
   public resourceType = ResourceType.Stone;  // 资源类型

   @property({type:Number})
   public resourceAmount: number = 1;  // 资源数量

   @property({
   type: Enum(VehicleType),visible: function() { return this.resourceType === ResourceType.Car }})
   public vehicleType = VehicleType.Default;

   @property({type: Enum(IceBlockSize)})
   public iceSize: IceBlockSize = IceBlockSize.Small;  // 冰块大小

   @property({
      type: Node,
      tooltip: '石头模型节点'
   })
   private stoneModel: Node = null;

   @property({
      type: Node,
      tooltip: '车辆模型父节点'
  })
  private vehicleNode: Node = null;

  @property({
   type: Material,
   tooltip: '冰块发光材质'
   })
   private carIceMaterial: Material = null;

   private rigidBody:RigidBody = null;

   protected onLoad(): void {
      this.rigidBody = this.getComponent(RigidBody);
      if (this.rigidBody) {
          console.log("block RigidBody group:", this.rigidBody.group);
      }
      
   }

   protected start(): void {
      let sizeScale = this.iceSize === IceBlockSize.Small ? 1 : 2; 
      const blockScale = this.node.getScale();
      this.node.setScale(new Vec3(blockScale.x * sizeScale, blockScale.y * sizeScale, blockScale.z * sizeScale));

      //替换发光材质
      if (this.hasResource && this.resourceType === ResourceType.Car) {
         const meshnode = this.node.getChildByName('ice_block');
         const meshRenderer = meshnode.getComponent(MeshRenderer);
         if (meshRenderer && this.carIceMaterial) {
            console.log("应用车辆冰块发光材质");
            // 创建材质数组
            const materials = new Array(2);
            materials[0] = this.carIceMaterial; // 先应用发光材质
            materials[1] = meshRenderer.getSharedMaterial(0); // 再应用原始材质
            
            // 设置材质
            meshRenderer.materials = materials;
            
            // 打印更详细的信息
            console.log("发光材质:", this.carIceMaterial.name, this.carIceMaterial.passes.length);
            console.log("原始材质:", materials[1].name, materials[1].passes.length);
         }
     }
      // 在冰块中生成对应类型的车辆模型
      if(this.hasResource && this.resourceType === ResourceType.Car) {
         if (this.vehicleType !== VehicleType.Initial && this.vehicleNode) {             
           
            ModelManager.instance.changePlayerModel(this.vehicleNode, this.vehicleType);
            switch(this.vehicleType) {
               case VehicleType.SnowTruck:
                  this.vehicleNode.setScale(new Vec3(0.4 , 0.4 , 0.4 ));
                  this.vehicleNode.setPosition(new Vec3(0, -0.1 , -0.1 ));
                  break;
               default:
                  this.vehicleNode.setScale(new Vec3(0.4 , 0.4 , 0.4));
                  this.vehicleNode.setPosition(new Vec3(0, -0.1, -0.2 ));
                  break;
         }
            // 随机旋转车辆
            const randomYRotation = new Vec3(35, Math.random() * 360, 0);
            this.vehicleNode.setRotationFromEuler(randomYRotation);   
            
         }
     }

      // 在冰块中生成石头模型
      if(this.hasResource && this.resourceType === ResourceType.Stone && this.stoneModel) {
         this.stoneModel.active = true;
         const randomRotation = new Vec3(Math.random() * 360, Math.random() * 360, Math.random() * 360);
         this.stoneModel.setRotationFromEuler(randomRotation);
         const stoneModelScale = this.stoneModel.getScale();
         //this.stoneModel.setScale(new Vec3(stoneModelScale.x * sizeScale, stoneModelScale.y * sizeScale, stoneModelScale.z * sizeScale));
         
      }
   }
}


