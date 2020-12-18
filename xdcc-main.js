const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require("path");
const { ipcMain } = require('electron')

//if debug mode is enabled (false by defautl)
var enable_debug = false; 
//the name of the loaded json
var json_file_name;
//the xdcc_json data (not saved)
var xdcc_json = null;
//additional files (not saved)
var addtl_files={};

//Read the file name from the parm file
function prepareParams () {
    var loadedCnt=2;//number of parameters we are loading

    fs.readFile("param.debugmode", "utf8", function (err,data) {
        console.log("debug mode: " + data);
        if(data.trim()==="true"){
            enable_debug = true;
        }

        loadedCnt--;
        if(loadedCnt == 0){ //this is the last parameter loaded, open the window
            createWindow(); 
        }
    });
    fs.readFile("param.inputfile", "utf8", function (err,data) {
        console.log("xdcc file: " + data);
        json_file = data.trim();
        loadedCnt--;
        if(loadedCnt == 0){ //this is the last parameter loaded, open the window
            createWindow();
        }
    });
}


//Create the browser window
function createWindow () {
    const win = new BrowserWindow({
        width: 900,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    });

    win.loadFile('index.html');

    if(enable_debug){
        win.webContents.openDevTools();
    }
    else{
        win.setMenu(null);
    }
}

/***** Application Startup ******/

app.whenReady().then(prepareParams);

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

/***** File IO operations *****/

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

/*****  IPC Calls between main process and web gui  ******/

/** Get the file (including path) that we are working on **/
ipcMain.handle('get-json-name', (event) => {
    console.log("in get-json-name");
    return(json_file);
});

/** reload the json/file data from disk without saving changes **/
ipcMain.handle('reload-json', (event) => {
    return reload_xdcc_json();
});

/** get the current working copy of the json **/
ipcMain.handle('get-json', (event) => {
    if(xdcc_json === null){
        reload_xdcc_json();
    }
    return xdcc_json;
});

/** Commit all changes to disk **/
ipcMain.handle('save-json', (event) => {
    if(xdcc_json === null){
        reload_xdcc_json();
    }
    save_xdcc_json();
});

/** Update the current working copy of the json **/
ipcMain.handle('update-json', (event, newjson) => {
    xdcc_json = newjson;
});

/** Get the working copy of an additional file **/
ipcMain.handle('get-addtl-file', (event, file) => {
    read_adtl_file(file);
});

/** Update the working copy of an additional file **/
ipcMain.handle('update-addtl-file', (event, file, data) => {
    addtl_files[file]=data;
});