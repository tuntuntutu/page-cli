#!/usr/bin/env node
const program = require('commander')
const path = require('path')
const fs = require('fs-extra')
const glob = require('glob')
const inquirer = require('inquirer')
const download = require('../lib/download')
const generator = require('../lib/generator')
const logSymbols = require('log-symbols')
const chalk = require('chalk')

// 去掉连字符，转为大驼峰
const upperFirstLetter = val=>{
  return val.split('-').map(item=>{
    return item.charAt(0).toUpperCase() + item.slice(1)
  }).join('')
}

program.usage('<project-name>').parse(process.argv)

// 根据输入，获取模块/页面名称
const pageName = program.args[0];

if (!pageName) {
  program.help()
  return
}

const rootNamePromise = getRootName(pageName);

rootNamePromise && go(rootNamePromise, pageName)

// 判断并返回最终模块目录名称的promise
function getRootName(pageName){
  let next;
  const list = glob.sync('*')
  const rootName = path.basename(process.cwd())

  console.log(list) // 打印当前目录下所有目录

  // 当前目录非空
  if (list.length) {
    const matchLength = list.filter(name => {
      const fileName = path.resolve(process.cwd(), path.join(name))

      return name === pageName && fs.statSync(fileName).isDirectory(); // 存在同名文件夹
    }).length

    if (matchLength) {
      console.log(`页面${pageName}已经存在`)

      return
    }
    next = Promise.resolve(pageName)
  } else if (rootName === pageName) { // 当前目录
    next = inquirer.prompt([
      {
        name: 'buildInCurrent',
        message: '当前所在目录为空，且目录名称和待建模块名称相同，是否直接在当前目录下创建新项目？',
        type: 'confirm',
        default: true
      }
    ]).then(answer => {
      return Promise.resolve(answer.buildInCurrent ? '.' : pageName)
    })
  } else {
    next = Promise.resolve(pageName)
  }
  return next;

}

function go(rootName, pageName) {
  rootNamePromise
    .then(projectRoot => {
      return {
        projectRoot,
        pageName
      }
    })
    .then(context => {
      return inquirer.prompt([
        {
          type: 'list',
          name: 'tplType',
          message: '请选择类型（module包含route、config和entry页面，page包含js和less）',
          choices: [
            'module',
            'page',
            'other'
          ]
        }
      ]).then(answers => {
        return {
          ...context,
          tplType: answers.tplType
        }
      })
    })
    .then(context => {  // 收集meta信息用于渲染模板文件的入参
      const { tplType } = context;
      let  prompt;

      switch (tplType) {
        case 'module':
          prompt = [
            {
              type: 'list',
              name: 'tplName',
              message: '请选择模块类型',
              choices: ['list', 'list-modal', 'normal', '其他']
            },
            {
              name: 'pageNameZN',
              message: '模块中文简称',
            }, {
              name: 'description',
              message: '页面简述'
            }, {
              name: 'prd',
              message: 'prd地址',
              default: ''
            }, {
              name: 'remark',
              message: '备注',
              default: ''
            }
          ];
          break;
        case 'page':
          prompt = [
            {
              type: 'list',
              name: 'tplName',
              message: '请选择页面类型',
              choices: ['normal', 'list', 'form']
            }
          ];
          break;
        case 'other':
          prompt = [
            {
              name: 'tplName',
              message: '请输入模板名称',
            },
          ];
          break;
        default:
          prompt = [];
          break;
      }

      return inquirer.prompt(prompt).then(answers => {
        const { tplName } = answers;

        return {
          ...context,
          pageName: context.pageName,
          metadata: {
            ...answers,
            pageName: context.pageName,
            upperPageName: upperFirstLetter(context.pageName),
            type: tplType === 'other' ? tplName : tplType + '-' + tplName,
          }
        }
      })
    })
    .then(context => {
      const { projectRoot, pageName } = context;

      if (projectRoot !== '.') {
        fs.mkdirSync(pageName)
      }
      return download().then((target) => {
        return {
          ...context,
          target,
        }
      })
    })
    .then(context=>{
      const { projectRoot, target, metadata } = context;

      return generator(
        metadata,
        context.target,
        path.join(path.parse(target).dir, projectRoot)
      )
    })
    .then(() => {
      console.log(logSymbols.success, chalk.green('创建成功:)'))
    })
    .catch(err => {
      console.log('失败： ' + err.message)
    })
}

