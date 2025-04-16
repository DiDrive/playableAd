import { _decorator, Camera, Component, director, Node, UI, Vec3,tween} from 'cc';
import { UIManager } from './UIManager';
const { ccclass, property } = _decorator;
import { CameraManager } from './CameraManager';
import { UIType } from '../Common/UIConfig';
import { AudioManager } from './AudioManager';
import { PlayerController } from '../Game/PlayerController';
import { HUD } from '../Game/HUD';
import { HomePoint } from '../Game/HomePoint';
import { EffectManager } from './EffectManager';
import { MaterialManager } from './MaterialManager';
import { GuideUI } from '../Game/GuideUI';
import { AnimationManager } from './AnimationManager';

@ccclass('GameManager')
export class GameManager extends Component {

    private static _instance: GameManager = null;

    @property(Node)
    private player: Node = null;

    @property(Node)
    private homePoint: Node = null;

    @property(Number)
    private targetResouerceAmount: number = 10;     // 目标资源数量

    @property([Node])
    private hiddenHouses: Node[] = [];      // 隐藏的房子数组

    @property([Node])   
    private initialHouses: Node[] = [];     // 初始房子数组

    @property([Node])
    private snowRoofs: Node[] = [];      // 有雪的房顶数组

    @property([Node])
    private normalRoofs: Node[] = [];    // 正常的房顶数组

    @property(Camera)
    private mainCamera: Camera = null;

    private currentResouerceAmount: number = 0;     // 当前投递的资源数量
    
    private isGameOver: boolean = false;

    private homePointComponent: HomePoint = null;

    private isResourceTargetReached: boolean = false;   //是否达到目标资源数



    

    public static get instance(): GameManager {
        return this._instance;
    }

    onLoad() {
        if (GameManager._instance === null) {   
            GameManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }     

        this.hiddenHouses.forEach(house => {
            house.active = false;
        });
        for (let i = 0; i < this.initialHouses.length; i++) {
            if (this.snowRoofs[i]) this.snowRoofs[i].active = true;
            if (this.normalRoofs[i]) this.normalRoofs[i].active = false;
        }
        this.initGame(); 
    }

    private initGame() {
        this.isGameOver = false;
        this.currentResouerceAmount = 0;
        
        const playerController = this.player.getComponent(PlayerController);
        playerController.enabled = true;
        
    }
    
    public get targetResourceAmount(): number {
        return this.targetResouerceAmount;
    }
    public get playerNode(): Node {
        return this.player;
    }

    public get homepoint(): Node {
        return this.homePoint;
    }

    public get mainCameraNode(): Camera {
        return this.mainCamera;
    }

    public get isgameover(): boolean {
        return this.isGameOver;
    }
    async start(){
        await this.waitForUIManager();
        await UIManager.instance.showUI(UIType.HUD);
        
        const guideUI = await UIManager.instance.showUI<GuideUI>(UIType.GUIDE);
        guideUI.playGuideAnimation();

        this.homePointComponent = this.homePoint.getComponent(HomePoint);
        AudioManager.instance.playBGM();
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
    

    public addDeliveredResource(amount: number) {    // 增加已送达的资源数量
        this.currentResouerceAmount += amount;
        this.homePointComponent.updateProgress(this.currentResouerceAmount);
        if (this.currentResouerceAmount >= this.targetResouerceAmount) {
            this.completeGame();
        }
    }
    
    // public showStonecount() {
        
    //     //UIManager.instance().updateResourceUI(this.currentResouerceAmount, this.targetResouerceAmount);
    //     if (UIManager.instance?.getUI) {
    //         const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
    //         if(hud){
    //             hud.updateStoneCount(this.currentResouerceAmount);  
    //         }
    //     }
    // }

    public completeGame() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;

        this.homePointComponent.hideProgressBar();
        // 解冻房子
        this.unfreezeHouses();
        // 播放摄像机旋转动画
        CameraManager.instance.playRotationAnimation();
        
        UIManager.instance.showUI(UIType.VICTORY);
        const playerController = this.player.getComponent(PlayerController);
        playerController.enabled = false;
        playerController.stopAllMovement();
        AudioManager.instance.stopLoopSound();
        AudioManager.instance.playSound('victory');
        
    }

