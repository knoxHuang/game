import { _decorator, Component, director, Node } from 'cc';
import { AudioMgr } from './framework/AudioMgr';
import { Player } from './player/Player';
import { CharacterInfo } from './framework/character/CharacterInfo';
import { PlayerInfo } from './player/PlayerInfo';
const { ccclass, property } = _decorator;

@ccclass('Game')
export class Game extends Component {

    private static _instance: Game;
    static Game: Game;
    public static get instance () {
        if (!Game._instance) {
            const node = new Node('Game');
            director.getScene().addChild(node);
            Game._instance = node.addComponent(Game);
        }
        return Game._instance;
    }

    public audioMgr: AudioMgr;

    public player: Player;

    onLoad () {
        this.audioMgr = new AudioMgr();

        PlayerInfo.read('player')
            .then((info) => {
                this.player = Player.create(info);
            });
    }

    start() {
        this.audioMgr.playBGM('bgm');

    }

    update(deltaTime: number) {
        // 处理事件

        // 游戏逻辑
    }
}

