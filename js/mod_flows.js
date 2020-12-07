/** Flows Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='title'>Message Flows</div><div id='flow_table' />";
    
    register_site_module("mod_flows", "Flows" , $(page_template), null, null, null);
});
