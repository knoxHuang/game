import { AssetManager, assetManager, JsonAsset } from 'cc';

export class CharacterInfo {

    static KEY = 'info';

    // 名字
    name = '未定义';
    // 生命值（Health Points, HP）：角色的生命值，代表角色还能承受多少伤害。
    hp = 100;
    // 魔法值（Magic Points, MP）：角色使用魔法所需的能量。
    mp = 100;
    // 力量（Strength, STR）：角色的力量，影响角色的攻击力。
    strength = 10;
    // 敏捷（Dexterity, DEX）：角色的敏捷，影响角色的闪避率和命中率。
    dexterity = 10;
    // 智力（Intelligence, INT）：角色的智力，影响角色的魔法攻击力和魔法防御力。
    intelligence = 10;
    // 体力（Stamina, STA）：角色的体力，影响角色的耐力和生命值。
    stamina = 10;
    // 魔力（Mana, MANA）：角色的魔力，影响角色的魔法攻击力和魔法防御力。
    mana = 10;
    // 攻击力（Attack, ATK）：角色的攻击力，用于计算角色的物理攻击伤害。
    attack = 10;
    // 防御力（Defense, DEF）：角色的防御力，用于计算角色受到的物理攻击伤害。
    defense = 10;
    // 魔法攻击力（Magic Attack, MATK）：角色的魔法攻击力，用于计算角色的魔法攻击伤害。
    magicAttack = 10;
    // 魔法防御力（Magic Defense, MDEF）：角色的魔法防御力，用于计算角色受到的魔法攻击伤害。
    magicDefense = 10;
    // 命中率（Accuracy, ACC）：角色的命中率，影响角色的物理攻击和技能的命中率。
    accuracy = 10;
    // 闪避率（Evasion, EVA）：角色的闪避率，影响角色的物理攻击和技能的闪避率。
    evasion = 10;
    // 暴击率（Critical Rate, CRIT）：角色的暴击率，影响角色的物理攻击和技能的暴击率。
    speed = 10;


    static load(name: string) {
        return new Promise((resolve, reject) => {
            const bundle = assetManager.getBundle(CharacterInfo.KEY);
            if (!bundle) {
                assetManager.loadBundle(CharacterInfo.KEY, (err: Error | null, bundle: AssetManager.Bundle) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    bundle.load(name, JsonAsset, (err, asset: JsonAsset) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(asset.json);
                    });
                });
            } else {
                bundle.load(name, JsonAsset, (err, asset: JsonAsset) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(asset.json);
                });
            }
        });
    }

    constructor(json: Record<string, any>) {
        for (let key in json) {
            this[key] = json[key];
        }
    }

}