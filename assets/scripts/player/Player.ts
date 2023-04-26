import { _decorator, Node } from 'cc';
const { ccclass } = _decorator;

import { Character } from '../framework/character/Character';
import { PlayerControl } from './PlayerControl';
import { PlayerInfo } from './PlayerInfo';

/**
 * 角色
 */
@ccclass('Player')
export class Player extends Character {

    static create(data: PlayerInfo) {
        const node = new Node(data.name);
        const player = node.addComponent('Player') as Player;
        player.init(data);
        return player;
    }

    data: PlayerInfo;
    control: PlayerControl;

    public init (data: PlayerInfo) {
        this.control = this.node.addComponent(PlayerControl);
        this.control.register();
        this.data = data;

    }


}