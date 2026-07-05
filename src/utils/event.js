export default class EventEmitter {
    constructor() {
        this.events = {};
        // this.emitter = createNanoEvents();
    }

    // eslint-disable-next-line
    on(event, callback) {
        // return this.emitter.on(event, callback);
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
        return () => {
            this.events[event] = this.events[event]?.filter((i) => callback !== i);
        };
    }

    emit(event, ...args) {
        // this.emitter.emit(event, data);
        const callbacks = this.events[event] || [];
        callbacks.forEach((callback) => callback(...args));
        // for (let i = 0, { length } = callbacks; i < length; i += 1) {
        //     callbacks[i](...args);
        // }
    }
}
