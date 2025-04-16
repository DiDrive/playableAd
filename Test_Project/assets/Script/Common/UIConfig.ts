export enum UIType{
    GAMEOVER = 'GameOverUI',
    VICTORY = 'VictoriUI',
    DOWNLOAD = 'DownloadButton',
    HUD = 'HUD',   //主界面UI，温度条等
    GUIDE = 'GuideUI'
}

export interface UIConfig{
    path:string;
    type:UIType;
    layer?:UILayer;
    cache?:boolean;
}

export enum UILayer{
    BOTTON, //底层，放置HUD、背景等常驻UI
    MIDDLE, //中层，放置菜单等普通游戏界面
    TOP,    //顶层，放置提示、弹窗等
    SYSTEM  //系统层，放置加载界面、系统提示等最高优先级的UI
}

export const UI_CONFIG:{[key in UIType]:UIConfig}={
    [UIType.GAMEOVER]:{
        path:'Prefabs/UI/GameOverUI',
        type:UIType.GAMEOVER,
        layer:UILayer.SYSTEM,
        cache:true  //是否缓存
    },
    [UIType.VICTORY]:{
        path:'Prefabs/UI/VictoryUI',
        type:UIType.VICTORY,
        layer:UILayer.SYSTEM,
        cache:true
    },
    [UIType.DOWNLOAD]:{
        path:'Prefabs/UI/DownloadButton',
        type:UIType.DOWNLOAD,
        layer:UILayer.TOP,
        cache:true
    },
    [UIType.HUD]:{
        path:'Prefabs/UI/HUD',
        type:UIType.HUD,
        layer:UILayer.BOTTON,
        cache:true
    },
    [UIType.GUIDE]:{
        path:'Prefabs/UI/GuideUI',
        type:UIType.GUIDE,
        layer:UILayer.TOP, 
        cache:true
    }
}