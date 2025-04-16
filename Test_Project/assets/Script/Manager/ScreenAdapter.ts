import { _decorator, Component, Node, view, screen, UITransform, Widget, Canvas, Size , Enum} from 'cc';
const { ccclass, property, menu } = _decorator;

enum AdapterMode {
    NONE = 0,
    STRETCH = 1,    // 拉伸全屏
    SCALE = 2       // 等比缩放
}

@ccclass('ScreenAdapter')
@menu('Framework/ScreenAdapter')
export class ScreenAdapter extends Component {
    @property({
        type: Enum(AdapterMode),
        displayName: '适配模式'
    })
    private adapterMode: AdapterMode = AdapterMode.SCALE;

    private rootNode: Node = null;
    private canvas: Canvas = null;

    protected onLoad(): void {
        // 禁用节点上的 Widget 组件
        const widget = this.node.getComponent(Widget);
        if (widget) widget.enabled = false;

        // 获取场景中的 Canvas
        this.rootNode = this.node;
        this.canvas = this.getComponent(Canvas);
        
        if (!this.canvas) {
            console.error('ScreenAdapter 必须挂载在带有 Canvas 组件的节点上！');
            this.destroy();
            return;
        }
    }

    protected onEnable(): void {
        this.updateAdapter();
        view.on('canvas-resize', this.updateAdapter, this);
    }

    protected onDisable(): void {
        view.off('canvas-resize', this.updateAdapter, this);
    }

    private updateAdapter(): void {
        const winSize = new Size(
            screen.windowSize.width / view['_scaleX'],
            screen.windowSize.height / view['_scaleY']
        );

        const ut = this.node.getComponent(UITransform);
        
        switch (this.adapterMode) {
            case AdapterMode.STRETCH:
                // 拉伸模式：直接拉伸到全屏
                this.rootNode.setScale(
                    winSize.width / ut.width,
                    winSize.height / ut.height
                );
                this.node.setPosition(
                    winSize.width * (ut.anchorX - 0.5),
                    winSize.height * (ut.anchorY - 0.5)
                );
                break;

            case AdapterMode.SCALE:
                // 等比缩放模式：保持比例缩放
                const scale = winSize.width / winSize.height > ut.width / ut.height
                    ? winSize.height / ut.height
                    : winSize.width / ut.width;
                    
                this.rootNode.setScale(scale, scale);
                this.node.setPosition(
                    ut.width * (ut.anchorX - 0.5),
                    ut.height * (ut.anchorY - 0.5)
                );
                break;
        }
    }

    // 为全屏节点添加适配组件
    public makeFullScreen(node: Node): void {
        const widget = node.getComponent(Widget) || node.addComponent(Widget);
        widget.isAlignTop = widget.isAlignBottom = widget.isAlignLeft = widget.isAlignRight = true;
        widget.top = widget.bottom = widget.left = widget.right = 0;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        widget.updateAlignment();
    }
}