import { _decorator, Component, Node, ProgressBar, Label, Button, Tween, tween, UIOpacity } from 'cc';
import { BaseUI } from '../Common/BaseUI';
const { ccclass, property } = _decorator;

@ccclass('HUD')
export class HUD extends BaseUI {
    @property(ProgressBar)
    private temperatureBar: ProgressBar = null;

    @property(Label)
    private temperatureLabel: Label = null;

    @property(Label)
    private stoneCountLabel: Label = null;

    @property(Button)
    private downloadButton: Button = null;

    @property(Node)
    private redBorderNode: Node = null;

    @property(Node)
    private temperaturebarRedBorder: Node = null;

    @property(Label)
    private taskLabel: Label = null;

    private isBlinking:boolean=false;   // 边框闪烁状态

    private isTemperatureBarBlinking:boolean=false; // 温度条边框闪烁状态

    private readonly BLINK_DURATION = 0.5;


    protected start(): void {
        this.stoneCountLabel.string='0';
        this.redBorderNode.active=false;
        this.temperaturebarRedBorder.active=false;
        this.downloadButton.node.on(Button.EventType.CLICK, this.ondownloadClick, this);

        this.taskLabel.string='破冰采煤！';
    }

    public updateTemperature(current: number, max: number) {
        const progress = current / max;
        // 更新进度条
        this.temperatureBar.progress = progress;
        // 更新文本显示
        this.temperatureLabel.string = `-${100-Math.floor(current)}°C`;
        
        if(progress<0.5 ){
            if(!this.isTemperatureBarBlinking){
                this.startTemperatureBarBlinking();
            }
            if(!this.isBlinking){
                this.startBlinking();
            }
            
        }
        else if(progress>=0.5 ){
            if(this.isTemperatureBarBlinking){
                this.stopTemperatureBarBlinking(); 
            }
            if(this.isBlinking){
                this.stopBlinking();
            }
            
        }

    }

    // 开始边框闪烁
    /*
    * borderNode: 要闪烁的边框节点
    * isBlinkingFlag: 闪烁状态的标志
    */
    private startBorderBlinking(borderNode:Node, isBlinkingFlag: 'isBlinking' | 'isTemperatureBarBlinking') {
        if (!borderNode || this[isBlinkingFlag]) {
            return;
        }

        this[isBlinkingFlag] = true;
        borderNode.active = true;
        const uiOpacity = borderNode.getComponent(UIOpacity);
        uiOpacity.opacity = 255;

        const fadeAction = tween(uiOpacity)
        .sequence(
            tween().to(this.BLINK_DURATION, { opacity: 0 }),
            tween().to(this.BLINK_DURATION, { opacity: 255 })
        )
        .union()
        .repeatForever();

        fadeAction.start();
        
    }

    // 停止边框闪烁
    private stopBorderBlinking(borderNode: Node, isBlinkingFlag: 'isBlinking' | 'isTemperatureBarBlinking') {
        if (!borderNode || !this[isBlinkingFlag]) {
            return;
        }

        this[isBlinkingFlag] = false;

        const uiOpacity = borderNode.getComponent(UIOpacity);
        Tween.stopAllByTarget(uiOpacity);
        uiOpacity.opacity = 255;
        borderNode.active = false;
        
     }

    private startBlinking(){
        this.startBorderBlinking(this.redBorderNode, 'isBlinking');
    }

    private stopBlinking(){
        this.stopBorderBlinking(this.redBorderNode, 'isBlinking'); 
    }


    private startTemperatureBarBlinking(){
        this.startBorderBlinking(this.temperaturebarRedBorder, 'isTemperatureBarBlinking');
    }

    private stopTemperatureBarBlinking(){
        this.stopBorderBlinking(this.temperaturebarRedBorder, 'isTemperatureBarBlinking');
    }
    public updateStoneCount(count: number) {
        this.stoneCountLabel.string = `${count}`;
    }

    private ondownloadClick() {
        console.log('下载按钮被点击');
    }

    public updateTaskLabel(isCompleted:boolean){
        this.taskLabel.string=isCompleted?'返回篝火！':'破冰采煤！';
    }
}