import isElectron from 'is-electron';
import { encodeStateAsUpdate, applyUpdate } from 'yjs';
// import * as mutex from 'lib0/mutex';
import EventEmitter from '@/utils/event';

export default class LocalFilePersistence extends EventEmitter {
    constructor(filePath, doc, overwrite, fs, debounce) {
        super();
        this.doc = doc;
        this.filePath = filePath;
        this.timeout = null;
        this.debounce = debounce;

        if (isElectron()) {
            // eslint-disable-next-line global-require
            const { readFile, writeFile, access } = require('fs/promises');
            this.readFile = readFile;
            this.writeFile = writeFile;
            this.access = access;
        } else if (fs) {
            const { readFile, writeFile, access } = fs;
            this.readFile = readFile;
            this.writeFile = writeFile;
            this.access = access;
        } else {
            throw new Error('LocalFilePersistence is designed to be used in Electron. Either make sure you are calling this class in an Electron environment, or provide your own async fs implementation.');
        }

        if (!this.filePath) {
            this.emit('synced');
        } else {
            this.access(this.filePath).then(() => {
                if (overwrite) {
                    this.saveToDisk();
                } else {
                    this.readFile(this.filePath).then((data) => {
                        applyUpdate(this.doc, Uint8Array.from(data));
                        this.emit('synced');
                    });
                }
            }).catch(() => {
                // console.error(`Cannot access file at ${this.filePath}`);
                this.saveToDisk();
            });
        }
        this.doc.on('update', this.triggerAutosave.bind(this));
    }

    triggerAutosave() {
        if (!this.debounce) return;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.timeout = setTimeout(() => {
            if (!this.filePath) return;

            console.log('[LocalFilePersistence][triggerAutosave@timeout] Saving to disk.');
            this.saveToDisk();
        }, this.debounce);
    }

    saveToDisk() {
        if (!this.filePath) return;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }

        this.emit('save');
        this.writeFile(this.filePath, encodeStateAsUpdate(this.doc)).then(() => {
            // if (callback) callback();
            this.emit('saved');
        });
    }
}
