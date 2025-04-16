import { _decorator, Component, Node, Button, director } from 'cc';
import { BaseUI } from '../Common/BaseUI';
const { ccclass, property } = _decorator;

@ccclass('VictoryUI')
export class VictoryUI extends BaseUI {
    @property(Button)
    private downloadButton: Button = null;

    onLoad() {
        //super.onLoad();
        this.downloadButton.node.on('click', this.ondownloadClick, this);   
    }

    private ondownloadClick() {
        console.log('下载按钮被点击');
    }
}


