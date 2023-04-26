import { _decorator, Component, EventKeyboard, EventTouch, Input, input, Node } from 'cc';
const { ccclass } = _decorator;

@ccclass('CharacterControl')
export abstract class CharacterControl extends Component {

    public register() {
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUP, this);
    }

    onDestroy (){
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUP, this);
    }

    abstract onTouchStart(event: EventTouch): void;
    abstract onTouchMove(event: EventTouch): void;
    abstract onTouchEnd(event: EventTouch): void;
    abstract onKeyDown(event: EventKeyboard): void;
    abstract onKeyUP(event: EventKeyboard): void;

}