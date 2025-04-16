import { _decorator, Component, Node, instantiate, Canvas } from 'cc';
import { BaseUI } from '../Common/BaseUI';
import { UIConfig, UILayer, UIType, UI_CONFIG} from '../Common/UIConfig';
import { ResourceLoader } from '../Common/ResourceLoader';
const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {
    private static _instance : UIManager = null;

    @property({type:Node})
    private layerNodes:Node[]=[];

    private uiMap: Map<UIType,BaseUI> =new Map(); 

    private loadingPromises: Map<UIType,Promise<BaseUI>> = new Map();   

    public static get instance():UIManager{
        return this._instance;
    }

    protected onLoad(): void {
        if(UIManager._instance === null){
            UIManager._instance=this;
            this.initLayer();
            
        }else{
            this.node.destroy();
            return; 
        }
    }

    private initLayer():void{
        while(this.layerNodes.length<Object.keys(UILayer).length/2){    
            const layer = new Node(`UILayer_${this.layerNodes.length}`);
            layer.parent = this.node;
            this.layerNodes.push(layer);
        }
    }

    public async showUI<T extends BaseUI>(uitype:UIType):Promise<T>{

        if (uitype === UIType.GAMEOVER || uitype === UIType.VICTORY) {
            this.hideUI(UIType.HUD);
        }
        const ui = await this.getOrLoadUI<T>(uitype);
        if (!ui) {
            console.error(`无法显示UI: ${uitype}，UI加载失败`);
            return null;
        }
        ui.show();
        return ui; 
    }
    
    public async hideUI(uitype:UIType):Promise<void>{
        const ui = this.uiMap.get(uitype);
        if(ui){
            ui.hide();
        }
    }

    public getUI<T extends BaseUI>(uitype:UIType):T{        
        return this.uiMap.get(uitype) as T;
    }

    private async loadUI<T extends BaseUI>(uitype:UIType):Promise<T>{       //加载UI
       const config = UI_CONFIG[uitype]; 
       if(!config){
          console.error(`UI配置不存在:${uitype}`);
          return null; 
       }

       try{
            console.log(`开始加载UI预制体: ${config.path}`);
            const prefab = await ResourceLoader.instance.loadPrefab(config.path);
            if (!prefab) {
                console.error(`预制体加载失败:${config.path}`);
                return null;
            }
            const node = instantiate(prefab);       
            const ui = node.getComponent(BaseUI) as T;  

            if(!ui){
               console.error(`UI组件不存在:${uitype}`);
               return null;
            }

            const layerNode = this.layerNodes[config.layer];
            node.parent = layerNode;

            if(config.cache){
                this.uiMap.set(uitype,ui);
            }

            node.active = false;

            return ui;
       }
       catch(error){
           console.error(`加载UI失败:${uitype}`);
           return null;
       }
    }

    private async getOrLoadUI<T extends BaseUI>(uitype:UIType):Promise<T>{  //获取或加载UI
       if(this.uiMap.has(uitype)){
            return this.uiMap.get(uitype) as T; 
       } 

       if(this.loadingPromises.has(uitype)){
            return this.loadingPromises.get(uitype) as Promise<T>;
       }

       //加载UI

       const loadPromise = this.loadUI<T>(uitype);
       this.loadingPromises.set(uitype,loadPromise);    

       try {
            const ui = await loadPromise;
            this.loadingPromises.delete(uitype);
            return ui;
        } catch (error) {
            this.loadingPromises.delete(uitype);
            throw error;
        }
    }

    //预加载UI
    public async preloadUI(uitype:UIType):Promise<void>{
        await this.getOrLoadUI(uitype);         
    }

    //销毁UI
    public destroyUI(uitype:UIType):void{
        const ui = this.uiMap.get(uitype);
        if(ui){
            ui.node.destroy();  
            this.uiMap.delete(uitype);
        }
    }

}


