/** Flows Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='flow_table' /><div id='component_info' />";
    var page_data={}; //the full json
    var table_data=[]; //the visual table (flowID, message_name, Label)
    var id_list=[];
    var last_updated_id=undefined;

    var jexcel_table = null;
    
    function unload_page(new_module){
        stash_table_data();
        return true;
    }

    function stash_table_data(){
        //update flows table
        var flows = [];
        var i;
        
        for(i=0;i<table_data.length;i++){
            var flow_id = table_data[i][0];
            var flow_message = table_data[i][1];
            var flow_label = table_data[i][2];

            if(flow_id === undefined || flow_id == ""){
                continue;
            }

            var row = {
                "flowId": flow_id,
                "message": flow_message,
                "label": flow_label
            }
            flows.push(row);
        }
        if(typeof page_data !== 'object'  || page_data == null){
            page_data={};
        }
        
        page_data["flows"] = flows;
        update_json(page_data).finally(()=>{
            console.log("saved component data");
        });
    }
    
    function extract_table_data(){
        //clear data
        table_data = [];

        if(page_data !== undefined && page_data != null && "flows" in page_data){
            var i;
            
            for(i=0;i<page_data["flows"].length;i++){
                var row = page_data["flows"][i];

                table_data[i]=[
                    row["flowId"],
                    row["message"],
                    row["label"]
                ];
                id_list.push(row["flowId"]);
            }
        }
        //always put an empty row at the end
        table_data.push(["","",""]);
    }

    function before_cell_change(instance, cell, x, y, value){
        if(x==1 && table_data[y][0] === ""){
            return "";
        }
        if(x==0){
            last_updated_id = table_data[y][x];
            
            if(last_updated_id !== undefined && last_updated_id !== value){
                if(value == parseInt(value)){
                    value = parseInt(value);
                }
                else{
                    console.log("Warn value must be a number");
                    return last_updated_id;
                }
                console.log("check value - " + value);
                console.log("set: " + id_list);
                //verify
                if(id_list.includes(value)){
                    //duplicate value
                    //TODO popup warning
                    console.log("value may not duplicate existing value");
                    return last_updated_id;
                }
                if(value == ""){
                    //empty value not allowed
                    //TODO popup warning
                    console.log("value must not be empty");
                    return last_updated_id
                }
            }
        }
        return value;
    }

    function cell_change(instance, cell, x, y, value){
        if(x==0 && value != last_updated_id){
            //update flow id
            if(last_updated_id !== undefined){
                var i=0;
                //we need to update all instances of the old flowID to the new one in topology
                if(typeof page_data === 'object' && "topology" in page_data ){
                    $.each(page_data["topology"],(i, entry) => {
                        if("inFlows" in entry){
                            console.log("Check " + entry["component"] + " inFlows");
                            
                            for(i=0;i<entry["inFlows"].length;i++){
                                if(entry["inFlows"][i] == last_updated_id){
                                    console.log("update to " + value);
                                    entry["inFlows"][i] = value;
                                }
                            }
                            entry["inFlows"].sort((a,b)=>{return a-b});
                        }
                        if("outFlows" in entry){
                            console.log("Check " + entry["component"] + " outFlows");

                            for(i=0;i<entry["outFlows"].length;i++){
                                if(entry["outFlows"][i] == last_updated_id){
                                    console.log("update to " + value);
                                    entry["outFlows"][i] = value;
                                }
                            }
                            entry["outFlows"].sort((a,b)=>{return a-b});
                        }
                    });
                }
            }
            last_updated_id=undefined;
        }
    }

    //resize the table when 
    function resize_table(){
        //resize table to fit
        $("#main-content .jexcel_content").css("max-height",($("#main-content").height() - 5) + "px")
    }

    /** Start reload from the working data **/
    function load_page(){
        $("#flow_table").children().remove();
        
        get_working_json().then( (data) => {
            page_data=data;

            extract_table_data();

            $("#flow_table").append("<div class='flow_spreadsheet' \>");
            var sheet = $("#flow_table .flow_spreadsheet")[0]
            jexcel_table = jexcel(sheet,
            {
                data:table_data,
                colWidths: [ 100, 250, 300],
                colHeaders: [ 'Data ID', 'Message', 'Label', 'From Component', 'To Component' ],
                columns:[
                    { type:'integer' },
                    { type:'text' },
                    { type:'text' },
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
    
    register_site_module("mod_flows", "Flows" , "Message Flows", $(page_template), null, load_page, unload_page, resize_table);
});
