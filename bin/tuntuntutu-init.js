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
const rm = require('rimraf').sync


program.usage('<project-name>').parse(process.argv)

// 根据输入，获取项目名称
let pageName = program.args[0]

if (!pageName) {
  program.help()
  return
}
const list = glob.sync('*')
const rootName = path.basename(process.cwd())
console.log(list)
let next
if (list.length) {
  const matchLength = list.filter(name => {
    const fileName = path.resolve(process.cwd(), path.join(name))

    return name.indexOf(pageName) !== -1 && fs.statSync(fileName).isDirectory()
  }).length
  if (matchLength) {
    console.log(`页面${pageName}已经存在`)

    return
  }
  next = Promise.resolve(pageName)
} else if (rootName === pageName) {
  next = inquirer.prompt([
    {
      name: 'buildInCurrent',
      message: '当前目录为空，且目录名称和项目名称相同，是否直接在当前目录下创建新项目？',
      type: 'confirm',
      default: true
    }
  ]).then(answer => {
    return Promise.resolve(answer.buildInCurrent ? '.' : pageName)
  })
} else {
  next = Promise.resolve(pageName)
}

next && go()

function go() {
  next
    .then(projectRoot => {
      if (projectRoot !== '.') {
        fs.mkdirSync(projectRoot)
      }
      return download().then((target) => {
        return {
          metadata: {},
          pageName,
          target,
          projectRoot
        }
      })
    })
    .then(context => {
      return inquirer.prompt([
        {
          type: 'list',
          name: 'pageType',
          message: '请选择类型（module包含路由和多个页面）',
          choices: [
            'module',
            'page',
          ]
        }
      ]).then(answers => {
        return {
          ...context,
          pageType: answers.pageType
        }
      })
    })
    .then(context => {
      const {pageType} = context;
      const prompt = pageType === 'module' ? [
        {
          type: 'list',
          name: 'type',
          message: '请选择模块类型',
          choices: ['list', 'list-modal', 'normal']
        },
        {
          name: 'pageName',
          message: '模板名称',
          default: context.pageName
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
      ] : [
        {
          type: 'list',
          name: 'type',
          message: '请选择页面类型',
          choices: ['normal', 'form']
        },
      ]

      return inquirer.prompt(prompt).then(answers => {
        return {
          ...context,
          metadata: {
            ...answers,
            type: pageType + '-' + answers.type,
          }
        }
      })
    })
    .then(context => {
      const {projectRoot} = context

      return generator(context.metadata, context.target, path.join(path.parse(context.target).dir, projectRoot))
    })
    .then(() => {
      console.log(logSymbols.success, chalk.green('创建成功:)'))
    })
    .catch(err => {
      console.log('失败： ' + err.message)
    })
}

