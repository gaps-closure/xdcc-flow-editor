/** Components Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='title'>Components</div><div id='component_table' /><div id='component_info' />";
    
    console.log("site is ready, add Components");
    register_site_module("mod_components", "Components" , $(page_template), null, null, null);
});
