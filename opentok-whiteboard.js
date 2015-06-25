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

                '<a style="text-decoration: none !important;" id="download"><input type="button" ng-click="capture()" class="OT_capture" value="{{captureText}}"></input></a>'+

                '<input type="button" ng-click="clear()" class="OT_clear" value="Clear"></input>' +

                '<input type="button" ng-click="undo()" class="OT_undo" value="Undo"></input>' /*+

                '<input type="button" ng-click="redo()" class="OT_redo" value="Redo"></input>' +
                '<input type="file" class="OT_loadImage" id="OT_loadImage" value="Load\nImage"></input>'*/,

            link: function (scope, element, attrs) {
                var canvas = element.context.querySelector("canvas"),
                    select = element.context.querySelector("select"),
                    input = element.context.querySelector("input"),
                    inputImage = element.context.querySelector("#download"),
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
				var mainuser=1;
				var imgobj;
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
                    }];
                scope.captureText = iOS ? 'Email' : 'Capture';

                canvas.width = attrs.width || element.width();
                canvas.height = attrs.height || element.height();

                

                scope.changeColor = function (color) {
                    scope.color = color['background-color'];
                    scope.lineWidth = 2;
                    scope.erasing = false;
                };

                scope.changeColor(scope.colors[Math.floor(Math.random() * scope.colors.length)]);

                scope.clear = function () {
                    clearCanvas();
                    clearStack();
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
						inputImage.href=canvas.toDataURL('image/png');
						inputImage.download="homelane.png";
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
				
				var clearCanvas = function () {
                    ctx.save();

                    // Use the identity matrix while clearing the canvas
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Restore the transform
                    ctx.restore();
                };

                /*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/
                scope.undo = function () {
                    if (!undoStack.length)
                        return;
                    undodata = undoStack.pop();
                    undoWhiteBoard(undodata, 1);
                    redoStack.push(undodata);
                    sendUpdate('otWhiteboard_undo', undodata);
                };
                var undoWhiteBoard = function (data, flag) {
					if (flag) {
						drawHistory.splice(data.start - data.count, data.count).forEach(function (update) {
							redoStackData.push(update);
						});
					} else{
						data.forEach(function (update) {
							drawHistory.splice(update.start - update.count, update.count);
						});
					}
					clearCanvas();
					drawHistory.forEach(function (update) {
						draw(update);
					});
				}
                    /*^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^*/
				/*
                scope.redo = function () {
                    if (!redoStack.length)
                        return;
					var position= redoStack[redoStack.length - 1].start-redoStack[redoStack.length - 1].count;
					var data=redoStackData.splice(redoStackData.length-redoStack[redoStack.length - 1].count,redoStack[redoStack.length - 1].count);
					//redoWhiteBoard(data,position);
					
					data.forEach(function (datapoints)){
						redodata={pos: position++, update: datapoints};
						redoWhiteBoard(redodata);
						sendUpdate('otWhiteboard_redo', redodata);
					}
					/*
                    for (i = 0; i < redoStack[redoStack.length - 1].count; i++) {
                        update = redoStackData.pop();
                        draw(update);
                        drawHistory.push(update);
                        sendUpdate('otWhiteboard_update', update);
                    //}
                    undoStack.push(redoStack.pop());

                };
				var redoWhiteBoard = function(redodata){
					drawHistory.splice(redodata.pos,0,redodata.update);
					//drawHistory.splice.apply(drawHistory,[position, 0].concat(updates));
					clearCanvas();
					drawHistory.forEach(function (update) {
                        draw(update);
                    });
					
					
				}
				*/
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
                var batchSignal = function (type, data, toConnection) {
                    // We send data in small chunks so that they fit in a signal
                    // Each packet is maximum ~250 chars, we can fit 8192/250 ~= 32 updates per signal
					if( mainuser) {
						localStorage.setItem('wb-drawHistory', JSON.stringify(drawHistory));
						localStorage.setItem('wb-undoStack', JSON.stringify(undoStack));
						localStorage.setItem('wb-redoStack', JSON.stringify(redoStack));
						localStorage.setItem('wb-redoStackData', JSON.stringify(redoStackData));
					}
					
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
						console.log("yaha be gadbad3");
                        OTSession.session.signal(signal, signalError);
																		

                    }
                };

                var updateTimeout;
                

                var clearStack = function () {
                    drawHistory = [];
                    undoStack = [];
                    redoStack = [];
                    redoStackData = [];
					start=0;
					count=0;
                }


                /*------------------------------------------------Under Construction-------------------------------------------------------------*/
                angular.element(inputFile).on('change', function (event) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        img = new Image();
                        img.onload = function () {

                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

							
                            var imgobj=canvas.toDataURL("image/png").splice();
							console.log(imgobj.length);
							//while(imgobj.length){
								
							//	var datachunk
							//}
							
							//console.log(imgobj);
							
							
                            
						if (OTSession.session) {
							console.log("yaha be gadbad1");
							batchUpdates.push(imgobj);
							console.log("yaha be gadbad2");
							
							if (!updateTimeout) {
								updateTimeout = setTimeout(function () {
									batchSignal('otWhiteboard_canvasUpdate', batchUpdates);
									batchUpdates = [];
									updateTimeout = null;
								}, 100);
							}
						}
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
								//console.log("suman");
								//console.log(JSON.parse(event.data.start));
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
								console.log(OTSession.session.connection.connectionId);
								mainuser=0;
                                batchSignal('otWhiteboard_history', drawHistory, event.connection);
                            }
							
								
                        }
                    });
                }
            }
        };
}]);