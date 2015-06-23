/*!
 *  opentok-whiteboard (http://github.com/aullman/opentok-whiteboard)
 *
 *  Shared Whiteboard that works with OpenTok
 *
 *  @Author: Adam Ullman (http://github.com/aullman)
 *  @Copyright (c) 2014 Adam Ullman
 *  @License: Released under the MIT license (http://opensource.org/licenses/MIT)
 **/

var OpenTokWhiteboard = angular.module('opentok-whiteboard', ['opentok'])
    .directive('otWhiteboard', ['OTSession', '$window', function (OTSession, $window) {
        return {
            restrict: 'E',
            template: '<canvas></canvas>' +

                '<div class="OT_panel">' +

                '<input type="button" ng-class="{OT_color: true, OT_selected: c[\'background-color\'] === color}" ' +
                'ng-repeat="c in colors" ng-style="c" ng-click="changeColor(c)">' +
                '</input>' +

                '<input type="button" ng-click="erase()" ng-class="{OT_erase: true, OT_selected: erasing}"' +
                ' value="Eraser"></input>' +

                '<input type="button" ng-click="capture()" class="OT_capture" value="{{captureText}}"><a download=\'HomeLane.png\' href=\'{{imageName}}\'></a></input>' +

                '<input type="button" ng-click="clear()" class="OT_clear" value="Clear"></input>' +

                '<input type="button" ng-click="undo()" class="OT_undo" value="Undo"></input>' +

                '<input type="button" ng-click="redo()" class="OT_redo" value="Redo"></input>' +
                '<input type="file" class="OT_loadImage" id="OT_loadImage" value="Load\nImage"></input>',

            link: function (scope, element, attrs) {
                var canvas = element.context.querySelector("canvas"),
                    select = element.context.querySelector("select"),
                    input = element.context.querySelector("input"),
                    inputImage = element.context.querySelector("a"),
                    inputFile = element.context.querySelector("input.OT_loadImage"),
                    client = {
                        dragging: false
                    },
                    ctx = canvas.getContext("2d"),
                    drawHistory = [],
                    undoStack = [],
                    redoStack = [],
                    redoStackData = [],
                    start = 0,
                    count = 0,
                    drawHistoryReceivedFrom,
                    drawHistoryReceived,
                    batchUpdates = [],
                    iOS = /(iPad|iPhone|iPod)/g.test(navigator.userAgent);

                ctx.lineCap = "round";
                ctx.fillStyle = "solid";


                scope.colors = [{
                        'background-color': 'black'
                    },
                    {
                        'background-color': 'blue'
                    },
                    {
                        'background-color': 'red'
                    },
                    {
                        'background-color': 'green'
                    },
                    {
                        'background-color': 'orange'
                    },
                    {
                        'background-color': 'purple'
                    },
                    {
                        'background-color': 'brown'
                    }];
                scope.captureText = iOS ? 'Email' : 'Capture';

                canvas.width = attrs.width || element.width();
                canvas.height = attrs.height || element.height();

                var clearCanvas = function () {
                    ctx.save();

                    // Use the identity matrix while clearing the canvas
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Restore the transform
                    ctx.restore();
                };

                scope.changeColor = function (color) {
                    scope.color = color['background-color'];
                    scope.lineWidth = 2;
                    scope.erasing = false;
                };

                scope.changeColor(scope.colors[Math.floor(Math.random() * scope.colors.length)]);

                scope.clear = function () {
                    clearCanvas();
                    clearStack();
                    clear
                    if (OTSession.session) {
                        OTSession.session.signal({
                            type: 'otWhiteboard_clear'
                        });
                    }
                };

                scope.erase = function () {
                    scope.color = element.css("background-color") || "#fff";
                    scope.lineWidth = 50;
                    scope.erasing = true;
                };

                scope.capture = function () {
                    if (iOS) {
                        // On iOS you can put HTML in a mailto: link
                        window.location.href = "mailto:?subject=Whiteboard&Body=<img src='" + canvas.toDataURL('image/png') + "'>";
                    } else {
                        // We just open the image in a new window
                        // here is the most important part because if you dont replace you will get a DOM 18 exception.
                        //var imghref=canvas.toDataURL("image/jpeg").replace("image/png", "image/octet-stream");

                        //scope.imageName=imghref;
                        window.open(canvas.toDataURL('image/png'));
                    }
                };

                var draw = function (update) {
                    if (!update)
                        return;
                    ctx.strokeStyle = update.color;
                    ctx.lineWidth = update.lineWidth;
                    ctx.beginPath();
                    ctx.moveTo(update.fromX, update.fromY);
                    ctx.lineTo(update.toX, update.toY);
                    ctx.stroke();
                    ctx.closePath();

                    //drawHistory.push(update);
                };

                var drawUpdates = function (updates) {
                    updates.forEach(function (update) {

                        draw(update);
                        drawHistory.push(update);
                    });
                };


                /*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/
                scope.undo = function () {
                    if (!undoStack.length)
                        return;
                    undodata = undoStack.pop();

                    undoWhiteBoard(undodata, 1);

                    //for(i=0;i<undoStack[undoStack.length-1];i++)
                    //redoStackData.push(drawHistory.pop());
                    redoStack.push(undodata);
                    sendUpdate('otWhiteboard_undo', undodata);
                    /*
				if (OTSession.session) {
                    batchUpdates.push(undodata);
                    if (!updateTimeout) {
                        updateTimeout = setTimeout(function () {
                            batchSignal('otWhiteboard_undo', batchUpdates);
                            batchUpdates = [];
                            updateTimeout = null;
                        }, 100);
                    }
                }*/
                    //batchSignal('otWhiteboard_undo', redoStack[redoStack.length-1]);
                };
                var undoWhiteBoard = function (data, flag) {
                        if (flag) {
                            drawHistory.splice(data.start - data.count, data.count).forEach(function (update) {
                                redoStackData.push(update);
                            });
                        } else
                            drawHistory.splice(data.start - data.count, data.count);
                        //console.log(redoStackData);
                        /*
				while(data--)
					flag?redoStackData.push(drawHistory.pop()):drawHistory.pop();*/
                        clearCanvas();
                        drawHistory.forEach(function (update) {
                            draw(update);
                        });
                    }
                    /*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/

                scope.redo = function () {
                    if (!redoStack.length)
                        return;

                    for (i = 0; i < redoStack[redoStack.length - 1].count; i++) {
                        update = redoStackData.pop();
                        draw(update);
                        drawHistory.push(update);
                        sendUpdate('otWhiteboard_update', update);
                    }
                    undoStack.push(redoStack.pop());

                };



                var batchSignal = function (type, data, toConnection) {
                    // We send data in small chunks so that they fit in a signal
                    // Each packet is maximum ~250 chars, we can fit 8192/250 ~= 32 updates per signal
                    var dataCopy = data.slice();
                    var signalError = function (err) {
                        if (err) {
                            TB.error(err);
                        }
                    };
                    while (dataCopy.length) {
                        var dataChunk = dataCopy.splice(0, Math.min(dataCopy.length, 32));
                        var signal = {
                            type: type,
                            data: JSON.stringify(dataChunk)
                        };
                        if (toConnection) signal.to = toConnection;
                        OTSession.session.signal(signal, signalError);
                    }
                };

                var updateTimeout;
                var sendUpdate = function (type, update) {
                    if (OTSession.session) {
                        batchUpdates.push(update);
                        if (!updateTimeout) {
                            updateTimeout = setTimeout(function () {
                                batchSignal(type, batchUpdates);
                                batchUpdates = [];
                                updateTimeout = null;
                            }, 100);
                        }
                    }
                };

                var clearStack = function () {
                    drawHistory = [];
                    undoStack = [];
                    redoStack = [];
                    redoStackData = [];
                    checkpoints = 0;
                }


                /*------------------------------------------------Under Construction-------------------------------------------------------------*/
                angular.element(inputFile).on('change', function (event) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        var img = new Image();
                        img.onload = function () {

                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                            //var imgobj=canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg);base64,/, "");
                            /*
						if (OTSession.session) {
							batchUpdates.push();
							
							if (!updateTimeout) {
								updateTimeout = setTimeout(function () {
									batchSignal('otWhiteboard_canvasUpdate', batchUpdates);
									batchUpdates = [];
									updateTimeout = null;
								}, 100);
							}
						}*/
                        };
                        img.src = e.target.result;
                    }
                    reader.readAsDataURL(event.target.files[0]);
                    clearStack();
                });

                var updateCanvas = function (image) {
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                };
                /*--------------------------------------------------------------------------------------------------------------------------------*/
                angular.element(document).on('keyup', function (event) {
                    if (event.ctrlKey) {

                        if (event.keyCode === 90) {
                            scope.undo();
                        }
                        if (event.keyCode === 89) {
                            scope.redo();
                        }
                    }
                });
                var check = 0;
                angular.element(canvas).on('mousedown mousemove mouseup mouseout touchstart touchmove touchend',
                    function (event) {
                        if (event.type === 'mousemove' && !client.dragging) {
                            // Ignore mouse move Events if we're not dragging
                            return;
                        }
                        event.preventDefault();

                        var offset = angular.element(canvas).offset(),
                            scaleX = canvas.width / element.width(),
                            scaleY = canvas.height / element.height(),
                            offsetX = event.offsetX || event.originalEvent.pageX - offset.left ||
                            event.originalEvent.touches[0].pageX - offset.left,
                            offsetY = event.offsetY || event.originalEvent.pageY - offset.top ||
                            event.originalEvent.touches[0].pageY - offset.top,
                            x = offsetX * scaleX,
                            y = offsetY * scaleY;

                        switch (event.type) {
                        case 'mousedown':
                        case 'touchstart':
                            client.dragging = true;
                            client.lastX = x;
                            client.lastY = y;
                            break;
                        case 'mousemove':
                        case 'touchmove':
                            if (client.dragging) {
                                var update = {
                                    id: OTSession.session && OTSession.session.connection &&
                                        OTSession.session.connection.connectionId,
                                    fromX: client.lastX,
                                    fromY: client.lastY,
                                    toX: x,
                                    toY: y,
                                    color: scope.color,
                                    lineWidth: scope.lineWidth
                                };

                                count++;

                                draw(update);
                                drawHistory.push(update);
                                client.lastX = x;
                                client.lastY = y;
                                sendUpdate('otWhiteboard_update', update);

                            }
                            break;
                        case 'mouseup':
                        case 'touchend':
                        case 'mouseout':
                            client.dragging = false;

                            if (count) {
                                start = drawHistory.length;
                                undoStack.push({
                                    start, count
                                });
                                count = 0;
                            }



                        }
                    });

                if (OTSession.session) {
                    OTSession.session.on({
                        'signal:otWhiteboard_update': function (event) {
                            if (event.from.connectionId !== OTSession.session.connection.connectionId) {
                                drawUpdates(JSON.parse(event.data));
                                scope.$emit('otWhiteboardUpdate');
                            }
                        },
                        'signal:otWhiteboard_undo': function (event) {
                            if (event.from.connectionId !== OTSession.session.connection.connectionId) {
                                undoWhiteBoard(JSON.parse(event.data), 0);
                                scope.$emit('otWhiteboardUpdate');
                            }
                        },
                        'signal:otWhiteboard_history': function (event) {
                            // We will receive these from everyone in the room, only listen to the first
                            // person. Also the data is chunked together so we need all of that person's
                            if (!drawHistoryReceivedFrom || drawHistoryReceivedFrom === event.from.connectionId) {
                                drawHistoryReceivedFrom = event.from.connectionId;
                                drawUpdates(JSON.parse(event.data));
                                scope.$emit('otWhiteboardUpdate');
                            }
                        },
                        'signal:otWhiteboard_clear': function (event) {
                            if (event.from.connectionId !== OTSession.session.connection.connectionId) {
                                clearCanvas();
                                clearStack();
                            }
                        },
                        /*************** Under Construction ******************/
                        'signal:otWhiteboard_canvasUpdate': function (event) {
                            if (event.from.connectionId !== OTSession.session.connection.connectionId) {

                                console.log(JSON.parse(event.data));
                                //updateCanvas(JSON.parse(event.data));
                                //scope.$emit('otWhiteboardUpdate');
                                //alert("suman");

                            }
                        },
                        /*****************************************************/
                        connectionCreated: function (event) {
                            if (drawHistory.length > 0 && event.connection.connectionId !==
                                OTSession.session.connection.connectionId) {
                                batchSignal('otWhiteboard_history', drawHistory, event.connection);
                            }
                        }
                    });
                }
            }
        };
}]);