import { IDialogAction } from './public';
export interface message extends EditorMessageMap {
    'query-information': {
        params: [
            string,
            { force?: boolean }?,
        ],
        result: {
            enable: boolean;
            complete: boolean;
            form: string;
        } | null,
    },
    'information-dialog': {
        params: [
            string,
            { [key: string]: string }?
        ],
        result: IDialogAction,
    },
    'has-dialog': {
        params: [
            string,
        ],
        result: boolean,
    },
    'close-dialog': {
        params: [
            string,
        ],
        result: void,
    }
}
