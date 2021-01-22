/** Flows Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template="<div id='flow_table' /><div id='component_info' />";
    var page_data={}; //the full json
    var table_data=[]; //the visual table (flowID, message_name, Label)
    var id_list=[];
    var component_pick_list=[];
    var cle_labels_list=[];
    var message_list=[];
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
        var sending_components={};
        var recieving_components={};
        cle_labels_list=[];
        component_pick_list=[]

        //parse topology
        if(page_data !== undefined && page_data != null && "topology" in page_data){
            $.each(page_data["topology"],(i,topology) =>{
                //add to the module list
                component_pick_list.push(topology["component"]);

                if("inFlows" in topology){
                    $.each(topology["inFlows"],(i,id) =>{
                        if(id in recieving_components){
                            console.log("Expand [in] " + id + " with " + topology["component"] + " (Prev. " + recieving_components[id] + ")");
                            recieving_components[id] += ";" + topology["component"];
                        }
                        else{
                            console.log("New [in] " + id + " with " + topology["component"]);
                            recieving_components[id] = topology["component"];
                        }
                    });
                }
                if("outFlows" in topology){
                    $.each(topology["outFlows"],(i,id) =>{
                        if(id in sending_components){
                            console.log("Expand [out] " + id + " with " + topology["component"] + " (Prev. " + sending_components[id] + ")");
                            sending_components[id] += ";" + topology["component"];
                        }
                        else{
                            console.log("New [out] " + id + " with " + topology["component"]);
                            sending_components[id] = topology["component"];
                        }
                    });
                }
            });
        }

        //parse cles (for list of names)
        if(page_data !== undefined && page_data != null && "cles" in page_data){
            $.each(page_data["cles"],(i,cle) => {
                cle_labels_list.push(cle["cle-label"]);
            });
        }

        //parse message names
        if(page_data !== undefined && page_data != null && "messages" in page_data){
            $.each(page_data["messages"],(i,msg) => {
                message_list.push(msg["name"]);
            });
        }

        //parse the actual flows
        if(page_data !== undefined && page_data != null && "flows" in page_data){
            var i;
            
            for(i=0;i<page_data["flows"].length;i++){
                var row = page_data["flows"][i];

                table_data[i]=[
                    row["flowId"],
                    row["message"],
                    row["label"],
                    recieving_components[row["flowId"]],
                    sending_components[row["flowId"]]
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
                    return last_updated_id;
                }
            }
        }
        return value;
    }

    function cell_change(instance, cell, x, y, value){
        if(x==0 && value != last_updated_id){
            //update flow id
            if(last_updated_id !== undefined){
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
        if(x==3){
            //update inFlows
            console.log("Add " + value + " to inFlows");
            if(typeof page_data === 'object' && "topology" in page_data ){
                $.each(page_data["topology"],(i, entry) => {
                    if("inFlows" in entry){
                        //remove entries related to ourself
                        entry["inFlows"] = entry["inFlows"].filter(v => v != table_data[y][0]);
                    }
                    else{
                        entry["inFlows"] = [];
                    }
                    if(value.split(";").includes(entry["component"])){
                        console.log("Add to component " + entry["component"] + " [" + table_data[y][0] + "]");
                        //we need to re-add our flow to theis component
                        entry["inFlows"].push(table_data[y][0]);
                        entry["inFlows"].sort((a,b)=>{return a-b});
                        console.log(entry["inFlows"])
                    }
                });
            }
        }
        if(x==4){
            //update outFlows
            console.log("Add " + value + " to outFlows");
            if(typeof page_data === 'object' && "topology" in page_data ){
                $.each(page_data["topology"],(i, entry) => {
                    if("outFlows" in entry){
                        console.log("remove any existing entries");
                        //remove entries related to ourself
                        entry["outFlows"] = entry["outFlows"].filter(v => v != table_data[y][0]);
                    }
                    else{
                        console.log("create missing list");
                        entry["outFlows"] = [];
                    }
                    if(value.split(";").includes(entry["component"])){
                        console.log("Add to component " + entry["component"] + " [" + table_data[y][0] + "]");
                        //we need to re-add our flow to theis component
                        entry["outFlows"].push(table_data[y][0]);
                        entry["outFlows"].sort((a,b)=>{return a-b});
                        console.log(entry["outFlows"])
                    }
                });
            }
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
                colWidths: [ 100, 250, 300,220,220],
                colHeaders: [ 'Data ID', 'Message', 'Label', 'From Component', 'To Component'],
                columns:[
                    { type:'integer' },
                    { type:'dropdown', source:message_list, autocomplete:true, multiple:false },
                    { type:'dropdown', source:cle_labels_list, autocomplete:true, multiple:false },
                    { type: 'dropdown', source:component_pick_list, autocomplete:true, multiple:true },
                    { type: 'dropdown', source:component_pick_list, autocomplete:true, multiple:true }
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
