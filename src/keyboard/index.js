import { createKeybindingsHandler } from 'tinykeys';

export default class Keyboard {
    constructor() {
        this.handlers = [];
    }

    on(event, key, handler) {
        const options = {};
        options[key] = handler;
        const keyBindingHandler = createKeybindingsHandler(options);
        window.addEventListener(event, keyBindingHandler);
        this.handlers.push({
            event,
            handler: keyBindingHandler,
        });
    }

    removeListeners() {
        this.handlers.forEach((handler) => {
            window.removeEventListener(handler.event, handler.handler);
        });
    }
}
