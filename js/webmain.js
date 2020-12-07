/** Main website side javascript to manage the entire site **/

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
        var tab = $("<span class='tab-entry' />");
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
    
}
