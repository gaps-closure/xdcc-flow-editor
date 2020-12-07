/** Main website side javascript to manage the entire site **/
const ipc = require("electron").ipcRenderer;

//current modules
var modules={}
var active_module=null;

/**
 * A site module, controls a tab on the screen
 * module_name - name of the module
 * module_tab - name of tab if shown (null if not)
 * main_page - the content of the main frame when active
 * templates - html content to add to templates (always avalible/hidden)
 * activate_callback - callback when the module is activated (null if not needed)
 * deactivate_callback - callback when module is attempted to change (null if not needed)
 *
 * template: void activate_callback()
 * 
 * template: bool deactivate_callback(str new_module_name) 
 * 	  - return true to allow new module to load
 *    - return false to cancel module switch
 */
function register_site_module(module_name, module_tab, main_page, templates, activate_callback, deactivate_callback){
    var $ = jQuery;
    
    //build the module object
    var mod={
        "module_name": module_name,
        "module_tab": module_tab,
        "main_page": main_page,
        "activate_callback": activate_callback,
        "deactivate_callback": deactivate_callback
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

function display_module(name){
    var $ = jQuery;
    console.log("Display: " + name);   
    
    var frame = $("div.main-frame");
    if(active_module !== null){
        if(modules[active_module].deactivate_callback !== null && !modules[active_module].deactivate_callback(name)){
            console.log("Cancel loading: " + name);
            return;
        }
    }
    
    active_module = name;
    frame.children().remove();
    frame.append(modules[active_module].main_page);
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
}

/** events on page load (load working file into page) **/
jQuery(document).ready(function () {
    get_json_name().then( (file) => {
        jQuery("div.working-file").text(file);
    });
});

/** IPC API **/

async function get_json_name(){
    return await ipc.invoke('get-json-name');
}
