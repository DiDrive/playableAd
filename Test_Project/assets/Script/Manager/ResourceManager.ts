import { _decorator, Component, Node, Prefab, instantiate, NodePool } from 'cc';
import { ResourceType } from '../Game/IceBlock';
const { ccclass, property } = _decorator;

@ccclass('ResourceManager')
export class ResourceManager extends Component {
    private static _instance: ResourceManager = null;
    
    @property({ 
        type: [Prefab],
        tooltip: '按照 ResourceType 枚举顺序添加预制体'
    })
    private resourcePrefabs: Prefab[] = [];

    @property(Prefab)
    private iceBlockPrefab: Prefab = null;

    private iceBlockPool: NodePool = new NodePool();

    private resourcePools: Map<number,NodePool> = new Map();
    
    public static get instance(): ResourceManager {
        return this._instance;
    }
    
    onLoad() {
        if (ResourceManager._instance === null) {
            ResourceManager._instance = this;
            this.initResourcePools();
        } else {
            this.node.destroy();
            return;
        }
    }
    
    private initResourcePools() {
        // 直接遍历 ResourceType 枚举
        for (const type in ResourceType) {
            const value = ResourceType[type];
            if (typeof value === 'number') {
                const pool = new NodePool();
                this.resourcePools.set(value, pool);
            }
        }
    }
    
         // 从资源池中获取资源
    public createResource(type: number): Node {
        const pool = this.resourcePools.get(type);
        let node: Node = null;
        if (pool && pool.size() > 0) {
            node = pool.get();
        }
        else if(this.resourcePrefabs[type]){
            node = instantiate(this.resourcePrefabs[type]); 
        }
        if (node) {
            node.active = true;
        }
        return node;
    }

    // 回收资源
    public putResource(node: Node) {
        if(!node) return;
        const typeStr = node.name.split('_')[0];  // 需要使用对象池的命名格式为: "1_Wood", "2_Stone" 等
        const type = parseInt(typeStr);
        const pool = this.resourcePools.get(type);      
        if (pool) {
            node.active = false;
            node.parent = null;
            pool.put(node);
        }
    }


    public createIceBlock(): Node {
        let iceBlock: Node = null;
        if (this.iceBlockPool.size() > 0) {
            iceBlock = this.iceBlockPool.get();
        } else if (this.iceBlockPrefab) {
            iceBlock = instantiate(this.iceBlockPrefab);
        }
        if (iceBlock) {
            iceBlock.active = true;
        }
        return iceBlock;
    }

    public putIceBlock(node: Node) {
        if (!node) return;
        node.active = false;
        node.parent = null;
        this.iceBlockPool.put(node);
    }
    

    public clearResourcePools() {
        this.resourcePools.forEach((pool) => {
            pool.clear();
        });
    }

    public clearAllPools() {
        this.resourcePools.forEach(pool => pool.clear());
    }

    protected onDestroy(): void {
        this.clearAllPools();
        this.iceBlockPool.clear();
    }

}