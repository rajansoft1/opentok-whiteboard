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
    .directive('hlWhiteboard', ['OTSession', '$window', function (OTSession, $window) {
        return {
            restrict: 'E',
            template: '<canvas></canvas>' +
						
						'<div class="activityToolBox" >'+
							'<div class="Toolbox">'+
								'<div id="Blackcolor" ng-click="changeColor(\'black\')"></div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Redcolor" ng-click="changeColor(\'red\')"></div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Bluecolor" ng-click="changeColor(\'blue\')"></div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Greencolor" ng-click="changeColor(\'green\')"></div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								
								'<div id="Capture" ng-click="capture()">'+
									'<a style="text-decoration: none !important;" id="download-wb">'+
										'<img src="static/font-awesome/black/svg/camera-retro.svg" altext=""/>'+
									'</a>'+
								'</div>'+
								
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Eraser" ng-click="erase()">'+
									'<img src="static/font-awesome/black/svg/eraser.svg" altext=""/>'+
								'</div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Undo" ng-click="undo()" >'+
									'<img src="static/font-awesome/black/svg/undo.svg" altext=""/>'+
								'</div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Redo" ng-click="redo()" >'+
									'<img src="static/font-awesome/black/svg/repeat.svg" altext=""/>'+
								'</div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Empty"></div>'+
							'</div>'+
							
							'<div class="Toolbox">'+
								'<div id="Clear" ng-click="clear()">'+
									'<img src="static/font-awesome/black/svg/times.svg" altext=""/>'+
								'</div>'+
							'</div>'+
						
						'</div>'
						/*+

                '<div class="OT_panel">' +

                '<input type="button" ng-class="{OT_color: true, OT_selected: c[\'background-color\'] === color}" ' +
                'ng-repeat="c in colors" ng-style="c" ng-click="changeColor(c)">'+
                '</input>' +

                '<input type="button" ng-click="erase()" ng-class="{OT_erase: true, OT_selected: erasing}"' +
                ' value="Eraser"></input>' +

                '<a style="text-decoration: none !important;" id="download-wb"><input type="button" ng-click="capture()" class="OT_capture" value="{{captureText}}"></input></a>'+

                '<input type="button" ng-click="clear()" class="OT_clear" value="Clear"></input>' +

                '<input type="button" ng-click="undo()" class="OT_undo" value="Undo"></input>' +

                '<input type="button" ng-click="redo()" class="OT_redo" value="Redo"></input>' +
                '<input type="file" class="OT_loadImage" id="OT_loadImage" value="Load\nImage"></input>'*/,

            link: function (scope, element, attrs) {
                var canvas = element.context.querySelector("canvas"),
                    select = element.context.querySelector("select"),
                    input = element.context.querySelector("input"),
                    inputImage = element.context.querySelector("#download-wb"),
                    inputFile = element.context.querySelector("input.OT_loadImage"),
                    client = {
                        dragging: false
                    },
                    ctx = canvas.getContext("2d"),//could create problem in integration
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
                ctx.lineCap = "round";//could create problem in integration
                ctx.fillStyle = "solid";//could create problem in integration


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
                    scope.color = color;
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
                    if (!update.show)
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

                scope.undo = function () {
                    if (!undoStack.length)
                        return;
                    var undodata = undoStack.pop();
                    undoWhiteBoard(undodata);
                    redoStack.push(undodata);
					console.log(undodata);
                    sendUpdate('otWhiteboard_undo', undodata);
                };
                var undoWhiteBoard = function (data) {
					//console.log(data.start);
					
					for(i=data.start - data.count;i<data.start;i++){
						//redoStackData(drawHistory[i]);
						drawHistory[i].show=0;;
					}
					
						
					
					clearCanvas();
					drawHistory.forEach(function (update) {
						draw(update);
					});
				}				
                scope.redo = function () {
                    if (!redoStack.length)
                        return;
					var redodata = redoStack.pop();
					redoWhiteBoard(redodata);
					undoStack.push(redodata);
					sendUpdate('otWhiteboard_redo', redodata);
                };
				var redoWhiteBoard = function(data){
					for(i=data.start - data.count;i<data.start;i++){
						//redoStackData(drawHistory[i]);
						drawHistory[i].show=1;
					}
					clearCanvas();
					drawHistory.forEach(function (update) {
						draw(update);
					});
				}
				
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
							
							
                        /*    
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
                                    lineWidth: scope.lineWidth,
									show: 1
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
								//console.log(JSON.parse(event.data.start));
								JSON.parse(event.data).forEach( function(data){
									undoWhiteBoard(data);
								});
                                
                                scope.$emit('otWhiteboardUpdate');
                            }
                        },
						'signal:otWhiteboard_redo': function (event) {
                            if (event.from.connectionId !== OTSession.session.connection.connectionId) {
								//console.log(JSON.parse(event.data.start));
								JSON.parse(event.data).forEach( function(data){
									redoWhiteBoard(data);
								});
                                
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