import { _decorator, Component, Node } from 'cc';
import { Game } from './Game';
const { ccclass, property } = _decorator;

@ccclass('Launcher')
export class Launcher extends Component {

    game: Game;

    onLoad() {
        this.game = Game.instance;
    }
    start() {

    }

    update(deltaTime: number) {
        
    }
}

