import { CharacterInfo } from '../framework/character/CharacterInfo';

export class PlayerInfo extends CharacterInfo {

    static read(name: string): Promise<PlayerInfo> {
        return new Promise((resolve, reject) => {
            CharacterInfo.load(name)
                .then((json: Record<string, any>) => {
                    resolve(new PlayerInfo(json));
                });
        });
    }


}