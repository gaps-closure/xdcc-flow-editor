/** Components Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='title'>Components</div><div id='component_table' /><div id='component_info' />";
    var page_data={};
    var jexcel_table = null;
    
    
    /** Start reload from the working data **/
    function load_page(){
        $("#component_table").children().remove();
        
        get_working_json().then( (data) => {
            page_data=data;
            $("#component_table").append("<div class='component_spreadsheet' \>");
            var sheet = $("#component_table .component_spreadsheet")[0]
            jexcel_table = jexcel(sheet,
            {
                data:data["topology"],
                colWidths: [ 200, 200],
                colHeaders: [ 'Component', 'Label' ],
                tableOverflow:true,
                tableHeight:'450px',
                disableAddColumn:true,
            });
            jexcel_table.hideColumn(3);
            jexcel_table.hideColumn(2);
        });
    }
    
    console.log("site is ready, add Components");
    register_site_module("mod_components", "Components" , $(page_template), null, load_page, null);
});
