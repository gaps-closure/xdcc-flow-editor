/** Components Module **/

const { systemPreferences } = require("electron");

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='component_table' /><div id='component_info' />";
    var page_data={}; //the full json
    var table_data=[]; //the visual table (component name, label)
    var in_flows={}; //map of component name to in flows
    var out_flows={}; //map of component name to out flows
    var last_updated_name=undefined; //name of the last component updated
    var cle_labels_list=[]; //list of cle labels

    var jexcel_table = null;
    
    function unload_page(new_module){
        stash_table_data();
        return true;
    }

    function extract_table_data(){
        //clear data
        table_data = [];
        in_flows = {};
        out_flows = {};
        cle_labels_list=[];

        if(page_data !== undefined && page_data != null &&"topology" in page_data){
            var i;
            
            for(i=0;i<page_data["topology"].length;i++){
                var row = page_data["topology"][i];

                table_data[i]=[
                    row["component"],
                    row["label"]
                ];
                in_flows[row["component"]] = row["inFlows"];
                out_flows[row["component"]] = row["outFlows"];
            }
        }
        //always put an empty row at the end
        table_data.push(["",""]);


        //parse cles (for list of names)
        if(page_data !== undefined && page_data != null && "cles" in page_data){
            $.each(page_data["cles"],(i,cle) => {
                cle_labels_list.push(cle["cle-label"]);
            });
        }

    }

    function stash_table_data(){
        //stash the table data to the the main process
        var i;
        var topology = [];

        for(i=0;i<table_data.length;i++){
            var component_name = table_data[i][0];
            var compoennt_label = table_data[i][1];
            var component_inflows = in_flows[component_name];
            var component_outflows = out_flows[component_name];

            if(component_name === undefined || component_name == ""){
                continue;
            }

            if(component_inflows === undefined){
                component_inflows = []
            }
            if(component_outflows === undefined){
                component_outflows = []
            }
            var row = {
                "component": component_name,
                "label": compoennt_label,
                "inFlows": component_inflows,
                "outFlows": component_outflows
            }
            topology.push(row);
        }
        if(typeof page_data !== 'object'  || page_data == null){
            page_data={};
        }
        
        page_data["topology"] = topology;
        update_json(page_data).finally(()=>{
            console.log("saved component data");
        });
    }

    function before_cell_change(instance, cell, x, y, value){
        if(x==1 && table_data[y][0] === ""){
            return "";
        }
        if(x==0){
            last_updated_name = table_data[y][x];
            if(last_updated_name !== undefined && last_updated_name !== value){
                //verify
                if(value in in_flows){
                    //duplicate value
                    //TODO popup warning
                    console.log("value may not duplicate existing value");
                    return last_updated_name;
                }
                if(value == ""){
                    //empty value not allowed
                    //TODO popup warning
                    console.log("value must not be empty");
                    return last_updated_name
                }
            }
        }
        return value;
    }

    function cell_change(instance, cell, x, y, value){
        if(x==0 && value != last_updated_name){
            //move in/out flows with component name change
            new_in = [];
            new_out= [];
            if(last_updated_name !== undefined){
                if(last_updated_name in in_flows){
                    new_in = in_flows[last_updated_name];
                }
                if(last_updated_name in out_flows){
                    new_out = out_flows[last_updated_name];
                }
            }
            out_flows[value] = new_out;
            in_flows[value] = new_in;
        }
    }

    //resize the table when 
    function resize_table(){
        //resize table to fit
        $("#main-content .jexcel_content").css("max-height",($("#main-content").height() - 5) + "px")
    }

    /** Start reload from the working data **/
    function load_page(){
        $("#component_table").children().remove();
        
        get_working_json().then( (data) => {
            page_data=data;

            extract_table_data();

            $("#component_table").append("<div class='component_spreadsheet' \>");
            var sheet = $("#component_table .component_spreadsheet")[0]
            jexcel_table = jexcel(sheet,
            {
                data: table_data,
                colWidths: [ 200, 200],
                colHeaders: [ 'Component', 'Label' ],
                columns:[
                    { type:'text' },
                    { type:'dropdown', source:cle_labels_list, autocomplete:true, multiple:false }
                ],
                tableOverflow:true,
                tableHeight:($("#main-content").height() - 5) + "px",
                disableAddColumn:true,
                onchange:cell_change,
                onbeforechange: before_cell_change,
                onbeforeinsertcolumn: () => {return false},
                onbeforedeletecolumn: () => {return false}
            });
        });
    }
    
    console.log("site is ready, add Components");
    register_site_module("mod_components", "Components", "Components", $(page_template), null, load_page, unload_page, resize_table);
});
