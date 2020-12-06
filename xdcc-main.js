const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const { ipcMain } = require('electron')

var json_file;

//File IO operations
ipcMain.handle('get-json-name', (event) => {
  return(json_file);
});

ipcMain.handle('read-json', (event) => {
  if(fs.existsSync(json_file)){
    var data = fs.readFileSync(json_file,"utf-8");
    try {
      const obj = JSON.parse(data);
      return(obj);
    }
    catch(err){
      log.console("Unable to read json file: " + err)
      return({});
    }
  }
  else{
    return({}); //empty json
  }
});


//Read the file name from the parm file
function prepareParam () {
  fs.readFile("param.inputfile", "utf8", function (err,data) {
    console.log("xdcc file: " + data);
    json_file = data.trim();
    createWindow();
  });
}


//Create the browser window
function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();
}

app.whenReady().then(prepareParam);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
})
