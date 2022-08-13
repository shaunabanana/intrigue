import SyncedDocument from './sync';

export default class ReversibleDocument extends SyncedDocument {
    constructor(storeStructure, documentId) {
        super(storeStructure, documentId);

        this.inverses = {};
        this.undoStack = [];
        this.redoStack = [];

        this.previousTime = -1;
        this.captureTimeout = 50;
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

        const currentTime = Date.now();
        if (Math.abs(currentTime - this.previousTime) < this.captureTimeout) {
            console.log('[Undo][Commit] Capturing.');
            // If the previous item is not in an array, then put it inside one.
            if (!Array.isArray(this.undoStack[this.undoStack.length - 1])) {
                this.undoStack[this.undoStack.length - 1] = [
                    this.undoStack[this.undoStack.length - 1],
                ];
            }
            this.undoStack[this.undoStack.length - 1].push({ action, inverseParams });
        } else {
            this.undoStack.push({ action, inverseParams });
        }
        this.previousTime = currentTime;
        // console.log(`[Undo][Commit] ${JSON.stringify(this.undoStack, null, 2)}`);

        this.redoStack = [];
    }

    popStackItem(fromStack, toStack) {
        if (fromStack.length <= 0) return;
        let lastRecord = fromStack.pop();
        if (!lastRecord) return;

        if (!Array.isArray(lastRecord)) lastRecord = [lastRecord];

        const toStackRecord = [];
        lastRecord.reverse().forEach((item) => {
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
            }

            toStackRecord.push({
                action: inverseAction,
                inverseParams,
            });
        });

        toStack.push(toStackRecord.length === 1 ? toStackRecord[0] : toStackRecord);
    }

    undo() {
        this.popStackItem(this.undoStack, this.redoStack);
    }

    redo() {
        this.popStackItem(this.redoStack, this.undoStack);
    }
}
