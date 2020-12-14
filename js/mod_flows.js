/** Flows Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='title'>Message Flows</div><div id='flow_table' /><div id='component_info' />";
    var page_data={};
    var jexcel_table = null;
    
    
    /** Start reload from the working data **/
    function load_page(){
        $("#flow_table").children().remove();
        
        get_working_json().then( (data) => {
            page_data=data;
            $("#flow_table").append("<div class='flow_spreadsheet' \>");
            var sheet = $("#flow_table .flow_spreadsheet")[0]
            jexcel_table = jexcel(sheet,
            {
                data:data["flows"],
                colWidths: [ 100, 200, 200, 125, 125],
                colHeaders: [ 'Data ID', 'Message', 'Label', 'From Component', 'To Component' ],
                tableOverflow:true,
                tableHeight:'450px',
                disableAddColumn:true,
                disableManualAddColumn:true,
            });
        });
    }
    
    register_site_module("mod_flows", "Flows" , $(page_template), null, load_page, null);
});
