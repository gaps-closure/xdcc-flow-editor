const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require("path");
const { ipcMain } = require('electron');

//local path to the meta schema
const cle_meta_schea_path="addtl-files/json-schema-draft7.json"

//if debug mode is enabled (false by defautl)
var enable_debug = false; 
//the name of the loaded json
var json_file_name;
//the xdcc_json data (not saved)
var xdcc_json = null;
//additional files (not saved)
var addtl_files={};
//flag for unsaved changes
var unsaved_changes=false;
//path to the cle schema
var cle_schema_path="";

//flag to allow exit
var allow_exit=false;

//Read the file name from the parm file before calling createWindow()
function prepareParams () {
    var loadedCnt=3;//number of parameters we are loading

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
    fs.readFile("param.cleschema", "utf8", function (err,data) {
        console.log("cleschea file: " + data);
        cle_schema_path = data.trim();
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

    win.on('close', (e) => {
        if(!allow_exit){
            console.log("-> request exit")
            e.preventDefault();
            //send a request to close to the render process
            win.webContents.send('native-close', true);
        }
    });
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
    fs.writeFileSync(json_file,JSON.stringify(xdcc_json,null,2),{"endocding": "utf8"});
    //save the standalone files
    var dir = path.dirname(json_file);
    
    for(var filename in addtl_files){
        if(addtl_files[filename] !== null){
            fs.writeFileSync(dir + path.sep + filename,addtl_files[filename],{"endocding": "utf8"});
        }
        else{
            //file removed
            fs.unlinkSync(dir + path.sep + filename);
        }
    }

    //clear
    addtl_files={};
    unsaved_changes=false;
    console.log("unsaved_changes - " + unsaved_changes);
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
            console.log("Unable to read json file: " + err)
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
    
    console.log("reading " + addtl_file);
    if(addtl_files.hasOwnProperty(filename) && addtl_files !== null){
        return(addtl_files[filename]);
    }
    if(fs.existsSync(addtl_file)){
        addtl_files[filename] = fs.readFileSync(addtl_file,"utf-8");
        console.log("read " + addtl_files[filename]);
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
    console.log("update json");
    if(JSON.stringify(xdcc_json) !== JSON.stringify(newjson)){
        unsaved_changes = true;
        console.log("unsaved_changes - " + unsaved_changes);
    }
    xdcc_json = newjson;
});

/** Check if unsaved changes **/
ipcMain.handle('check-if-unsaved', (event) => {
    console.log("check unsaved_changes - " + unsaved_changes);
    return unsaved_changes;
});

/** Get the working copy of an additional file **/
ipcMain.handle('get-addtl-file', (event, file) => {
    return read_adtl_file(file);
});

/** Update the working copy of an additional file **/
ipcMain.handle('update-addtl-file', (event, file, data) => {
    if(!file in addtl_files || addtl_files[file] != data){
        unsaved_changes=true;
    }
    addtl_files[file]=data;
});

/** Exit **/
ipcMain.handle('exit', (event, file, data) => {
    allow_exit = true;
    app.quit();
});

/** Read in the CLEschema **/
ipcMain.handle('read-cle-schema',(event) =>{
    console.log("read cle schema");
    if(fs.existsSync(cle_schema_path)){
        var data = fs.readFileSync(cle_schema_path,"utf-8");
        try {
            const obj = JSON.parse(data);
            return(obj);
        }
        catch(err){
            console.log("Unable parese CLE schema json: " + err)
            return(null);
        }
    }
    else{
        console.log("WARN: CLE schema json missing");
        return null;
    }
});

/** Read in json schema draft7 meta schema */
/** Read in the CLEschema **/
ipcMain.handle('read-meta-schema',(event) =>{
    console.log("read meta schema");
    if(fs.existsSync(cle_meta_schea_path)){
        var data = fs.readFileSync(cle_meta_schea_path,"utf-8");
        try {
            const obj = JSON.parse(data);
            return(obj);
        }
        catch(err){
            console.log("Unable parse meta schema json: " + err)
            return(null);
        }
    }
    else{
        console.log("WARN: meta schema json missing");
        return null;
    }
});