/** Main website side javascript to manage the entire site **/
const ipc = require("electron").ipcRenderer;

//current modules
var modules={}
var active_module=null;

/**
 * A site module, controls a tab on the screen
 * module_name - name of the module
 * module_tab - name of tab if shown (null if not)
 * module_title - name of the page in the title bar
 * main_page - the content of the main frame when active
 * templates - html content to add to templates (always avalible/hidden,thus ensure ids don't collide between modules)
 * activate_callback - callback when the module is activated (null if not needed)
 * deactivate_callback - callback when module is attempted to change (null if not needed)
 *                       this should stash any changes into the working copy
 * resize_callback - callback when the screen is resized
 *
 * template: void activate_callback()
 * 
 * template: bool deactivate_callback(str new_module_name) 
 * 	  - return true to allow new module to load
 *    - return false to cancel module switch
 * 
 * template: void resize_callback()
 */
function register_site_module(module_name, module_tab, module_title, main_page, templates, activate_callback, deactivate_callback, resize_callback){
    var $ = jQuery;
    
    //build the module object
    var mod={
        "module_name": module_name,
        "module_tab": module_tab,
        "module_title": module_title,
        "main_page": main_page,
        "activate_callback": activate_callback,
        "deactivate_callback": deactivate_callback,
        "resize_callback": resize_callback
    };
    
    //copy any templates to the DOM
    if(templates !== null){
        console.log("Add templates");
        var tdiv=$("<div />");
        tdiv.attr("data-module",module_name)
        $.each(templates, function (i,entry){
            tdiv.append(entry);
        });
        $("div.templates").append(tdiv);
    }
    
    //add the module link to the tab bar
    if(module_tab !== null){
        console.log("Add tab " + module_tab);
        var tab = $("<span class='tab-entry tab-inactive' />");
        tab.attr("data-module",module_name);
        tab.text(module_tab);
        tab.click(function (){
            display_module(module_name);
        });
        $("div.tab-listing").append(tab);
    }
    
    //add the module to the list
    modules[module_name] = mod;
    
    //Activate if this is the first module loaded ("main page")
    if(active_module === null){
        display_module(module_name);
    }
}

/** Display the named module (switch to the module) **/
function display_module(name){
    var $ = jQuery;
    console.log("Display: " + name);   
    
    var frame = $("#main-content");
    var title = $("#title");
    
    if(active_module !== null){
        if(modules[active_module].deactivate_callback !== null && !modules[active_module].deactivate_callback(name)){
            console.log("Cancel loading: " + name);
            return;
        }
    }
    
    active_module = name;
    frame.children().remove();
    frame.append(modules[active_module].main_page);
    title.text(modules[active_module].module_title);
    if(modules[active_module].activate_callback !== null){
        modules[active_module].activate_callback();
    }
    
    $("div.tab-listing .tab-entry").each(function(i,e){
        var tab = $(e);
        if(tab.attr("data-module") == active_module){
            tab.removeClass("tab-inactive");
            tab.addClass("tab-active");
        } else {
            tab.removeClass("tab-active");
            tab.addClass("tab-inactive");
        }
    });
    update_div_sizes();
}

/** Location to update the sizes of specific items on the page:
    .main- **/
function update_div_sizes(){
    var $ = jQuery;
    var content = $("#main-content");
    var title = $("#title");
    var calc_height = $("div.working-file").position().top;
    
    //console.log("top of working file: " + calc_height);
    calc_height -= title.position().top + title.outerHeight();
    content.height(calc_height);

    if(active_module !== null && modules[active_module].resize_callback){
        modules[active_module].resize_callback();
    }
}

/** events on page load (load working file into page) and other initial settings**/
jQuery(document).ready(function () {
    jQuery(window).resize(update_div_sizes);
    get_json_name().then( (file) => {
        jQuery("div.working-file").text(file);
        update_div_sizes();
    });

    //buttons at top of the screen, register actions
    jQuery("#btn-save").click(save_files);
    jQuery("#btn-validate").click(validate_files);
    jQuery("#btn-exit").click(exit_client);

    //register animation for buttons at top of screen
    var pressed_btn_lst=[];
    jQuery(".btn-block").mousedown((event) => {
        var btn = jQuery(event.target);
        console.log(btn);
        if(!btn.hasClass("btn-block")){
            btn = btn.parent(".btn-block");
        }
        console.log("btn pressed " + btn.find(".btn-label").text());
        btn.addClass("btn-block-pressed");
        pressed_btn_lst.push(btn);
    });
    jQuery(document).mouseup(() => {
        while(pressed_btn_lst.length > 0){
            pressed_btn_lst.pop().removeClass("btn-block-pressed");
        }
    });

});

/** Save click callback */
function save_files(){
    //call the deactivate and activate functions before/after save to ensure the working copy is stashed
    if(active_module !== null){
        if(modules[active_module].deactivate_callback !== null && !modules[active_module].deactivate_callback(active_module)){
            console.log("current module canceled saving, and hopefully informed user why");
            return;
        }
    }
    save_all();
    if(active_module !== null){
        if(modules[active_module].activate_callback !== null){
            modules[active_module].activate_callback();
        }
    }
}

/** Validate button callback **/
function validate_files(){
    
}

/** Exit button callback **/
function exit_client(){
    if(active_module !== null){
        if(modules[active_module].deactivate_callback !== null && !modules[active_module].deactivate_callback(active_module)){
            console.log("current module canceled saving, and hopefully informed user why");
            return;
        }
    }

    check_unsaved().then(unsaved => {
        
        if(unsaved){
            console.log("The file is not saved");
            jQuery("#confirm-exit").modal();
            jQuery("#confirm-exit .confirm-save").click(()=>{
                //save + exit
                save_all().then(()=>{exit_app()});
            });
            jQuery("#confirm-exit .confirm-dont-save").click(()=>{
                //simply exit don't save
                exit_app();
            });
            jQuery("#confirm-exit .cancel").click(()=>{
                //just close the modal
                jQuery.modal.close();
            });
        }
        else{
            console.log("All is saved close the window");
            exit_app();
        }
        if(active_module !== null){
            if(modules[active_module].activate_callback !== null){
                modules[active_module].activate_callback();
            }
        }
    });
}

/** IPC API **/

/** Get the json file name **/
async function get_json_name(){
    return await ipc.invoke('get-json-name');
}

/** Get the working copy of the json file **/
async function get_working_json(){
    return await ipc.invoke('get-json');
}

/** Stash the current json information */
async function update_json(new_json){
    return await ipc.invoke('update-json',new_json);
}

/** Save all (from working copy) **/
async function save_all(){
    return await ipc.invoke('save-json');
}

/** Check if any changes are unsaved from main process */
async function check_unsaved(){
    return await ipc.invoke('check-if-unsaved');
}

/** Check if any changes are unsaved from main process */
async function exit_app(){
    return await ipc.invoke('exit');
}

/** Event from the main process to close the client **/
ipc.on("native-close", (event, act) => {
    if(act){
        console.log("Exit requested");
        exit_client();
    }
})