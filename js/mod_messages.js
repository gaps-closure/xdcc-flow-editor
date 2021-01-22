/** Message Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template = "<div id='message-content'><div id='message-topbar'><span id='message-title' /> (topic: <span id='message-topic' />)";
    page_template += "<span id='message-delete'><img class='delete-icon' src='./icons/baseline_delete_forever_black_18dp.png'></span><br />";
    page_template += "<span id='message-filename' /></div>";
    page_template += "<div class='json-editor-area' /></div><div id='message-listing' />";
    var page_data={}; //the full json
    var table_data=[]; //the visual table (component name, label)
    /*var*/ active_json_editor=null;
    var selected = null;
    var msg_label_lst = [];
    var msg_json_lst = {};
    var meta_schema=null;

    const editor_options = {
        mode: 'code',
        modes: ['code', 'tree']
    };

    const html_templates = [
        //new cle dialog box
        '<div class="modal" id="add-message-modal">' +
            '<img src="icons/baseline_library_add_black_18dp.png" class="modal-icon" alt="New CLE" />' +
            '<div class="modal-text">' +
                'Add a new Message<br /><br />' +
                '<label for="message-label-name">Message Name:</label>' +
                '<input type="text" id="message-label-name" name="message-label-name" /><br />' +
                '<label for="message-label-topic">Topic:</label>' +
                '<input type="checkbox" id="message-label-topic" name="message-label-topic"/><br />' +
                //todo add schema type here
                '<label for="message-schema-file">Schema File:</label>' +
                '<input type="text" id="message-schema-file" name="message-schema-file" /><br />' +
            '</div>' +
            '<div class="modal-buttons">' +
                '<button type="button" class="confirm-add">Add</button>' +
                '<button type="button" class="cancel">Cancel</button> ' +
            '</div>' +
        '</div>'
        ,
        //duplicate CLE dialog box
        '<div class="modal" id="duplicate-message-modal">' +
            '<img src="icons/baseline_error_outline_black_18dp.png" class="modal-icon" alt="Error" />' +
            '<div class="modal-text">' +
            '   A Message entry for <span class="message-name" /> already exists' +
            '</div>'+
        '</div>'
        ,
        //Message still in use cannot delete
        '<div class="modal" id="message-in-use">' +
            '<img src="icons/baseline_error_outline_black_18dp.png" class="modal-icon" alt="Error" />' +
            '<div class="modal-text">' +
            '   The message <span class="message-name" /> is still used by flow <span class="flow-id"/>' +
            '</div>'+
        '</div>'
    ];
    
    function delete_current_element(){
        var can_delete = true;
        var flowid=null;
        if(page_data !== undefined && page_data != null &&"flows" in page_data){
            $.each(page_data["flows"],(i,flow) => {
                if(flow["message"] == selected){
                    can_delete = false;
                    flowid = flow["flowId"];
                }
            });
        }

        if(can_delete){
            update_addtl_file(msg_json_lst[selected]["schemaFile"],null);
            msg_label_lst=msg_label_lst.filter((v) => v!=selected);
            console.log("filtered list");
            console.log(msg_label_lst);
            delete msg_json_lst[selected];
            selected=null;
            if(active_json_editor !== null){
                active_json_editor.destroy();
                active_json_editor=null;
            }
            stash_messages();
            load_page();
        }
        else{
            $("#message-in-use").modal();
            $('#message-in-use .message-name').text(selected);
            $('#message-in-use .flow-id').text(flowid);
        }
    }
    
    function select_element(node){
        var idx = parseInt(node.attr("data-index"));

        console.log("click on index " + idx + " (" + msg_label_lst[idx] + ")");
        if(selected === null || selected != msg_label_lst[idx]){
            //change selected element
            $("#message-listing .message-list-name").removeClass("message-selected");
            node.addClass("message-selected");
            selected = msg_label_lst[idx];
            $("#message-title").text(selected);
            $("#message-topic").text(msg_json_lst[selected]['topic'] ? "true" : "false");
            $("#message-filename").text(msg_json_lst[selected]["schemaFile"] + " (" + msg_json_lst[selected]["schemaType"] + ")")
            $("#message-topbar").css("display","block");
            $('#message-label-name').val("");

            //delete button
            $('#message-delete').off('click');
            $('#message-delete').click(()=>{
                delete_current_element();
            });

            if(active_json_editor!==null){
                active_json_editor.destroy();
                active_json_editor=null;
            }
            console.log(msg_json_lst[selected]);
            editor_options.onModeChange= ()=>{
                resize_page();
            };
            editor_options.onChangeText=()=>{
                try {
                    if(active_json_editor!== null && selected !== null){
                        var jsondata = active_json_editor.get();
                        update_addtl_file(msg_json_lst[selected]["schemaFile"],JSON.stringify(jsondata,null,2));
                    }
                } catch (error) {
                    //nop invalid json
                }
            };

            read_addtl_file(msg_json_lst[selected]["schemaFile"]).then((schema)=>{
                try{
                    console.log("found: " + schema);
                    var jsondata = schema;
                    if(jsondata === null || jsondata == ""){
                        jsondata="{}";
                    }
                    active_json_editor = new JSONEditor($(".json-editor-area")[0], editor_options, JSON.parse(jsondata));
                }
                catch (error){
                    console.log("Issue while opening json editor: \n"+ error);
                }
                try{
                    console.log("activate schema: ");
                    //console.log(meta_schema);
                    active_json_editor.setSchema(meta_schema);
                }
                catch (error){
                    console.log("Unable to enforce CLE json schema: " + error);
                }
                resize_page();
            });
            
        }
    }

    function generate_add_cle_btn_html(){
        var node = $("<div class='add-message-btn'>-- New Message --</div>");
        node.click(()=>{
            console.log("add new Message json");
            //show the new cle modal

            //clear values
            $('#message-label-topic')[0].checked=true;
            $('#message-label-name').val("");
            $('#message-schema-file').val("schema/")

            //open modal
            $('#add-message-modal').modal();

            //set up buttons
            $('#add-message-modal .confirm-add').off('click');
            $('#add-message-modal .confirm-add').click(()=>{
                var new_msg_name = $('#message-label-name').val();
                console.log("add message " + new_msg_name);

                if(new_msg_name in msg_json_lst || new_msg_name == ""){
                    console.log("found duplicate");
                    $.modal.close();
                    setTimeout(()=>{
                        console.log("show duplicate");
                        //show duplicate message
                        $("#duplicate-message-modal").modal();
                        $('#duplicate-message-modal .message-name').text(new_msg_name);                   
                    });
                }
                else{
                    //add the cle to the page
                    msg_label_lst.push(new_msg_name);

                    selected = new_msg_name;
                    msg_json_lst[new_msg_name] = {
                        "name": new_msg_name,
                        "topic": $('#message-label-topic')[0].checked,
                        "schemaType": "JSONSchema",
                        "schemaFile": $('#message-schema-file').val()
                    };
                    //reload the page to re-draw list
                    stash_messages();
                    load_page();
                    $.modal.close();
                }
            });
            $('#add-message-modal .cancel').off('click');
            $('#add-message-modal .cancel').click(()=>{
                $.modal.close();
            });
        });
        return node;
    }

    function load_page(){
        console.log("load CLEs");
        
        $("#message-listing").children().remove();

        
        get_working_json().then( (data) => {
            page_data=data;
            console.log("json loaded");
            extract_table_data();

            var content = $("#message-listing");

            $("#message-topbar").css("display","none");
            
            content.append(generate_add_cle_btn_html());
            $.each(msg_label_lst,(i,label)=>{
                var node = $("<div class='message-list-name' />");
                node.text(label);
                node.attr("data-index",i);
                node.click(()=>{
                    select_element(node);
                })
                content.append(node);
                if(label == selected){
                    selected=null;
                    setTimeout(()=>{
                        select_element(node);
                    });
                }
            });
            if(msg_label_lst.length > 5){
                content.append(generate_add_cle_btn_html());
            }
        });
    }

    function extract_table_data(){
        if(page_data !== undefined && page_data != null &&"messages" in page_data){
            msg_label_lst = [];
            msg_json_lst = {};
            $.each(page_data["messages"],(i,entry)=>{
                //extract all the CLEs
                msg_label_lst.push(entry["name"]);
                msg_json_lst[entry["name"]] = entry;
            });
        }
    }

    function unload_page(new_mod){
        console.log("unload");
        selected = null;
        $("#message-topbar").css("display","none");
        if(active_json_editor !== null){
            active_json_editor.destroy();
            active_json_editor=null;
        }

        stash_messages();

        return true;
    }

    //update the json 
    function stash_messages(){
        var i;
        var msglst=[];

        for(i=0;i<msg_label_lst.length;i++){
            var nm = msg_label_lst[i];
            console.log("stash " + nm);
            msglst.push(msg_json_lst[nm]);
        }
        console.log(msglst);
        page_data["messages"]=msglst;
        update_json(page_data).finally(()=>{
            console.log("saved component data");
        });
    }

    function editor_event(update,event){
        console.log("Got event " + event);
    }

    function resize_page(){
        console.log("resize");
        var sz = ($("#main-content").height() - 5);
        $("#message-content").css("max-height", sz + "px");
        $("#message-content").css("min-height", sz + "px");
        $("#message-listing").css("max-height", sz + "px");
        $("#message-listing").css("min-height", sz + "px");
        $("#message-title").css("max-height","60px");
        $("#message-title").css("min-height","60px");
        $(".json-editor-area").css("max-height",(sz - 60) + "px");
        $(".json-editor-area").css("min-height",(sz - 60) + "px");

        if(active_json_editor !== null){
            $(".jsoneditor").height((sz-50));
            active_json_editor.height=(sz-50);
            active_json_editor.resize();
        }
    }
    register_site_module("mod_messages", "Messages", "Messages", $(page_template),  html_templates, load_page, unload_page, resize_page);


    read_meta_schema().then((schema)=>{
        console.log("meta schema recieved");
        meta_schema = schema;
    });
});
