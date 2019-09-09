const { name, version } = require('../../package.json');
//darwin => MAC
const downloadDirectory = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.template`;

// 配置文件的存储位置
const configFile = `${process.env[process.platform === 'darwin' ? 'HOME' : 'USERPROFILE']}/.yangrc`; 

const defaultConfig = {
    repo: 'zhu-cli', // 默认拉取的仓库名
};











module.exports = {
    name,
    version,
    downloadDirectory,
    configFile,
    defaultConfig
};
