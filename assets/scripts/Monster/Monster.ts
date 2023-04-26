import { Component, _decorator, Node } from 'cc';
import { Character } from '../framework/character/Character';
import { MonsterInfo } from './MonsterInfo';

const { ccclass } = _decorator;

/**
 * 怪物
 */
@ccclass('Monster')
export class Monster extends Character {

    static create(data: MonsterInfo) {
        const node = new Node(data.name);
        const player = node.addComponent('Monster') as Monster;
        player.init(data);
        return player;
    }

    init(data: MonsterInfo) {
        throw new Error('Method not implemented.');
    }

}