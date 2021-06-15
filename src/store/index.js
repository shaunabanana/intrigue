import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        data: {
            nodes: [],
            edges: []
        },
        nodeMap: {},
        edgeMap: {},
        edgeNodeMap: {},
        selection: [],
    },
    mutations: {
        increment (state) {
            state.count++;
        }
    }
})