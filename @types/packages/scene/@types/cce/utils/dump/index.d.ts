/// <reference path="../../../../../../../resources/3d/engine/bin/.declarations/cc.d.ts" />
/// <reference path="../../public/gizmos/utils/engine/3d.d.ts" />
/// <reference path="../../public/gizmos/3d/gizmo-manager.d.ts" />
/// <reference path="../../3d/manager/asset/asset-watcher.d.ts" />
/// <reference types="cc" />
import { IProperty } from '../../../../@types/public';
export declare function get(node: any): import("../../../../@types/public").INode | import("../../../../@types/public").IScene;
export declare function getComponent(comp: any): import("../../../../@types/public").IComponent;
export declare function set(dump: any, node?: any): Promise<void | import("cc").Node | null>;
export declare function patch(path: string, dump: IProperty, node: any): Promise<any>;
/**
 * 设置节点在该路径下的默认值
 * @param path 数据路径
 * @param node 节点
 */
export declare function resetProperty(node: any, path: string): void;
/**
 * 将一个属性其现存值与定义类型值不匹配，或者为 null 默认值，改为一个可编辑的值
 * @param path 数据路径
 * @param node 节点
 */
export declare function updatePropertyFromNull(node: any, path: string): void;
//# sourceMappingURL=index.d.ts.map