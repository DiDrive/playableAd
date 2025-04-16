import { _decorator, Component, Node , Animation} from 'cc';
import { BaseUI } from '../Common/BaseUI';
const { ccclass, property } = _decorator;

@ccclass('GuideUI')
export class GuideUI extends BaseUI {

    @property(Animation)
    private guideAnimation: Animation = null;

    protected onLoad(): void {
        //this.node.on(Node.EventType.TOUCH_START, this.hideGuide, this);
    }
    protected onDestroy(): void {
        //this.node.off(Node.EventType.TOUCH_START, this.hideGuide, this);
    }

    public playGuideAnimation(){
        if(this.guideAnimation){
            this.guideAnimation.play();
        }
    }

    public hideGuide(){
        this.guideAnimation.stop();
        this.hide();
    }
}