    public gameOver() {
        if (this.isGameOver) {
            return;
        }
        this.isGameOver = true;
        this.homePointComponent?.hideProgressBar();
        AudioManager.instance.stopLoopSound();
        AudioManager.instance.playSound('game_over');

        
        UIManager.instance.showUI(UIType.GAMEOVER);
        const playerController = this.player.getComponent(PlayerController);
        playerController.enabled = false;
        playerController.stopAllMovement();
        playerController.freezeEffect();

        //UIManager.instance.showUI(UIType.GAMEOVER);
        // this.scheduleOnce(() => {
        //     playerController.enabled = false;
        // }, 2.5);

    }

    public async restartGame() {
        this.isGameOver = false;
        this.currentResouerceAmount = 0;

        await UIManager.instance?.hideUI(UIType.GAMEOVER);
        UIManager.instance.showUI(UIType.HUD);
        const hud = UIManager.instance.getUI<HUD>(UIType.HUD);
        if (hud) {
            hud.updateStoneCount(this.currentResouerceAmount);  
        }
        
        const playerController = this.player.getComponent(PlayerController);
        if (playerController) {
            playerController.resetPlayer();
            playerController.enabled = true;
        }

        AudioManager.instance.playBGM();
        //this.player.setPosition(this.homePoint.position);
        //director.loadScene('scene_1');
    }

    private async unfreezeHouses() {
        await this.waitForCameraInitialMove();
        // 显示隐藏的房子
        for (let i = 0; i < this.hiddenHouses.length; i++) {
            const house = this.hiddenHouses[i];
            if (!house) {
                console.warn(`第 ${i} 个房子为空`);
                continue;
            }
            
            house.active = true;
            house.scale = new Vec3(0, 0, 0);
            
            // 每个房子延迟出现
            await new Promise(resolve => setTimeout(resolve, 200 * i));
            
            // 播放出现动画和特效
            tween(house)
                .to(0.5, { scale: new Vec3(1, 1, 1) }, {
                    easing: 'backOut',
                    onStart: () => {
                        try {
                            // 播放出现特效
                            if (!EffectManager.instance) {
                                console.error('EffectManager 实例不存在');
                                return;
                            }
                            const worldPos = house.worldPosition;
                            console.log(`播放房子特效，位置: ${worldPos.x}, ${worldPos.y}, ${worldPos.z}`);
                            EffectManager.instance.playEffect('house_appear', worldPos);
                        } catch (error) {
                            console.error('播放房子特效失败:', error);
                        }
                    }
                })
                .start();
        }

        // 切换房顶
        for (let i = 0; i < this.initialHouses.length; i++) {
            
            
            if (this.snowRoofs[i] && this.normalRoofs[i]) {
                //console.log(`- 切换房顶状态`);
                this.snowRoofs[i].active = false;
                this.normalRoofs[i].active = true;
                EffectManager.instance.playEffect('house_appear', this.initialHouses[i].worldPosition);
            } else {
                console.log(`缺少房顶组件`);
            }
        }
    }

    private waitForCameraInitialMove(): Promise<void> {
        return new Promise((resolve) => {
            setTimeout(resolve, 1500); // 与相机初始移动时间匹配
        });
    }

    public get homePointNode(): Node {
        return this.homePoint;
    }

    public get isTargetReached(): boolean {
        return this.isResourceTargetReached; 
    }

    public get curentResourceAmount(): number {
        return this.currentResouerceAmount; 
    }
  
    public setHomePoint(position: Vec3) {
        
        MaterialManager.instance.updateHomePosition(position);
    }

}
