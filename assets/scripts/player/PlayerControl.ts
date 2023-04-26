import { _decorator, EventKeyboard, KeyCode } from 'cc';
import { CharacterControl } from '../framework/character/CharacterControl';
import { Game } from '../Game';
const { ccclass, property } = _decorator;

@ccclass('PlayerControl')
export class PlayerControl extends CharacterControl {

    onKeyDown(event: EventKeyboard): void {
        switch (event.keyCode) {
            case KeyCode.KEY_B:
                Game.instance.audioMgr.pause();
                break;
            case KeyCode.KEY_N:
                Game.instance.audioMgr.play();
                break;
            case KeyCode.KEY_M:
                Game.instance.audioMgr.stop();
                break;
        }
    }

    onKeyUP(event): void {
    }
    onTouchStart(event): void {
        Game.instance.audioMgr.playOneShot('chujian');
    }

    onTouchEnd(event): void {
    }

    onTouchMove(event): void {
    }

}