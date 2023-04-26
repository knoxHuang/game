import { Component, _decorator } from 'cc';
import { CharacterInfo } from './CharacterInfo';

const { ccclass } = _decorator;

/**
 * 角色基类
 */
@ccclass('Character')
export abstract class Character extends Component {

    abstract init(data: CharacterInfo);

}