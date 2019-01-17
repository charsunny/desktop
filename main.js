// Modules to control application life and create native browser window
const {
  app,
  session,
  BrowserWindow,
  Tray,
  shell,
  Menu,
  ipcMain,
  nativeImage
} = require('electron')

const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

let tray = null

const filter = {
  urls: ['*://*/api/*', '*://*/v5/*', '*://*/v3/*']
}

let SiteURLs = [{
  name: "开发环境",
  url: "http://localhost:9527"
}, {
  url: 'https://h5.atelan.cn/admin',
  name: "生产环境"
}]

let printerList = []

let appConfig = {}

const appPath = app.getPath("appData")
const appDataDir = path.join(appPath, app.getName())
const configPath = path.join(appDataDir, 'config.json')

// get url config
if (fs.existsSync(configPath)) {
  try {
    appConfig = JSON.parse(fs.readFileSync(configPath))
    console.log(appConfig)
    if (appConfig.sites && appConfig.sites.length) {
      SiteURLs = SiteURLs.concat(appConfig.sites)
    }
  } catch (e) {
    appConfig = {}
  }
} else {
  if (!fs.existsSync(appDataDir)) {
    fs.mkdir(appDataDir)
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
}

function createWindow() {
  if (tray == null) {
    // const image = nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABmUlEQVQ4T4XTSejOURTG8c+fbChlWFEokeFPiZ2pLCykRCJFhmJjoQwllDJEUoaijAuEspDCQmRjwUKGSAilWCgKG0L06Pzy9vbiV3dx7z2/77nPc87p8u9vKAbiEb52Cu3qcDgC+zAVfev+B57gAI63/tMOWIFD+IkreF3Zv2ALxuAaFuFDQK2AhTiPhziLwEZWtvc4jLfYWzHT8L0B9KlsTeAubEb2Ae3ENvTE6ZKyMnIawHKcxDycwwmsrf06TMKUev5BzEAvTGgAoc7CnjJvCLI+lsweGID9WFY+bc9ZA7iB3niMu+X0VdzHVnzGaDzDN+TFSdrdAC4hNb+Jd3haMuJBgAtwChvLq9U4gmENIKZF8xIcwytswuR68kyswXxcx6eC9m8A4/EAO5Dg1H9x+bK+QHNwFHPLzAuR0toHFzEbCdxQmgMdhTcYhFVVwuEYi+etgH64jVymG28VJBV4kabBbgwuWWfaOzH7VCJzkExp3zsIuBsBvcTSgv9u0k7DlPOJmI5xNY2Rcg+X26fyb4D/TPmf618Tsl5x/gOTBQAAAABJRU5ErkJggg==")

    const imgPath = path.join(process.resourcesPath, 'iconTemplate.png')

    let image = nativeImage.createFromPath(imgPath)
    if (image.isEmpty()) {
      image = nativeImage.createFromPath('./iconTemplate.png')
    }

    tray = new Tray(image)

    const contextMenu = Menu.buildFromTemplate([{
        label: '打印设置',
        submenu: [{
          label: '小票打印机',
          submenu: printerList.map((printer) => {
            return {
              label: printer.name,
              checked: appConfig.sp == printer,
              click: () => {
                if (appConfig.sp != printer) {
                  appConfig.sp = printer;
                  fs.writeFileSync(configPath, JSON.stringify(appConfig))
                }
              }
            }
          })
        }, {
          label: 'A4打印机',
          submenu: printerList.map((printer) => {
            return {
              label: printer.name,
              checked: appConfig.ap == printer,
              click: () => {
                if (appConfig.ap != printer) {
                  appConfig.ap = printer;
                  fs.writeFileSync(configPath, JSON.stringify(appConfig))
                }
              }
            }
          })
        }]
      },
      {
        label: '环境选择',
        submenu: SiteURLs.map((url, index) => {
          return {
            label: url.name || url.url.substr(0, 8),
            checked: (!appConfig.site && index == 0) || appConfig.site == index,
            type: "radio",
            click: () => {
              if (appConfig.site != index) {
                appConfig.site = index
                mainWindow.loadURL(url.url)
                fs.writeFileSync(configPath, JSON.stringify(appConfig))
              }
            }
          }
        }) 
      },
      {
        label: '访问官网',
        click: () => {
          shell.openExternal("https://che8j.com")
        }
      },
      {
        label: '退出程序',
        click: () => {
          app.exit();
        }
      }
    ])
    tray.setToolTip('This is my application.')
    tray.on('double-click', () => {
      if (mainWindow === null) {
        createWindow()
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show()
      }
    })
    tray.setContextMenu(contextMenu)
  }


  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      webSecurity: false
    }
  })

  //load the index.html of the app. 禁用html的缓存
  mainWindow.loadURL(SiteURLs[appConfig.site || 0].url, {
    "extraHeaders": "pragma: no-cache\n"
  })
  
  // // proxy form html files
  // session 
  //   .defaultSession
  //   .webRequest
  //   .onBeforeRequest(filter, (details, callback) => {
  //     if (details.url.indexOf("https://s4syun.com/") >= 0 || details.url.indexOf("https://dev.che8j.com/") >= 0) {
  //       callback({
  //         cancel: false
  //       })
  //       return
  //     }
  //     let reg = /^http(s)?:\/\/(.*?)\//
  //     let url = details.url.replace(reg, "https://dev.che8j.com/")
  //     callback({
  //       cancel: false,
  //       redirectURL: url
  //     })
  //   })
    mainWindow.webContents.openDevTools()
  // Open the DevTools. mainWindow.webContents.openDevTools() Emitted when the
  // window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows in an array if
    // your app supports multi windows, this is the time when you should delete the
    // corresponding element.
    mainWindow = null
  })

  printerList = mainWindow.webContents.getPrinters()
  console.log(printerList)
}

// This method will be called when Electron has finished initialization and is
// ready to create browser windows. Some APIs can only be used after this event
// occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar to stay active
  // until the user quits explicitly with Cmd + Q
  // if (process.platform !== 'darwin') {
  //   app.quit()
  // }
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the dock icon is
  // clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
let printWindow
ipcMain.on("print", (event, arg) => {
  printWindow = new BrowserWindow({
    show: true,
  })
  console.log("load finish1", arg)
  printWindow.loadURL(`file://${__dirname}/index.html`)
  printWindow.webContents.on('did-finish-load', () => {
    console.log("load finish2", arg)
    printWindow.webContents.send('senddata', arg) // 给printer的render页面发送渲染的页面
  })
})

ipcMain.on("printdata", (event, arg) => {
  console.log("print", arg)
  let device = appConfig.sp
  if (arg.type == 1) {
    device = appConfig.ap
  }
  event.sender.print({
    deviceName: device,
    silent: false,
    printBackground: true
  });
})

