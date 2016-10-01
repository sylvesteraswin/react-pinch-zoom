import del from 'del';

module.exports = () => {
    del.sync(['dist']);
};
