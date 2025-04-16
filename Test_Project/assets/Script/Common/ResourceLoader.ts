import { _decorator, Component, Prefab, resources, SpriteFrame, AudioClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ResourceLoader')
export class ResourceLoader extends Component {
    private static _instance: ResourceLoader = null;
    
    public static get instance(): ResourceLoader {
        return this._instance;
    }
    
    onLoad() {
        if (ResourceLoader._instance === null) {
            ResourceLoader._instance = this;
        } else {
            this.node.destroy();
            return;
        }
    }

    // 加载预制体
    // 加载预制体
public loadPrefab(path: string): Promise<Prefab> {
    return new Promise((resolve, reject) => {
        console.log(`开始加载预制体: ${path}`);
        resources.load(path, Prefab, (err, prefab) => {
            if (err) {
                console.error(`加载预制体失败: ${path}`, err);
                reject(err);
                return;
            }
            console.log(`预制体加载成功: ${path}`);
            resolve(prefab);
        });
    });
}

    // 加载多个预制体
    public loadPrefabs(paths: string[]): Promise<Prefab[]> {
        return Promise.all(paths.map(path => this.loadPrefab(path)));
    }

    // 加载图片
    public loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    console.error(`Failed to load sprite frame at ${path}:`, err);
                    reject(err);
                    return;
                }
                resolve(spriteFrame);
            });
        });
    }

    // 加载音频
    public loadAudioClip(path: string): Promise<AudioClip> {
        return new Promise((resolve, reject) => {
            resources.load(path, AudioClip, (err, clip) => {
                if (err) {
                    console.error(`Failed to load audio at ${path}:`, err);
                    reject(err);
                    return;
                }
                resolve(clip);
            });
        });
    }

    // 释放资源
    public releaseAsset(path: string) {
        resources.release(path);
    }

    // 预加载资源
    public preloadAssets(paths: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
            resources.preload(paths, (err) => {
                if (err) {
                    console.error('Failed to preload assets:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
}