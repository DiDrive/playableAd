import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('BaseUI')
export class BaseUI extends Component {
    protected onShow():void{}       
    protected onHide():void{}

    public show():void{
        this.node.active = true;
        this.onShow();
    }

    public hide():void{     
        this.node.active = false;
        this.onHide();
    }
}


