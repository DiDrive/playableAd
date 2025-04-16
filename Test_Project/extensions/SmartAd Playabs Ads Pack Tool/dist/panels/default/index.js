"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
/**
 * @zh 如果希望兼容 3.3 之前的版本可以使用下方的代码
 * @en You can add the code below if you want compatibility with versions prior to 3.3
 */
// Editor.Panel.define = Editor.Panel.define || function(options: any) { return options }
module.exports = Editor.Panel.define({
    listeners: {
        show() { console.log('show'); },
        hide() { console.log('hide'); },
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        cancel_btn: '#cancel_btn',
        pack_btn: '#pack_btn',
        help_link: '#help_link',
        msg: '#msg'
    },
    methods: {
        hello() {
        },
    },
    ready() {
        const smartAd = require((0, path_1.join)(__dirname, '../../../static/script/smartAd'));
        this.$.cancel_btn && this.$.cancel_btn.addEventListener('click', () => {
            Editor.Panel.close('smartad');
        });
        const _self = this;
        this.$.pack_btn && this.$.pack_btn.addEventListener('click', () => {
            try {
                console.log("begin");
                // let token = this.$token.value;
                smartAd.main(function msgCallback(msg) {
                    console.log("msgCallback", msg);
                    if (_self.$.msg) {
                        _self.$.msg.innerHTML = msg;
                    }
                });
            }
            catch (e) {
                console.log(e);
            }
        });
        this.$.help_link && this.$.help_link.addEventListener('click', () => {
            smartAd.openDefaultBrowser('https://www.smartad.pro/help');
        });
    },
    beforeClose() { },
    close() { },
});
