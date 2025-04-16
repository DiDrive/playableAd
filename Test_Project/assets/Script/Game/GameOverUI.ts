import { _decorator, Component, Node, Button, director, Vec3, tween, UIOpacity } from 'cc';
import { BaseUI } from '../Common/BaseUI';
import { UIManager } from '../Manager/UIManager';
import { UIType } from '../Common/UIConfig';
import { GameManager } from '../Manager/GameManager';
import { CameraManager } from '../Manager/CameraManager';
const { ccclass, property } = _decorator;

@ccclass('GameOverUI')
export class GameOverUI extends BaseUI {
    @property(Button)
    private retryButton: Button = null;

    @property(Node)
    private failIcon: Node = null;

    @property(Node)
    private uiContainer: Node = null;
    
    @property(Button)
    private downloadButton: Button = null;

    @property(Node)
    private bg_Ice: Node = null;

    private uiOpacity: UIOpacity = null;

    private failiconDuration: number = 1.5;

    onLoad() {
        this.retryButton.node.on('click', this.onRetryClick, this);
        this.downloadButton.node.on('click', this.onDownloadClick, this);

        this.failIcon.scale = Vec3.ZERO;
        this.uiContainer.active = false;
        
        // 确保有 UIOpacity 组件
        this.uiOpacity = this.uiContainer.getComponent(UIOpacity);
        if (!this.uiOpacity) {
            this.uiOpacity = this.uiContainer.addComponent(UIOpacity);
        }
    }

    private showUIElements() {
        this.uiContainer.active = true;

        this.uiOpacity.opacity = 0;
        
        tween(this.uiContainer)
            .set({ scale: new Vec3(0.8, 0.8, 0.8) })
            .to(0.3, { scale: new Vec3(1, 1, 1) })
            .start();
            
        tween(this.uiOpacity)
            .to(0.3, { opacity: 255 })
            .start();
    }

    show() {
        super.show();
        this.playShowAnimation();
    }
    private async playShowAnimation() {
        this.bg_Ice.active = true;
        // 显示失败图标动画
        tween(this.failIcon)
            .to(0.3, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'backOut' })
            .delay(this.failiconDuration)
            .to(0.3, { scale: Vec3.ZERO })
            .call(() => {
                this.failIcon.active = false;
                const cameraManager = CameraManager.instance;
                cameraManager.playGameOverAnimation();
                this.showUIElements();
            })
            .start();
    }

    private onRetryClick() {
        this.hide();
        GameManager.instance.restartGame();
    }

    private onDownloadClick() {
        console.log('下载按钮被点击'); 
    }
}


