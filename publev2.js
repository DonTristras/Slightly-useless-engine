//Publes2D base class

// READ http://stackoverflow.com/questions/7615009/disable-interpolation-when-scaling-a-canvas

function publes2d(Configuration) {
    //Canvas info
    this.canvas;
    this.canvasContext;

    //Local
    var _this = this;

    this.id;
    this.canvasX;
    this.canvasY;
    this.lineJoinStyle = { miter: "miter", round: "round", bevel: "bevel" };
    this.materials = {
        metal: { lineColor: "#7F7F7F", fillColor: "#8F8F8F", density: 0.8, bounciness: 0.4, sound: "blabla.ogg" },
        wood: { lineColor: "#923D00", fillColor: "#823D00", density: 0.5, bounciness: 0.6, sound: "blabla.ogg" },
        ice: { lineColor: "#30EDF0", fillColor: "#30EDF0", density: 0.6, bounciness: 0.2, sound: "blabla.ogg" },
        bouncy: { lineColor: "#FF40FB", fillColor: "#FF80FB", density: 0.3, bounciness: 0.9, sound: "blabla.ogg" },
        superGum: { lineColor: "#FF80FB", fillColor: "#FF80FB", density: 0.2, bounciness: 1, sound: "blabla.ogg" }
    };
    this.lineWidth = 4;
    //Figures info
    this.objectsArray = new Array();
    this.yGravity = 1;
    this.xGravity = 0;
    this.defaultFriction = 0.98;

    //FrameOptimizer
    this.stableDelay = 8;
    this.frameRate = function () {
        if (_this.stableDelay > 0) {
            if (_this.FPS > 60) {
                _this.stableDelay += 0.1;
            } else if (_this.FPS < 30) {
                _this.stableDelay += -0.1;
            };
            return _this.stableDelay;
        } else {
            //return slowest rate (game to slow)
            _this.stableDelay = 0.1;
            return 0;
        }
    };

    this.PxArray;

    //Interface detection
    this.endx = false;
    this.IsRunning = true;

    //Scenary configuration params
    this.ShapeQuality = 15;
    this.isMouseDown = false;
    this.debugMode = true;
    //current
    this.selectedMaterial = this.materials.wood;
    this.selectedJoinStyle = this.lineJoinStyle.round;

    // base items definition
    var object2D = function () {
        this.id;
        this.cords = [];
        this.cordsMeta = [];
        this.colMemorendum = [];
        this.xMagnitude = 0; //Horizontal force
        this.yMagnitude = 0; //Vertical force
        this.rMagnitude = 0; // 0.05; //Centrifugal force or rForce
        this.mass;
        this.area;
        this.bounciness;
        this.friction;
        this.centerPoint = { x: 0, y: 0 };
        this.gravityPoint = { x: 0, y: 0 };
        this.isRigidBody;
        this.isVisible;
        this.isCollidable;
        this.material;
        this.joinStyle;
        this.farestPolyCordSize;
        this.nearestPolyCordSize;
    };

    //########## draw and save ###############
    var cordList = [];
    function cordBuilder(event) {
        if (this.isMouseDown && cordList.length == 0) {
            _this.IsRunning = false;
            var firstItem = getMousePosition(event);
            cordList.push(firstItem);
            canvasContext.beginPath();
            canvasContext.lineJoin = _this.selectedJoinStyle;
            canvasContext.moveTo(firstItem.x, firstItem.y);
            canvasContext.strokeStyle = _this.selectedMaterial.lineColor;
            canvasContext.fillStyle = _this.selectedMaterial.fillColor;
        } else if (this.isMouseDown) {
            canvasContext.lineWidth = this.pencilRadius;
            var LastItem = cordList[cordList.length - 1];
            var nextItem = getMousePosition(event);
            canvasContext.lineWidth = _this.lineWidth;
            canvasContext.lineTo(nextItem.x, nextItem.y);
            canvasContext.stroke();

            //We check for the line fidelity 
            if (getDistance(LastItem, nextItem) >= _this.ShapeQuality) {
                cordList.push(nextItem);
            };
        } else if (!this.isMouseDown && cordList.length > 0) {
            canvasContext.closePath();
            canvasContext.stroke();
            canvasContext.fill();
            if(!SetNewObject2d(cordList, false, true)){
                console.log("Warning: Element has been drawn with to few coordenates, object dismissed. Draw longer lines or reduce shape quality.");
            };
            cordList = [];
            _this.IsRunning = true;
        }
    }
    //Method to pupulate new object into the object matrix
    var LasObjectId = 0;
    function SetNewObject2d(cordsList, isRigid, isVisible) {
        if(cordsList.length < 3 && !isRigid){return false;};
        var obj = new object2D;
        obj.cords = cordsList;
        obj.id = LasObjectId;
        obj.area = GetPoligonArea(cordsList);
        obj.mass = GetPoligonMass(_this.selectedMaterial.density, obj.area); //Leave it like this for the moment until I can calculate the area (size) of the coordinates
        obj.isRigidBody = isRigid;
        obj.isVisible = isVisible;
        obj.isCollidable = true;
        obj.material = _this.selectedMaterial;
        obj.joinStyle = _this.selectedJoinStyle;
        obj.centerPoint = SetCenterPoint(obj);
        obj.gravityPoint = obj.centerPoint;
        obj.rMagnitude = GetRandom(0, 0.2); //temporary
        obj.farestPolyCord = GetFarestPolyCord(cordsList, obj.centerPoint);
        _this.objectsArray.push(obj);
        LasObjectId++;
        return true;
    };
    //method to get mouse possition over the canvas
    function getMousePosition(e) {
        var mouseX, mouseY;
        if (e.offsetX) {
            mouseX = e.offsetX;
            mouseY = e.offsetY;
        }
        else if (e.layerX) {
            mouseX = e.layerX;
            mouseY = e.layerY;
        }
        return { x: mouseX, y: mouseY };
    }
    //END ########## draw and save ###############

    function SetCenterPoint(object2D) {
        var cordsSum = { x: 0, y: 0 };
        var count = 0;
        for (e = 0; e <= object2D.cords.length - 1; e++) {
            var nextCord = (e == object2D.cords.length - 1 ? 0 : e + 1);
            if (getDistance(object2D.cords[e], object2D.cords[nextCord]) > this.ShapeQuality * 1.5) {
                //If the length between two points is to width, we add the necessary ones until fit the ShapeQuality
                var result = getDistance(object2D.cords[e], object2D.cords[nextCord]) / this.ShapeQuality;
                for (t = 1; parseInt(result) > t; t++) {
                    cordsSum.x += ((object2D.cords[e].x - (object2D.cords[e].x + 1)) / result) * t;
                    cordsSum.y += ((object2D.cords[e].y - (object2D.cords[e].y + 1)) / result) * t;
                };
            } else {
                cordsSum.x += object2D.cords[e].x;
                cordsSum.y += object2D.cords[e].y;
            };
            count++;
        };
        var centerPoint = { x: cordsSum.x / count, y: cordsSum.y / count };
        return centerPoint;
    };

    //Set up functions
    function setConfiguration(arr) {
        this.canvas = document.getElementById(arr.canvas);
        this.canvasContext = this.canvas.getContext("2d");
        LoadEventListeners();
        this.canvasX = this.canvas.width;
        this.canvasY = this.canvas.height;
        //Load motor
        CoreLoop();
        //generate bordes for collision
        CreateBorderObjects();
    };
    setConfiguration(Configuration);

    //Generate border as rigid objects
    function CreateBorderObjects() {
        var o1 = [{ x: 0, y: 0 }, { x: this.canvasX, y: 0 }];
        var o3 = [{ x: 0, y: 0 }, { x: 0, y: this.canvasY }];
        var o2 = [{ x: this.canvasX, y: 0 }, { x: this.canvasX, y: this.canvasY }];
        var o4 = [{ x: 0, y: this.canvasY }, { x: this.canvasX, y: this.canvasY }];
        SetNewObject2d(o1, true, false);
        SetNewObject2d(o2, true, false);
        SetNewObject2d(o3, true, false);
        SetNewObject2d(o4, true, false);
    };

    //Event Functions
    function LoadEventListeners() {
        this.canvas.addEventListener("mousedown", function () { this.isMouseDown = true; }, false);
        this.canvas.addEventListener("mouseup", function () { this.isMouseDown = false; }, false);
        this.canvas.addEventListener("mousemove", cordBuilder, false);
    };

    //Draw Engines
    function CoreLoop() {
        window.setTimeout(function () {
            if (_this.IsRunning) {
                moveToNextFrame();
                window.setTimeout(CoreLoop, _this.frameRate());
            } else {
                CalculateDeltaTime();
                window.setTimeout(CoreLoop, _this.frameRate());
            };
        }, _this.frameRate());
    };


    function moveToNextFrame() {
        //Cleaning all the stuff
        CanvasClean();
        //Calculating
        CanvasCalculation();
        //Drawing result
        CanvasDraw();
        //Frames calculator
        if (_this.debugMode) { CanvasFrames(); }; //Change true to frames checker
        CalculateDeltaTime();
    };

    //physic calculation part
    var TempInfoArray = [];
    function CanvasCalculation() {
        //update magnitude of all objects
        TempInfoArray = [];
        TempInfoArray = JSON.parse(JSON.stringify(_this.objectsArray)); //deep clone object. Is it perfoming? can it break because of string convert?
        for (i = 0; i <= _this.objectsArray.length - 1; i++) {
            TempInfoArray[i].gravityPoint = TempInfoArray[i].centerPoint;

            if (!TempInfoArray[i].isRigidBody) {
                //add base movement to all objects
                TempInfoArray[i].xMagnitude += _this.xGravity * (_this.deltaTime / 100);
                TempInfoArray[i].yMagnitude += _this.yGravity * (_this.deltaTime / 100);

                //apply movements and rotations
                TempInfoArray[i].rMagnitude *= _this.defaultFriction;

                TempInfoArray[i].centerPoint.x += TempInfoArray[i].xMagnitude;
                TempInfoArray[i].centerPoint.y += TempInfoArray[i].yMagnitude;
                TempInfoArray[i].centerPoint = rotatePoint(TempInfoArray[i].gravityPoint, TempInfoArray[i].centerPoint, TempInfoArray[i].rMagnitude);

                for (e = 0; e <= _this.objectsArray[i].cords.length - 1; e++) {
                    //rotate object using this loop
                    TempInfoArray[i].cords[e].x += TempInfoArray[i].xMagnitude;
                    TempInfoArray[i].cords[e].y += TempInfoArray[i].yMagnitude;
                    TempInfoArray[i].cords[e] = rotatePoint(TempInfoArray[i].gravityPoint, TempInfoArray[i].cords[e], TempInfoArray[i].rMagnitude);
                };
            };
        };
        //Check collission now everything has been moved
        for (i = 0; i <= _this.objectsArray.length - 1; i++) {
            if (!TempInfoArray[i].isRigidBody) {
                if (ObjectCollisionCheck(i)) {
                    continue;
                };
            };
        };

        //apply changes total
       _this.objectsArray = TempInfoArray;
    };

    //Function which does the checks for colission with other objects
    function ObjectCollisionCheck(i) {
        for (a = 0; a <= _this.objectsArray.length - 1; a++) {
            if (a == i) { continue; }; //Exit testing if its the same Object

            //check if has previously colided in previous rotation
            //but first check if its set and initalite              
            if (isNaN(TempInfoArray[i].colMemorendum[TempInfoArray[a].id])) {
                TempInfoArray[i].colMemorendum[TempInfoArray[a].id] = 0;
            };
            if (isObjectColliding(i, a)) { //check if is colliding and calculates movement
                if(TempInfoArray[i].colMemorendum[TempInfoArray[a].id] <= 1){ //do if 
                }else if(TempInfoArray[i].colMemorendum[TempInfoArray[a].id] >= 2  && TempInfoArray[i].colMemorendum[TempInfoArray[a].id] <= 20){
                } else { 
                };
            } else {
                if (TempInfoArray[i].colMemorendum[TempInfoArray[a].id] != 0) {
                    TempInfoArray[i].colMemorendum[TempInfoArray[a].id] -= 1;
                };
            };
        };
    };

    //calculations when 2 objects collide
    function CalculateCollision(objectA, objectB, colCord, colCord2) {
        var middleCord = { x: (colCord.x + colCord2.x) / 2, y: (colCord.y + colCord2.y) / 2 };
        var hitCord =  GetSide(objectA.centerPoint, { x: objectA.xMagnitude + objectA.centerPoint.x, y: objectA.yMagnitude + objectA.centerPoint.y }, colCord);
        var side = GetSide(objectA.centerPoint, { x: objectA.xMagnitude + objectA.centerPoint.x, y: objectA.yMagnitude + objectA.centerPoint.y }, middleCord);
        //if colindant object is rigid, calculate following
        if (objectB.isRigidBody) {
            TempInfoArray[i].yMagnitude = ((objectA.yMagnitude * -1) +  (side * 0.01)) * objectA.material.bounciness;
            TempInfoArray[i].xMagnitude = ((objectA.xMagnitude * -1) + (side * 0.01)) * objectA.material.bounciness;
            TempInfoArray[i].rMagnitude = ((objectA.rMagnitude * -1) + (-side * 0.002)) * _this.defaultFriction;
            //console.log(side);
        } else {
            TempInfoArray[i].yMagnitude = ((objectA.yMagnitude + (side * 0.01)) * -objectA.material.bounciness);
            TempInfoArray[i].xMagnitude = ((objectA.xMagnitude + (side * 0.01)) * -objectA.material.bounciness);
            TempInfoArray[i].rMagnitude = ((objectA.rMagnitude + (-side * 0.002)) * _this.defaultFriction);
        };
    };

    //check if object is colliding with others
    function isObjectColliding(i, a) {
        for (e = 0; e <= _this.objectsArray[i].cords.length - 1; e++) {
            var currentCord = TempInfoArray[i].cords[e];
            var currentCord2 = TempInfoArray[i].cords[e + 1];
            if (currentCord2 != "undefined") {
                currentCord2 = TempInfoArray[i].cords[0];
            };
            if (typeof TempInfoArray[a] != "undefined") {
                if (isObjectSideColliding(TempInfoArray[a].cords, currentCord, currentCord2)) {      
                    TempInfoArray[i] = _this.objectsArray[i];  
                    CalculateCollision(TempInfoArray[i], TempInfoArray[a], currentCord, currentCord2);
                    TempInfoArray[i].colMemorendum[TempInfoArray[a].id] += 1;
                    return true;
                };
            };
        };
    };

     //check if object is coliding with others
     function isObjectSideColliding(objectCords, cord1, cord2) {
        for (u = 0; u <= objectCords.length - 1; u++) {
            if (typeof objectCords[u + 1] != "undefined" && doLinesOverlap(cord1, cord2, objectCords[u], objectCords[u + 1])) {
                return true;
            } else if (doLinesOverlap(cord1, cord2, objectCords[u], objectCords[0])) {
                return true;
            };
        };

        return false;
    };


    //canvas drawing part
    function CanvasDraw() {
        for (i = 0; i <= _this.objectsArray.length - 1; i++) {
            if (_this.objectsArray[i].isVisible) {
                canvasContext.beginPath();
                canvasContext.strokeStyle = _this.objectsArray[i].material.lineColor;
                for (e = 0; e <= _this.objectsArray[i].cords.length - 1; e++) {
                    canvasContext.lineTo(_this.objectsArray[i].cords[e].x, _this.objectsArray[i].cords[e].y);
                };
                canvasContext.closePath();
                canvasContext.fillStyle = _this.objectsArray[i].material.fillColor;
                canvasContext.fill();
                canvasContext.stroke();
                //draw central point of object
                canvasContext.fillStyle = "red";
                canvasContext.fillRect(_this.objectsArray[i].centerPoint.x - 2, _this.objectsArray[i].centerPoint.y - 2, 4, 4);
                //draw gravity point of object
                canvasContext.fillStyle = "#39ff14";
                canvasContext.fillRect(_this.objectsArray[i].gravityPoint.x - 2, _this.objectsArray[i].gravityPoint.y - 2, 4, 4);
            };
        };
    };

    function CanvasClean() {
        canvasContext.clearRect(0, 0, this.canvasX, this.canvasY); //Clearing the canvas
    };

    //Delta time calculator
    this.deltaTime = 0;
    this.lastTimeStamp = 0;
    function CalculateDeltaTime() {
        var currentTime = new Date();
        _this.deltaTime = currentTime.getTime() - _this.lastTimeStamp;
        _this.lastTimeStamp = currentTime.getTime();
    };

    //Frames calculator
    this.lastTime = 0;
    this.frameCount = 0;
    this.elapsedTime = 0;
    this.FPS = 0;
    this.timeFromStart = 0;
    this.framesFromStart = 0;
    this.AvgFPS = 0;
    function CanvasFrames() {
        _this.frameCount++;

        var currentTime = new Date();
        var elapsedTime = currentTime.getTime() - _this.lastTime;

        _this.elapsedTime = currentTime.getTime() - _this.lastTime;

        _this.FPS = parseInt((1000 * _this.frameCount) / _this.elapsedTime);

        if (_this.timeFromStart > 2000 || !_this.IsRunning) {
            _this.AvgFPS = parseInt((1000 * _this.framesFromStart) / _this.timeFromStart);
            _this.framesFromStart = 0;
            _this.timeFromStart = 0;
        };

        _this.framesFromStart += _this.frameCount;
        _this.timeFromStart += _this.elapsedTime;

        _this.lastTime = currentTime.getTime();
        _this.frameCount = 0;

        canvasContext.fillStyle = "#39ff14";
        canvasContext.fillText("Current: " + _this.FPS + " FPS (Ø " + _this.AvgFPS + ") Delta: " + _this.deltaTime, 10, 10);
    };

    //Math functions
    function rotatePoint(originCords, destinyCords, degrees) {
        return {
            x: ((Math.cos(degrees) * (destinyCords.x - originCords.x)) - (Math.sin(degrees) * (destinyCords.y - originCords.y)) + originCords.x),
            y: ((Math.sin(degrees) * (destinyCords.x - originCords.x)) + (Math.cos(degrees) * (destinyCords.y - originCords.y)) + originCords.y)
        };
    };
    function getDistance(i, f) {
        return r = Math.sqrt((Math.pow((i.x - f.x), 2)) + (Math.pow((i.y - f.y), 2)));
    };
    function GetMass(cords) {
        return r = Math.sqrt((Math.pow((i.x - f.x), 2)) + (Math.pow((i.y - f.y), 2)));
    };
    function isPointInPoly(poly, pt) {
        var c = false;
        var i = -1;
        for (l = poly.length, j = l - 1; ++i < l; j = i)
            ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
                && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
                && (c = !c);
        return c;
    };

    function doLinesOverlap(a, b, c, d) {
        // Tests if the segment a-b intersects with the segment c-d. 
        // Ex: crosses({x:0,y:0},{x:1,y:1},{x:1,y:0},{x:0,y:1}) === true
        // Credit: Beta at http://stackoverflow.com/questions/7069420/check-if-two-line-segments-are-colliding-only-check-if-they-are-intersecting-n
        // Implementation by Viclib (viclib.com).
        var aSide = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x) > 0;
        var bSide = (d.x - c.x) * (b.y - c.y) - (d.y - c.y) * (b.x - c.x) > 0;
        var cSide = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
        var dSide = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x) > 0;
        return aSide !== bSide && cSide !== dSide;
    };

    //function to calculate the mass of an object
    function GetPoligonMass(density, area) {
        return area * density;
    };
    //calculate area of a poligon
    function GetPoligonArea(cords) {
        //clone the array
        cordsList = cords.slice();
        //close the object with the first
        cordsList.push(cordsList[0]);
        if (cordsList.length % 2 == 0) {
            cordsList.push(cordsList[0]);
        }
        var area = 0;
        //using ghaus or shoelace algorithm, has to be even numbers
        for (i = 0; i < cordsList.length - 1; i += 2)
            area += cordsList[i + 1].x * (cordsList[i + 2].y - cordsList[i].y) + cordsList[i + 1].y * (cordsList[i].x - cordsList[i + 2].x);
        area /= 2;
        if (area == 0) {
            return 1; //return minimum
        } else {
            return Math.abs(area); //return actual size
        }

    };
    //gets the side between a line, having line 2 vertex (a,b) the cord to locate is c
    function GetSide(a, b, c) {
        var x1 = a.x;
        var y1 = a.y;
        var x2 = b.x;
        var y2 = b.y;
        var x = c.x;
        var y = c.y;
        //console.log((x-x1)*(y2-y1) - (y-y1)*(x2-x1)); //returns side of collision
        return (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
    }
    //Get biggest line
    function GetFarestPolyCord(cords, centerCord) {
        var size = 0;
        for (i = 0; i < cordsList.length - 1; i += 2) {
            var currentSize = getDistance(cordsList[i], centerCord);
            if (currentSize > size) {
                size = currentSize;
            };
        };
        return size;
    };
    function GetRandom(min, max) {
        var num = Math.random() * (max - min) + min;
        num *= Math.floor(Math.random() * 2) == 1 ? 1 : -1;
        return num;
    };
};