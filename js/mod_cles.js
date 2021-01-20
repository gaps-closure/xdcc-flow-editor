/** CLE Module **/

//init
jQuery(document).ready(function () {
    var $=jQuery;
    var page_template = "<div id='cle-content'><div id='cle-topbar'><span id='cle-title' />";
    page_template += "<span id='cle-delete'><img class='delete-icon' src='./icons/baseline_delete_forever_black_18dp.png'></span></div>";
    page_template += "<div class='json-editor-area' /></div><div id='cle-listing' />";
    var page_data={}; //the full json
    var table_data=[]; //the visual table (component name, label)
    /*var*/ active_json_editor=null;
    var selected = null;
    var cle_label_lst = [];
    var cle_json_lst = {};
    var cle_schema = null;

    const editor_options = {
        mode: 'code',
        modes: ['code', 'tree']
    };

    const html_templates = [
        //new cle dialog box
        '<div class="modal" id="add-cle-modal">' +
            '<img src="icons/baseline_library_add_black_18dp.png" class="modal-icon" alt="New CLE" />' +
            '<div class="modal-text">' +
                'Add a new CLE-Label<br/>' +
                '<label for="cle-label-name">CLE-Label:</label>' +
                '<input type="text" id="cle-label-name" name="cle-label-name"><br><br></br>' +
            '</div>' +
            '<div class="modal-buttons">' +
                '<button type="button" class="confirm-add">Add</button>' +
                '<button type="button" class="cancel">Cancel</button> ' +
            '</div>' +
        '</div>'
        ,
        //duplicate CLE dialog box
        '<div class="modal" id="duplicate-cle-modal">' +
            '<img src="icons/baseline_error_outline_black_18dp.png" class="modal-icon" alt="Error" />' +
            '<div class="modal-text">' +
            '   The CLE entry for <span class="cle-name" /> already exists' +
            '</div>'+
        '</div>'
    ];
    
    
    function select_element(node){
        var idx = parseInt(node.attr("data-index"));

        console.log("click on index " + idx + " (" + cle_label_lst[idx] + ")");
        if(selected === null || selected != cle_label_lst[idx]){
            //change selected element
            $("#cle-listing .cle-list-name").removeClass("cle-selected");
            node.addClass("cle-selected");
            selected = cle_label_lst[idx];
            $("#cle-title").text(selected);
            $("#cle-topbar").css("display","block");
            $('#cle-label-name').val("");
            if(active_json_editor!==null){
                active_json_editor.destroy();
            }
            console.log(cle_json_lst[selected]);
            editor_options.onModeChange= ()=>{
                resize_page();
            };
            editor_options.onChangeText=()=>{
                try {
                    if(active_json_editor!== null && selected !== null){
                        cle_json_lst[selected]=active_json_editor.get();
                        console.log("new text: " + JSON.stringify(cle_json_lst[selected]));
                        stash_cles();
                    }
                } catch (error) {
                    //nop invalid json
                }
            };
            try{
                active_json_editor = new JSONEditor($(".json-editor-area")[0], editor_options, cle_json_lst[selected]);
            }
            catch (error){
                console.log("Issue while opening json editor: \n"+ error);
            }
            try{
                active_json_editor.setSchema(cle_schema);
            }
            catch (error){
                console.log("Unable to enforce CLE json schema: " + error);
            }
            resize_page();
        }
    }

    function generate_add_cle_btn_html(){
        var node = $("<div class='add-cle-btn'>-- New CLE --</div>");
        node.click(()=>{
            console.log("add new CLE json");
            //show the new cle modal
            $('#add-cle-modal').modal();
            $('#add-cle-modal .confirm-add').off('click');
            $('#add-cle-modal .confirm-add').click(()=>{
                var new_cle_name = $('#cle-label-name').val();
                console.log("add cle " + new_cle_name);

                if(new_cle_name in cle_json_lst || new_cle_name == ""){
                    console.log("found duplicate");
                    $.modal.close();
                    setTimeout(()=>{
                        console.log("show duplicate");
                        //show duplicate message
                        $("#duplicate-cle-modal").modal();
                        $('#duplicate-cle-modal .cle-name').text(new_cle_name);                   
                    });
                }
                else{
                    //add the cle to the page
                    cle_label_lst.push(new_cle_name);

                    selected = new_cle_name;
                    cle_json_lst[new_cle_name] = {};
                    //reload the page to re-draw list
                    stash_cles();
                    load_page();
                    $.modal.close();
                }
            });
            $('#add-cle-modal .cancel').off('click');
            $('#add-cle-modal .cancel').click(()=>{
                $.modal.close();
            });
        });
        return node;
    }

    function load_page(){
        console.log("load CLEs");
        
        $("#cle-listing").children().remove();

        
        get_working_json().then( (data) => {
            page_data=data;
            console.log("json loaded");
            extract_table_data();

            var content = $("#cle-listing");

            $("#cle-topbar").css("display","none");
            
            content.append(generate_add_cle_btn_html());
            $.each(cle_label_lst,(i,label)=>{
                var node = $("<div class='cle-list-name' />");
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
            if(cle_label_lst.length > 5){
                content.append(generate_add_cle_btn_html());
            }
        });
    }

    function extract_table_data(){
        if(page_data !== undefined && page_data != null &&"cles" in page_data){
            cle_label_lst = [];
            cle_json_lst = {};
            $.each(page_data["cles"],(i,entry)=>{
                //extract all the CLEs
                cle_label_lst.push(entry["cle-label"]);
                cle_json_lst[entry["cle-label"]] = entry["cle-json"];
            });
        }
    }

    function unload_page(new_mod){
        console.log("unload");
        selected = null;
        $("#cle-topbar").css("display","none");
        if(active_json_editor !== null){
            active_json_editor.destroy();
            active_json_editor=null;
        }

        stash_cles();

        return true;
    }

    //update the json 
    function stash_cles(){
        var i;
        var clelst=[];

        for(i=0;i<cle_label_lst.length;i++){
            var nm = cle_label_lst[i];
            console.log("stash " + nm);
            clelst.push({
                "cle-label": nm,
                "cle-json": cle_json_lst[nm]
            });
        }
        console.log(clelst);
        page_data["cles"]=clelst;
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
        $("#cle-content").css("max-height", sz + "px");
        $("#cle-content").css("min-height", sz + "px");
        $("#cle-listing").css("max-height", sz + "px");
        $("#cle-listing").css("min-height", sz + "px");
        $("#cle-title").css("max-height","45px");
        $("#cle-title").css("min-height","45px");
        $(".json-editor-area").css("max-height",(sz - 50) + "px");
        $(".json-editor-area").css("min-height",(sz - 50) + "px");

        if(active_json_editor !== null){
            $(".jsoneditor").height((sz-50));
            active_json_editor.height=(sz-50);
            active_json_editor.resize();
        }
    }
    register_site_module("mod_cle", "CLE Definitions" , "CLE Table", $(page_template),  html_templates, load_page, unload_page, resize_page);
    //preload cle json schema
    read_cle_schema().then((schema)=>{
        //console.log(schema);
        cle_schema = schema;
    });
});
