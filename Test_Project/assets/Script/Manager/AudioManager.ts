import { _decorator, Component, AudioClip, AudioSource } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager = null;
    
    @property({ type: AudioClip })
    private bgm: AudioClip = null;
    
    @property({ type: AudioClip })
    private iceBreakSound: AudioClip = null;
    
    @property({ type: AudioClip })
    private winSound: AudioClip = null;
    
    @property({ type: AudioClip })
    private gameOverSound: AudioClip = null;

    @property({ type: AudioClip })
    private carMoveSound: AudioClip = null;    

    @property({ type: AudioClip })
    private deliverySound: AudioClip = null;    //将资源投放的声音
    
    @property({ type: AudioClip })
    private iceImpactSound: AudioClip = null;   // 冰块碰撞但不能破坏的声音
    
    @property({ type: AudioClip })
    private changeVehicleSound: AudioClip = null;   // 切换车辆的声音

    @property({ type: AudioClip })
    private walkSound: AudioClip = null;   
    
    @property({ type: AudioSource })
    private bgmSource: AudioSource = null;
    
    @property({ type: AudioSource })
    private sfxSource: AudioSource = null;  
    
    @property({ type: AudioSource })
    private loopSfxSource: AudioSource = null;  // 用于循环音效
    
    private currentLoopSound: string = '';  // 当前正在循环播放的音效
    
    public static get instance(): AudioManager {
        return this._instance;
    }
    
    onLoad() {
        if (AudioManager._instance === null) {
            AudioManager._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }
    
    public playBGM() {
        if (this.bgmSource && this.bgm) {
            this.bgmSource.clip = this.bgm;
            this.bgmSource.loop = true;
            this.bgmSource.play();
        }
    }
    
    public playSound(soundName: string) {
        let clip: AudioClip = null;
        
        switch (soundName) {
            case 'ice_break':
                clip = this.iceBreakSound;
                break;
            case 'victory':
                clip = this.winSound;
                break;
            case 'delivery':
                clip = this.deliverySound;
                break;
            case 'game_over':
                clip = this.gameOverSound;
                break;
            case 'iceImpact':
                clip = this.iceImpactSound;
                break;
            case 'changeVehicle':
                clip = this.changeVehicleSound;
                break;
            
            default:
                console.warn(`Sound ${soundName} not found`);
                return;
        }
        
        if (this.sfxSource && clip) {
            this.sfxSource.playOneShot(clip);
        }
    }
    
    public playLoopSound(soundName: string) {
        // 如果已经在播放相同的循环音效，则不重复播放
        if (this.currentLoopSound === soundName) {
            return;
        }
        
        let clip: AudioClip = null;
        
        switch (soundName) {
            case 'car_move':
                clip = this.carMoveSound;
                break;
            case 'walk':
                clip = this.walkSound;
                break;
            default:
                console.warn(`Loop sound ${soundName} not found`);
                return;
        }
        
        if (this.loopSfxSource && clip) {
            if (this.currentLoopSound !== soundName) {
                this.stopLoopSound(); // 只在切换不同音效时停止
            }
            
            this.loopSfxSource.clip = clip;
            this.loopSfxSource.loop = true;
            this.loopSfxSource.play();
            this.currentLoopSound = soundName;
        }
    }
    
    public stopLoopSound() {
        if (this.loopSfxSource && this.loopSfxSource.playing) {
            this.loopSfxSource.stop();
            this.currentLoopSound = '';
        }
    }
    
    public stopBGM() {
        if (this.bgmSource) {
            this.bgmSource.stop();
        }
    }
    
    public stopAllSounds() {
        this.stopBGM();

        this.stopLoopSound();
        if (this.sfxSource) {
            this.sfxSource.stop();
            this.sfxSource.volume = 0;
        setTimeout(() => {
            this.sfxSource.volume = 1;
        }, 100);
        }
    }
}