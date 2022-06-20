/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
export default function propByPath(object, path, value) {
    const parts = path.split('.');
    const limit = parts.length - 1;
    for (let i = 0; i < limit; ++i) {
        const key = parts[i];
        object = object[key] ?? (object[key] = {});
    }
    const key = parts[limit];
    if (value !== undefined) {
        object[key] = value;
    }
    return object[key];
}
