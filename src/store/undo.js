import SyncedDocument from './sync';

export default class ReversibleDocument extends SyncedDocument {
    constructor(storeStructure, documentId) {
        super(storeStructure, documentId);

        this.inverses = {};
        this.undoStack = [];
        this.redoStack = [];
    }

    registerInverses(actionA, actionB) {
        this.inverses[actionA] = actionB;
        this.inverses[actionB] = actionA;
    }

    commit(action, params) {
        let inverseParams = null;

        // eslint-disable-next-line
        const actionFunction = this[action].bind(this);

        if (actionFunction !== undefined) {
            inverseParams = actionFunction(params);
        } else {
            console.error(`There is no method called ${action}() on this object:`, this);
            return;
        }

        if (!inverseParams) return;

        this.undoStack.push({ action, inverseParams });
        console.log({ action, inverseParams });
        this.redoStack = [];
    }

    popStackItem(fromStack, toStack) {
        if (fromStack.length <= 0) return;
        const item = fromStack.pop();
        if (!item) return;

        const inverseAction = this.inverses[item.action];
        if (!inverseAction) {
            console.error(`There is no registered inverse for ${item.action}().`);
            return;
        }

        let inverseParams;

        // eslint-disable-next-line
        const actionFunction = this[inverseAction].bind(this);

        if (actionFunction !== undefined) {
            inverseParams = actionFunction(item.inverseParams);
        } else {
            console.error(`There is no method called ${inverseAction}() on this object:`, this);
            return;
        }

        toStack.push({
            action: inverseAction,
            inverseParams,
        });
    }

    undo() {
        this.popStackItem(this.undoStack, this.redoStack);
    }

    redo() {
        this.popStackItem(this.redoStack, this.undoStack);
    }
}
