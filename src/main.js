import { createApp } from 'vue';
import Button from '@arco-design/web-vue/es/button';
import Card from '@arco-design/web-vue/es/card';
import Grid from '@arco-design/web-vue/es/grid';
import Message from '@arco-design/web-vue/es/message';
import Modal from '@arco-design/web-vue/es/modal';
import Space from '@arco-design/web-vue/es/space';
import Spin from '@arco-design/web-vue/es/spin';
import Textarea from '@arco-design/web-vue/es/textarea';
import '@arco-design/web-vue/es/button/style/css';
import '@arco-design/web-vue/es/card/style/css';
import '@arco-design/web-vue/es/grid/style/css';
import '@arco-design/web-vue/es/message/style/css';
import '@arco-design/web-vue/es/modal/style/css';
import '@arco-design/web-vue/es/space/style/css';
import '@arco-design/web-vue/es/spin/style/css';
import '@arco-design/web-vue/es/textarea/style/css';

import App from './App.vue';

const app = createApp(App);

app.use(Button);
app.use(Card);
app.use(Grid);
app.use(Message);
app.use(Modal);
app.use(Space);
app.use(Spin);
app.use(Textarea);

app.mount('#app');
