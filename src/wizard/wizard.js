/**
 * @author Oscar Fonts <oscar.fonts@geomati.co>
 */
define('wizard', ['SensorWidget', 'SOS', 'jquery', 'moment', 'errorhandler', 'jquery-ui',/* 'daterangepicker',*/ 'bootstrap'], function(SensorWidget, SOS, $, moment, errorhandler) {
    "use strict";

    menu();

    $(".panel").draggable({
        handle: ".panel-heading"
    });

    $(".width-resizable-panel").resizable({
        handles: 'e, w'
    });
    $("#widget-container").resizable();

    function menu() {
        var widgets = ["bearing", "gauge", "jqgrid", "map", "panel", "progressbar", "table", "thermometer", "timechart", "windrose"];
        var styles = ["default", "primary", "success", "info", "warning", "danger"];
        var html = "";
        for (var i in widgets) {
            var widget = widgets[i];
            var style = styles[i%styles.length];
            html += '<a role="button" class="menu-btn btn btn-'+style+' btn-lg" id="'+widget+'"><div class="flaticon-'+widget+'"></div>'+capitalize(widget)+'&nbsp;&nbsp;»</a>';
        }
        document.getElementById("main-menu").innerHTML = html;
        $(".menu-btn").click(function() {
            form(this.id);
        });
    }

    function htmlDecode(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function form(name) {
        $("#widget-form-title").html(capitalize(name) + " Widget Configuration");
        new SensorWidget(name).inspect(function(inputs, optionalInputs, preferredSizes) {
            var contents = '<fieldset><legend>Mandatory inputs</legend>';
            var input, select, label, options;

            for (var i in inputs) {
                input = inputs[i];
                select = "";
                label = capitalize(input);
                options = "";

                switch (input) {
                    case "service":
                    case "offering":
                    case "feature":
                    case "property":
                        select = '<select class="form-control" id="' + input + '"></select>';
                        break;
                    case "features":
                    case "properties":
                        select = '<select class="form-control" multiple id="' + input + '"></select>';
                        label += " (multiselect)";
                        break;
                    case "refresh_interval":
                        var intervals = [5, 10, 30, 60, 120];
                        for (var j in intervals) {
                            var value = intervals[j];
                            options += '<option id="' + value + '">' + value + '</option>';
                        }
                        select = '<select class="form-control" id="' + input + '">' + options + '</select>';
                        break;
                    case "time_start":
                        if ($.inArray("time_end", inputs)) {
                            label = "Time Range";
                            select = 'TODO...<span id="time_range"><span class="sublabel">From: </span><input type="text" id="time_start" value=""/><br/>';
                            select += 'TODO...<span class="sublabel">To: </span><input type="text" id="time_end" value=""/></span>';
                        }
                        break;
                    case "time_end":
                        break;
                    default:
                        select = '<input  class="form-control" type="text" value="" id="' + input + '"/>';
                }

                if (select) {
                    contents += '<div class="form-group">' + '<label class="col-lg-4 control-label" for="' + input + '">' + label + '</label><div class="col-lg-8">' + select + '</div></div>';
                }
            }

            contents += '</fieldset>';

            contents += '<fieldset><legend>Optional inputs</legend>';
            for (i in optionalInputs) {
                input = optionalInputs[i];
                select = "";
                label = capitalize(input);
                options = "";
                switch(input) {
                    case "footnote":
                        select = '<textarea class="form-control" value="" id="' + input + '"></textarea>';
                        break;
                    case "base_map":
                        for (var key in inputs.base_maps) {
                            options += '<option id="' + key + '">' + key + '</option>';
                        }
                        select = '<select class="form-control" id="' + input + '">' + options + '</select>';
                        break;
                    default:
                        select = '<textarea class="form-control" value="" id="' + input + '"></textarea>';
                }
                contents += '<div class="form-group">' + '<label class="col-lg-4 control-label" for="' + input + '">' + label + '</label><div class="col-lg-8">' + select + '</div></div>';
            }
            contents += '</fieldset>';

            contents += '<fieldset><legend>Widget dimensions</legend>';
            input = "sizes";
            label = "Initial Size";

            for (i in preferredSizes) {
                var size = preferredSizes[i];
                options += '<option id="size" value="' + i + '">' + size.w + " x " + size.h + ' px</option>';
            }
            var control = '<select class="form-control" id="sizes">' + options + '</select>';
            contents += '<div class="form-group">' + '<label class="col-lg-4 control-label" for="' + input + '">' + label + '</label><div class="col-lg-8">' + control + '</div></div>';
            contents += '</fieldset>';

            contents += '<input type="button" name="build" class="btn btn-primary pull-right" value="Create Widget&nbsp;&nbsp;»"/>';
            contents += '<div id="builderError"  class="text-danger"></div>';

            $("#widget-form").html(contents);

            $('[name="build"]').data({
                name: name,
                inputs: inputs,
                optionalInputs: optionalInputs,
                preferredSizes: preferredSizes
            }).click(loadWidget);

            // Setup the SOS parameters: service, offering, feature(s) and property(ies)
            setService(["http://demo.geomati.co/sos/json", "http://sensors.portdebarcelona.cat/sos/json", "/52n-sos/sos/json"]);

            $('#service').change(function() {
                errorhandler.hideError();
                var service = $('#service').find('option:selected').attr("id");
                setOfferings(service);
                setDateRange();

            });

            $('#offering').change(function() {
                var procedure = $('#offering').find('option:selected').data("procedure");
                setFeatures(procedure);
                setProperties(procedure);
                setDateRange();
            });

            $('#feature').change(function() {
                setDateRange();
            });

            $('#features').change(function() {
                setDateRange();
            });

            $('#property').change(function() {
                setDateRange();
            });

            $('#properties').change(function() {
                setDateRange();
            });

            /*
            var timeRange = $('#time_range');
            if (timeRange.length) {
                timeRange.dateRangePicker({
                    separator: ' to ',
                    language: 'en',
                    startOfWeek: 'monday',
                    format: 'YYYY-MM-DD[T]HH:mm:ssZ',
                    //startDate: X, // TODO getDataAvailability
                    endDate: moment.utc(), // TODO getDataAvailability
                    autoClose: true,
                    showShortcuts: false,
                    shortcuts: null,
                    time: {
                        enabled: true
                    },
                    getValue: function() {
                        var timeStart = $('#time_start').val();
                        var timeEnd = $('#time_end').val();
                        if (timeStart && timeEnd) {
                            return timeStart + ' to ' + timeEnd;
                        } else {
                            return '';
                        }
                    },
                    setValue: function(s, date1, date2) {
                        $('#time_start').val(moment(date1).utc().format());
                        $('#time_end').val(moment(date2).utc().format());
                    }
                });
            }*/
        });
    }

    function setService(urls) {
        var service = $('#service');
        if (urls && service) {
            service.append($('<option>').append("Select a Service..."));
            for (var i in urls) {
                var url = urls[i];
                service.append($('<option>').attr('id', url).append(url));
            }
        }
    }

    function setOfferings(url) {
        clearOptions('#offering', '#property', '#properties', '#feature', '#features');

        if (url) {
            $('#offering').append($('<option>').append("Select an Offering..."));
        } else {
            return;
        }

        SOS.setUrl(url);
        SOS.getCapabilities(function(offerings) {
            for (var i in offerings) {
                var offering = offerings[i];

                $("#offering").append($('<option>').attr('id', offering.identifier).data('procedure', offering.procedure[0]).append(offering.name));
            }
        });
    }

    function setProperties(procedure) {
        clearOptions('#property', '#properties');

        if (!procedure) {
            return;
        }

        SOS.describeSensor(procedure, function(description) {
            var properties = description.hasOwnProperty("ProcessModel") ? description.ProcessModel.outputs.OutputList.output : description.System.outputs.OutputList.output;

            properties = properties instanceof Array ? properties : [properties];

            for (var i in properties) {
                var property = properties[i];
                var types = ["Quantity", "Count", "Boolean", "Category", "Text", "ObservableProperty"];

                for (var j in types) {
                    var type = types[j];
                    if (property.hasOwnProperty(type)) {
                        property.type = type;
                        property.id = property[type].definition;
                        property.description = property.name + " (" + type;
                        if (type == "Quantity" && property[type].hasOwnProperty("uom")) {
                            property.description += " [" + property[type].uom.code + "]";
                        }
                        property.description += ")";
                    }
                }
                $("#property, #properties").append($('<option>').attr('id', property.id).append(property.description));

            }

        });
    }

    function setFeatures(procedure) {
        clearOptions('#feature', '#features');

        if (!procedure) {
            return;
        }

        SOS.getFeatureOfInterest(procedure, function(features) {
            for (var i in features) {
                var feature = features[i];
                var id = feature.identifier.value;
                var name = feature.name.value;

                $("#feature, #features").append($('<option>').attr('id', id).append(name));
            }

        });
    }

    function setDateRange() {
        var procedure = $('#offering').find('option:selected').data("procedure");
        var feature = $('#feature').find('option:selected').attr("id");
        var property = $('#property').find('option:selected').attr("id");
        var features = feature ? feature : $('#features').find('option:selected').map(function() {
            return this.id;
        }).get();
        var properties = property ? property : $('#properties').find('option:selected').map(function() {
            return this.id;
        }).get();

        SOS.getDataAvailability(procedure, features, properties, function(availabilities) {
            var abs_from = availabilities[0].phenomenonTime[0];
            var abs_to = availabilities[0].phenomenonTime[1];
            for (var i = 1; i < availabilities.length; i++) {
                var from = availabilities[i].phenomenonTime[0];
                var to = availabilities[i].phenomenonTime[1];
                if (from < abs_from) {
                    abs_from = from;
                }
                if (to > abs_to) {
                    abs_to = to;
                }
            }
            $("#time_start").val(moment(abs_from).utc().format());
            $("#time_end").val(moment(abs_to).utc().format());
        });
    }

    function clearOptions() {
        for (var i = 0; i < arguments.length; i++) {
            if ($(arguments[i])) {
                $(arguments[i]).find('option').remove();
            }
        }
        $("#time_start").val("");
        $("#time_end").val("");
    }

    function loadWidget() {
        var params = $('[name="build"]').data();
        var config = {};

        var getId = function() {
            return this.id;
        };

        var name, el, value;

        for (var i in params.inputs) {
            name = params.inputs[i];
            el = $('#'+name);
            switch (name) {
                case "service":
                case "offering":
                case "feature":
                case "property":
                    value = el.find('option:selected').attr("id");
                    break;
                case "features":
                case "properties":
                    value = el.find('option:selected').map(getId).get();
                    break;
                default:
                    value = el.val();
            }
            if (value) {
            	config[name] = value;
            }
        }

        for (i in params.optionalInputs) {
            name = params.optionalInputs[i];
            el = $('#'+name);
            value = el.val();
            if (value) {
            	config[name] = value;
            }
        }

        var preferredSize = params.preferredSizes[$("#sizes").val()];

        // set preferred size to the dialog to start with
        var widgetContainer = $("#widget-container");
        widgetContainer.draggable();

        widgetContainer.resizable("destroy");
        $("#widget-container").width(preferredSize.w).height(preferredSize.h+39);

        var instance = new SensorWidget(params.name, config, document.getElementById("widget-view"));

        widgetContainer.resizable({
            helper: "ui-resizable-helper",
            resize: function( event, ui ) {
            	//refresh embed code snippet (we use the iframe tag with dialog's current width and height)
                document.getElementById('embed').innerHTML = htmlDecode(instance.iframe(ui.size.width, ui.size.height-39));
            }
        });

        //refresh code snippets for the first time
        document.getElementById('code').innerHTML = instance.javascript();
        document.getElementById('embed').innerHTML = htmlDecode(instance.iframe(preferredSize.w, preferredSize.h));
        document.getElementById('link').innerHTML = '<a href="'+instance.url()+'" target="_blank">'+instance.url()+'</a>';
    }

    function capitalize(string) {
        return string.toLowerCase().replace(/_/g, " ").replace(/(?:^|\s)\S/g, function(a) {
            return a.toUpperCase();
        });
    }

});

require(["wizard"]);