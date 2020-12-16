/** CLE Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='cle_listing' /><div id='cle_content' />";
    
    register_site_module("mod_cle", "CLE Definitions" , "CLE Table", $(page_template), null, null, null);
});
