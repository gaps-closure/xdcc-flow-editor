/** Schema Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='schema_listing' /><div id='schema_content' />";
    
    register_site_module("mod_schema", "Schema Definitions", "Schema Table", $(page_template), null, null, null);
});
