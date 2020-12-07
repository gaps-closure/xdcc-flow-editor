/** Messages Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='title'>Messages</div><div id='flow_table' />";
    
    register_site_module("mod_messages", "Messages" , $(page_template), null, null, null);
});
