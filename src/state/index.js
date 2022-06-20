/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */

import { createMachine, assign } from 'xstate';

const ViewingState = {
    initial: 'Idle',
    states: {
        Idle: {
            on: {
                'editing title': 'TitleEditing',
                'space pressed': { target: 'Panning', actions: 'setPanning' },
                'start dragging': { target: 'Dragging', actions: 'setDragging' },
                'update selection': { target: 'Selecting', actions: 'setSelection' },
                'create node': { target: '#Intrigue.Editing', actions: 'setEditing' },
                'dblclick node': { target: '#Intrigue.Editing', actions: 'setEditing' },
            },
        },

        TitleEditing: {
            on: { 'stop editing title': 'Idle' },
        },

        Panning: {
            on: {
                'space released': { target: 'Idle', actions: 'clearPanning' },
            },
        },

        Selecting: {
            on: {
                'update selection': { target: 'Selecting', actions: 'setSelection' },
                'done selecting': { target: 'Idle' },
            },
        },

        Dragging: {
            on: {
                'drop enter': { target: 'Dropping', actions: 'setDropping' },
                'stop dragging': { target: 'Idle', actions: ['clearDragging', 'clearDetaching'] },
                'start detaching': { target: 'Detaching', actions: 'setDetaching' },
            },
        },

        Dropping: {
            on: {
                'drop leave': { target: 'Dragging', actions: 'clearDropping' },
                'stop dragging': { target: 'Idle', actions: ['clearDragging', 'clearDropping'] },
            },
        },

        Detaching: {
            on: {
                detached: { target: 'Dragging', actions: 'clearDetaching' },
                'stop detaching': { target: 'Idle', actions: 'clearDetaching' },
            },
        },
    },
};

const EditingState = {
    initial: 'Editing',
    states: {
        Editing: {
            on: {
                'editor blur': {
                    target: '#Intrigue.Viewing',
                    actions: 'clearEditing',
                },
                'update selection': {
                    target: '#Intrigue.Viewing',
                    actions: ['clearEditing', 'setSelection'],
                },
            },
        },
    },
};

const ArrangingState = {
    initial: 'Selected',
    states: {
        Selected: {
            on: {
                'click on empty canvas': '#Intrigue.Viewing',
                'drag node handle': 'Resizing',
            },
        },

        Resizing: {
            on: {
                'drag end': 'Selected',
            },
        },
    },
};

const intrigueMachine = createMachine(
    {
        id: 'Intrigue',
        initial: 'Viewing',
        states: {
            Viewing: { ...ViewingState },
            Arranging: { ...ArrangingState },
            Editing: { ...EditingState },
        },
        context: {
            editing: null,
            panning: false,
            dragging: null,
            dropping: null,
            selection: [],
            detaching: [],
        },
    },
    {
        actions: {
            setEditing: assign({
                editing: (context, event) => (context.editing = event.node),
            }),

            clearEditing: assign({
                editing: (context) => (context.editing = null),
            }),

            setPanning: assign({
                panning: (context) => (context.panning = true),
            }),

            clearPanning: assign({
                panning: (context) => (context.panning = false),
            }),

            setDragging: assign({
                dragging: (context, event) => (context.dragging = event.node),
            }),

            clearDragging: assign({
                dragging: (context) => (context.dragging = null),
            }),

            setDropping: assign({
                dropping: (context, event) => (context.dropping = event.node),
            }),

            clearDropping: assign({
                dropping: (context) => (context.dropping = null),
            }),

            setDetaching: assign({
                detaching: (context, event) => (context.detaching = event.detaching),
            }),

            clearDetaching: assign({
                detaching: (context) => (context.detaching = []),
            }),

            setSelection: assign({
                selection: (context, event) => (context.selection = event.selection),
            }),
        },
    },
);

export default intrigueMachine;
// export const state = interpret(intrigueMachine).start();
