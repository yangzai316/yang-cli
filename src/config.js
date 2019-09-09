const fs = require('fs');
const chalk = require('chalk');
const { encode, decode } = require('ini');
const { defaultConfig, configFile } = require('./utils/constants.js');

module.exports = (action, k, v) => {
    const flag = fs.existsSync(configFile);
    const obj = {};
    if (flag) { // 配置文件存在 （  C:\Users\cunyang.liu/.yangrc  ）
        const content = fs.readFileSync(configFile, 'utf8');
        const c = decode(content); // 将文件解析成对象
        Object.assign(obj, c);
    }
    if (action === 'get') {
        console.log(obj[k] || defaultConfig[k]);
    } else if (action === 'set') {
        obj[k] = v;
        fs.writeFileSync(configFile, encode(obj)); // 将内容转化ini格式写入到字符串中
        console.log(chalk.green(`${k}=${v} set success`)); 
    }else if (action === 'getVal') {
        return obj[k];
    }else{
        console.log(chalk.red('Not found command in config'));
    }
    // ...
};
