const path = require('path');
const fs = require('fs');
const axios = require('axios');
const ora = require('ora');
const Inquirer = require('Inquirer');
const chalk = require('chalk');
const { promisify } = require('util');
const { downloadDirectory } = require('./utils/constants.js');

let downLoadGit = require('download-git-repo');
downLoadGit = promisify(downLoadGit);

let ncp = require('ncp');
ncp = promisify(ncp);

const MetalSmith = require('metalsmith');
let { render } = require('consolidate').ejs;
render = promisify(render);

//在config新建配置文件（.yangrc）,便于其他地方的应用这个变量
// const config = require('./config');
// const repoUrl = config('getVal', 'project-name');


// 1).获取仓库列表
const fetchRepoList = async () => {
    // 获取当前组织中的所有仓库信息,这个仓库中存放的都是项目模板
    const { data } = await axios.get('https://api.github.com/orgs/zhu-cli/repos');
    return data;
};
// 2).获取版本信息
const fetchTagList = async (repo) => {
    const { data } = await axios.get(`https://api.github.com/repos/zhu-cli/${repo}/tags`);
    return data;
};
//封装loading
const wrapFetchAddLoding = (fn, message) => async (...args) => {
    const spinner = ora(message);
    spinner.start(); // 开始loading
    const r = await fn(...args);
    spinner.succeed(); // 结束loading
    return r;
};
// 3) 下载项目至dest, 并返回下载的最终目录地址
const download = async (repo, tag) => {
    let api = `zhu-cli/${repo}`;
    if (tag) {
        api += `#${tag}`;
    }
    const dest = `${downloadDirectory}/${repo}`; // 将模板下载到对应的目录中

    await downLoadGit(api, dest);
    return dest; // 返回下载的最终目录
};
module.exports = async (projectName) => {
    let repos = await wrapFetchAddLoding(fetchRepoList, 'fetching repo list ...')();
    // 选择模板
    repos = repos.map((item) => item.name);
    const { repo } = await Inquirer.prompt({
        name: 'repo',
        type: 'list',
        message: 'please choice repo template to create project',
        choices: repos, // 选择模式
    });

    // 获取版本信息
    let tags = await wrapFetchAddLoding(fetchTagList, 'fetching tag list ...')(repo);
    // 选择版本
    tags = tags.map((item) => item.name);
    const { tag } = await Inquirer.prompt({
        name: 'tag',
        type: 'list',
        message: 'please choice tag template to create project',
        choices: tags,
    });
    //获取下载路径
    const target = await wrapFetchAddLoding(download, 'download template ...')(repo, tag);
    
    
    if (!fs.existsSync(path.join(target, 'ask.js'))) {
        //4) 简单项目，将下载在dest目录中的项目，拷贝到当前路径下
        await ncp(target, path.join(path.resolve(), projectName));
        console.log(chalk.green(`create success !!!`))
    } else {
        await new Promise((resovle, reject) => {
            MetalSmith(__dirname)
                .source(target) // 遍历下载的目录
                .destination(path.join(path.resolve(), projectName)) // 输出渲染后的结果
                .use(async (files, metal, done) => {
                    // 弹框询问用户
                    const result = await Inquirer.prompt(require(path.join(target,
                        'ask.js')));
                    const data = metal.metadata();
                    Object.assign(data, result); // 将询问的结果放到metadata中保证在下一个中间件中可以获取到
                    delete files['ask.js'];
                    done();
                })
                .use((files, metal, done) => {
                    Reflect.ownKeys(files).forEach(async (file) => {
                        let content = files[file].contents.toString(); // 获取文件中的内容
                        if (file.includes('.js') || file.includes('.json')) { // 如果是js或者json才有可能是模板
                            if (content.includes('<%')) { // 文件中用<% 我才需要编译
                                content = await render(content, metal.metadata()); // 用数据渲染模板
                                files[file].contents = Buffer.from(content); // 渲染好的结果替换即可
                            }
                        }
                    });
                    done();
                })
                .build((err) => { // 执行中间件
                    if (!err) {
                        resovle();
                        console.log(chalk.green(`create success !!!`))
                    } else {
                        reject();
                        console.log(chalk.red(`create failure ...`))
                    }
                });
        });
    }
};
