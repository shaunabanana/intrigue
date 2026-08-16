import { createApp } from 'vue';
import Form from '@arco-design/web-vue/es/form';
import '@arco-design/web-vue/es/form/style/css';
import Radio from '@arco-design/web-vue/es/radio';
import '@arco-design/web-vue/es/radio/style/css';
import Tag from '@arco-design/web-vue/es/tag';
import '@arco-design/web-vue/es/tag/style/css';
import Icon from '@arco-design/web-vue/es/icon';
import Space from '@arco-design/web-vue/es/space';
import '@arco-design/web-vue/es/space/style/css';

import PreferencesContent from './components/PreferencesContent.vue';

import './preferences.css';

const app = createApp(PreferencesContent);

app.use(Form);
app.use(Radio);
app.use(Tag);
app.use(Icon);
app.use(Space);

app.mount('#preferences');
