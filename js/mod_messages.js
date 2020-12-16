/** Messages Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='flow_table' />";
    
    register_site_module("mod_messages", "Messages", "Messages", $(page_template), null, null, null);
});
