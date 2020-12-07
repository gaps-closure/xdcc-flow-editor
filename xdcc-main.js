const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require("path");
const { ipcMain } = require('electron')

//the name of the loaded json
var json_file_name;
//the xdcc_json data (not saved)
var xdcc_json = null;
//additional files (not saved)
var addtl_files={};

//File IO operations
ipcMain.handle('get-json-name', (event) => {
  return(json_file);
});

ipcMain.handle('reload-json', (event) => {
    return reload_xdcc_json();
});

ipcMain.handle('get-json', (event) => {
    if(xdcc_json === null){
        reload_xdcc_json();
    }
    return xdcc_json;
});

ipcMain.handle('save-json', (event) => {
    if(xdcc_json === null){
        reload_xdcc_json();
    }
    save_xdcc_json();
});


/** Saves all pending changes **/
function save_xdcc_json(){
    fs.writeFileSync(json_file,xdcc_json,{"endocding": "utf8"});
    //save the standalone files
    var dir = path.dirname(json_file);
    
    for(var filename in addtl_files){
        fs.writeFileSync(dir + path.sep + filename,addtl_files[filename],{"endocding": "utf8"});
    }
    //clear
    addtl_files={}
}


//load the xdcc json
function reload_xdcc_json(){
    if(fs.existsSync(json_file)){
        var data = fs.readFileSync(json_file,"utf-8");
        try {
            const obj = JSON.parse(data);
            xdcc_json = obj;
            //clear
            addtl_files={}
            return(obj);
        }
        catch(err){
            log.console("Unable to read json file: " + err)
            //clear
            addtl_files={}
            return({});
        }
    }
    else{
        //clear
        addtl_files={}
        return({}); //empty json
    }
    
}

//read a additional file if not already read
function read_adtl_file(filename){
    var dir = path.dirname(json_file);
    var addtl_file = dir + path.sep + filename;
    
    if(addtl_files.hasOwnProperty(filename)){
        return(addtl_files[filename]);
    }
    if(fs.existsSync(addtl_file)){
        addtl_files[filename] = fs.readFileSync(addtl_file,"utf-8");
        return(addtl_files[filename]);
    }
    else{
        return(""); //empty file
    }
}


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
