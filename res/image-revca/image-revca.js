"use strict";
(function(){
    var canv = document.getElementById("canv");
    var ctx = null;
    var width, height, rowSpan, imgData, data;
    var forward = true;
    var generation = 0;
    var phase = 0;
    var simulationStep = 32;
    var timer = null;
    var dirty = false;
    var stopList = {0:true};

    var imageSamples=[
	{'url': 'sample1.png',
	 'thumb': 'thumbs/sample1.png'},
	{'url': 'sample2.png',
	 'thumb': 'thumbs/sample2.png'},
	{'url': 'sample3.png',
	 'thumb': 'thumbs/sample3.png'},
	{'url': 'sample4.png',
	 'thumb': 'thumbs/sample4.png'},
	{'url': 'sample5.png',
	 'thumb': 'thumbs/sample5.png'},
	{'url': 'flower.png',
	 'thumb': 'thumbs/flower.png'},
	{'url': 'joke.png',
	 'thumb': 'thumbs/joke.png'},
	
    ];
    
    var elemGen = document.getElementById("generation");
    if (!canv) console.log("Canvas not found");


    var loadImageURL = function(imgUrl){
	var img = new Image();
	img.onload = function(e){
	    loadImage(img);
	};
	img.src = imgUrl;
    };
    
    var loadImage = function(img){
	canv.width = img.width;
	canv.height = img.height;
	ctx = canv.getContext("2d");
	ctx.fillStyle="black";
	ctx.fillRect(0,0,canv.width,canv.height);
	ctx.drawImage(img,0,0);
	
	width=canv.width, height=canv.height;
	rowSpan = width*4;
	imgData = ctx.getImageData(0,0,width,height);
	width = imgData.width;
	height = imgData.height;
	data = imgData.data;
	
	generation = 0;
	phase = 0;
	dirty = true;
    }

    var abs = Math.abs;
    var getrgb=function(i){
	return data[i] | (data[i+1]<<8) | (data[i+2]<<16);
    };
    
    var setrgb=function(i, v){
	data[i] = v&0xff;
	data[i+1] = (v>>8)&0xff;
	data[i+2] = (v>>16)&0xff;
    };

    //distance between 2 colors
    var rgbd=function(rgb1,rgb2){
	return abs((rgb1&0xff) - (rgb2&0xff)) + abs(((rgb1>>8)&0xff) - ((rgb2>>8)&0xff)) + abs(((rgb1>>16)&0xff) - ((rgb2>>16)&0xff) );
    };

    //transform one 2x2 block of image
    var tfmBlock=function(i0){
	var i1 = i0+rowSpan;
	var D = 3;
	var c1 = getrgb(i0), c2=getrgb(i0+4), c3=getrgb(i1), c4=getrgb(i1+4);
	var c1_, c2_, c3_, c4_;
	
	var d12 = rgbd(c1,c2);
	var d13 = rgbd(c1,c3);
	var d14 = rgbd(c1,c4);
	var d23 = rgbd(c2,c3);
	var d24 = rgbd(c2,c4);
	var d34 = rgbd(c3,c4);

	//the idea behind this formula: color distance from a pixel to the rest of pixels is D times bigger than distance between them.
	//i.e. the pixel color is outstanding.
	if ( (Math.min(d12,d13,d14) > Math.max(d23,d24,d34) * D) ||
	     (Math.min(d12,d23,d24) > Math.max(d13,d14,d34) * D) ||
	     (Math.min(d13,d23,d34) > Math.max(d14,d24,d12) * D) ||
	     (Math.min(d14,d24,d34) > Math.max(d12,d23,d13) * D) ){
	    
	    //In this case: rotate block
	    if(forward){
		//1 2 > 3 1
		//3 4 > 4 2
		c1_ = c3; c2_ = c1;
		c3_ = c4; c4_ = c2;
	    }else{
		//backward in time
		//1 2 > 2 4
		//3 4 > 1 3
		c1_ = c2; c2_ = c4;
		c3_ = c1; c4_ = c3;
	    }
	    c1=c1_;c2=c2_;c3=c3_; c4=c4_;

	    setrgb(i0, c1);
	    setrgb(i0+4, c2);
	    setrgb(i1, c3);
	    setrgb(i1+4, c4);	    
	}
    };

    //perform one step of simulation
    var doTfm=function(){
	for( var y =phase ; y< height-phase; y+=2){
	    var offset = y*rowSpan+phase*4;
	    for( var x=phase ; x<width-phase; x+=2,offset+=8){
		tfmBlock(offset);
	    }
	}
	phase = phase ^ 1;
	generation = generation + (forward? 1 : -1);
    };

    var startSimulation = function(){
	if (timer) return;
	var calculateStep=function(){
	    var stopped = false;
	    for(var i=0;i<simulationStep;++i) {
		doTfm();
		if(generation in stopList){
		    stopSimulation();
		    stopped = true;
		    break;
		}
	    };
	    dirty = true;
	    if (!stopped)
		timer = window.setTimeout(calculateStep, 1000/60);
	};
	calculateStep();
    };
    
    var stopSimulation = function(){
 	window.clearTimeout(timer);
	timer = null;
    };


    var updateFrame = function(timestamp) {
	if (dirty){
	    dirty = false;
	    elemGen.innerHTML = ""+generation;
	    ctx.putImageData(imgData, 0,0);
	}
	window.requestAnimationFrame(updateFrame);
    };

    var parseStopList=function(strStops){
	var stops = strStops.split(' ');
	var stopList = {};
	for (var sStopTime of stops){
	    var stopT = parseInt(sStopTime, 10);
	    if (!isNaN(stopT)){
		stopList[stopT] = true;
	    }
	}
	return stopList;
    };
    var updateStopList=function(){
	stopList = parseStopList(document.getElementById("fld-stoplist").value);
    };

    var updateSamplesList=function(){
	var samplesList = document.getElementById("samples");
	var makeSelector = function(sample){
	    return function(e){
		e.preventDefault();
		stopSimulation();
		loadImageURL(sample.url);
	    };
	};
	for(var sample of imageSamples){
	    var li=document.createElement("li");
	    var thumb=document.createElement("img");
	    var thumb_a=document.createElement("a");
	    thumb_a.href="#";
	    thumb_a.onclick=makeSelector(sample);
	    thumb.src=sample.thumb;
	    thumb.title="Click to load image";
	    thumb_a.appendChild(thumb);
	    li.appendChild(thumb_a);
	    samplesList.appendChild(li);
	};
    };
    
    window.addEventListener('load', (function(e){
	loadImageURL("./sample1.png");
	updateStopList();
	updateSamplesList();
	window.requestAnimationFrame(updateFrame);
    }));
    
    document.getElementById("btn-forward").addEventListener("click", (function(e){
	if (!forward) 	phase = phase ^ 1;
	forward = true;
	startSimulation();
    }));
    document.getElementById("btn-backward").addEventListener("click", (function(e){
	if (forward) 	phase = phase ^ 1;
	forward = false;
	startSimulation();
    }));
    document.getElementById("btn-stop").addEventListener("click", (function(e){
	if (timer){
	    stopSimulation();
	}
    }));
    document.getElementById("fld-stoplist").addEventListener("change", updateStopList);
    document.getElementById("fld-simstep").addEventListener("change", function(e){
	var ss = parseInt(e.target.value,10);
	if (ss > 0 && !isNaN(ss)){
	    simulationStep = ss;
	    console.log("Simstep set to"+ss);
	}else{
	    alert("Bad simulation step: "+e.target.value+"\nMust be positive interger");
	};
    });
    

    document.getElementById("fld-customfile").addEventListener("change", function(e){
	if (e.target.files.length<1) return;
	var selectedFile = e.target.files[0];
	var reader = new FileReader();
	reader.onload=function(e){
	    loadImageURL(e.target.result);
	};
	reader.readAsDataURL(selectedFile);	
    })
})();
